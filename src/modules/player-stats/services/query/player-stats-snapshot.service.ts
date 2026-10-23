import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { PlayerCompetitionStatsEntity } from "../../entities/player-competition-stats.entity";
import { PlayerMatchStatsEntity } from "../../entities/player-match-stats.entity";
import { StatsSyncRunEntity } from "../../entities/stats-sync-run.entity";
import { CompetitionCategory } from "../../enums/player-stats.enums";
import {
  averageRating,
  categoryOf,
  StatCounters,
} from "../../utils/stat-line.util";

/** One competition a nominee played this season, club or national team. */
export interface CompetitionEntry extends StatCounters {
  idCandidates: string;
  competition: string;
  category: CompetitionCategory;
  team: string;
  season: string;
  substitutedIn: number;
  substitutedOut: number;
  averageRating: number | null;
}

export interface PlayerStatsSnapshot {
  clubSeason: string;
  entries: CompetitionEntry[];
  matches: PlayerMatchStatsEntity[];
  /** Latest sync that wrote data, or null before the first one. */
  updatedAt: Date | null;
  /**
   * False while the sync is still catching up (its latest data-writing run
   * hit the daily request budget): some matches are not in yet.
   */
  complete: boolean;
}

const CACHE_TTL_MS = 5 * 60_000;

/**
 * Everything the stats pages read, loaded in two queries and cached per
 * instance. The tables change once a day (sync job), so filters and
 * rankings are computed in memory.
 */
@Injectable()
export class PlayerStatsSnapshotService {
  private cache: { snapshot: PlayerStatsSnapshot; expiresAt: number } | null =
    null;
  private inFlight: Promise<PlayerStatsSnapshot> | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PlayerCompetitionStatsEntity)
    private readonly competitionStatsRepository: Repository<PlayerCompetitionStatsEntity>,
    @InjectRepository(PlayerMatchStatsEntity)
    private readonly matchStatsRepository: Repository<PlayerMatchStatsEntity>,
    @InjectRepository(StatsSyncRunEntity)
    private readonly runsRepository: Repository<StatsSyncRunEntity>,
  ) {}

  async get(): Promise<PlayerStatsSnapshot> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.snapshot;
    }

    this.inFlight ??= this.load()
      .then((snapshot) => {
        this.cache = { snapshot, expiresAt: Date.now() + CACHE_TTL_MS };
        return snapshot;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  private async load(): Promise<PlayerStatsSnapshot> {
    const clubSeason = this.configService.get<string>(
      "PLAYER_STATS_CLUB_SEASON",
    )!;
    const nationalSeason = this.configService.get<string>(
      "PLAYER_STATS_NATIONAL_SEASON",
    )!;

    const [clubRows, matches, lastRun] = await Promise.all([
      this.competitionStatsRepository.find({ where: { season: clubSeason } }),
      this.matchStatsRepository.find({
        where: { season: nationalSeason },
        order: { playedAt: "DESC" },
      }),
      // Failed runs write nothing, so they don't change what is complete.
      this.runsRepository.findOne({
        where: { status: In(["success", "partial"]) },
        order: { startedAt: "DESC" },
      }),
    ]);

    const entries: CompetitionEntry[] = clubRows.map((row) => ({
      idCandidates: row.idCandidates,
      competition: row.competition,
      category: categoryOf(row.competitionType),
      team: row.club,
      season: row.season,
      gamesPlayed: row.gamesPlayed,
      minutesPlayed: row.minutesPlayed,
      goals: row.goals,
      assists: row.assists,
      penaltiesScored: row.penaltiesScored,
      yellowCards: row.yellowCards,
      redCards: row.redCards + row.secondYellowCards,
      substitutedIn: row.substitutedIn,
      substitutedOut: row.substitutedOut,
      averageRating: null,
    }));
    entries.push(...this.nationalTeamEntries(matches));

    const syncedTimes = [...clubRows, ...matches].map((row) =>
      row.syncedAt.getTime(),
    );

    return {
      clubSeason,
      entries,
      matches,
      updatedAt: syncedTimes.length ? new Date(Math.max(...syncedTimes)) : null,
      complete: lastRun?.status === "success",
    };
  }

  /** Box scores folded into one row per (nominee, competition, team). */
  private nationalTeamEntries(
    matches: PlayerMatchStatsEntity[],
  ): CompetitionEntry[] {
    const groups = new Map<string, PlayerMatchStatsEntity[]>();
    for (const match of matches) {
      const key = [match.idCandidates, match.competition, match.team].join(
        "\u0000",
      );
      groups.set(key, [...(groups.get(key) ?? []), match]);
    }

    return [...groups.values()].map((group) => {
      const sum = (pick: (m: PlayerMatchStatsEntity) => number) =>
        group.reduce((total, match) => total + pick(match), 0);
      const [first] = group;

      return {
        idCandidates: first.idCandidates,
        competition: first.competition,
        category: CompetitionCategory.NATIONAL_TEAM,
        team: first.team,
        season: first.season,
        gamesPlayed: group.length,
        minutesPlayed: sum((m) => m.minutesPlayed),
        goals: sum((m) => m.goals),
        assists: sum((m) => m.assists),
        penaltiesScored: sum((m) => m.penaltiesScored),
        yellowCards: sum((m) => m.yellowCards),
        redCards: sum((m) => m.redCards),
        substitutedIn: group.filter((m) => m.isSubstitute).length,
        substitutedOut: 0,
        averageRating: averageRating(group.map((m) => m.rating)),
      };
    });
  }
}
