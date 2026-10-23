import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { CandidateEntity } from "../../../candidates/entities/candidate.entity";
import { PlayerCompetitionStatsEntity } from "../../entities/player-competition-stats.entity";
import { PlayerMatchStatsEntity } from "../../entities/player-match-stats.entity";
import { StatsSyncedMatchEntity } from "../../entities/stats-synced-match.entity";
import {
  StatsSyncRunEntity,
  StatsSyncStatus,
} from "../../entities/stats-sync-run.entity";
import {
  HighlightlyClient,
  StatsQuotaExhaustedError,
} from "../../providers/highlightly.client";
import { HighlightlyMatch } from "../../providers/highlightly.types";
import {
  isFinishedMatch,
  MatchStatsRow,
  toCompetitionRows,
  toMatchRow,
} from "../../utils/highlightly-mappers.util";

const HOUR_MS = 3_600_000;
/** A run still "running" after this long crashed without finishing. */
const STALE_RUN_MS = 2 * HOUR_MS;
const DAY_MS = 24 * HOUR_MS;
// Brasília has no daylight saving time since 2019: a fixed UTC-3.
const BRASILIA_OFFSET_MS = 3 * HOUR_MS;

/** Midnight of `now`'s calendar day in Brasília, as a UTC instant. */
function startOfBrasiliaDay(now: Date): Date {
  const local = now.getTime() - BRASILIA_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS + BRASILIA_OFFSET_MS);
}

/** Counted as work is saved, so a run cut short still reports it. */
interface SyncProgress {
  players: number;
  matches: number;
}

export interface SyncResult {
  status: StatsSyncStatus | "skipped";
  requestsUsed: number;
  playersSynced: number;
  matchesSynced: number;
  message: string;
}

/**
 * Daily copy of the nominees' season stats from the provider into Postgres.
 * The site only ever reads the database, so the provider is hit once a day
 * by the scheduled job (never per visitor) and a failed run just leaves the
 * previous day's data in place.
 *
 * Runs are resumable: club totals are refreshed oldest-first and a match box
 * score is read once, so a run cut short by the request budget is completed
 * by the next one.
 */
@Injectable()
export class SyncPlayerStatsService {
  private readonly logger = new Logger(SyncPlayerStatsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly client: HighlightlyClient,
    @InjectRepository(CandidateEntity)
    private readonly candidatesRepository: Repository<CandidateEntity>,
    @InjectRepository(PlayerCompetitionStatsEntity)
    private readonly competitionStatsRepository: Repository<PlayerCompetitionStatsEntity>,
    @InjectRepository(StatsSyncedMatchEntity)
    private readonly syncedMatchesRepository: Repository<StatsSyncedMatchEntity>,
    @InjectRepository(StatsSyncRunEntity)
    private readonly runsRepository: Repository<StatsSyncRunEntity>,
  ) {}

  async run({ force = false } = {}): Promise<SyncResult> {
    const now = new Date();
    await this.failStaleRuns(now);

    const skipReason = force ? null : await this.skipReason(now);
    if (skipReason) {
      return {
        status: "skipped",
        requestsUsed: 0,
        playersSynced: 0,
        matchesSynced: 0,
        message: skipReason,
      };
    }

    const run = await this.runsRepository.save(
      this.runsRepository.create({ startedAt: now, status: "running" }),
    );
    this.client.startRun(
      this.configService.get<number>("PLAYER_STATS_REQUEST_BUDGET")!,
    );

    const progress: SyncProgress = { players: 0, matches: 0 };
    let status: StatsSyncStatus = "success";
    let message = "Complete.";

    try {
      await this.syncClubSeason(progress, force);
      await this.syncNationalTeamMatches(progress);
    } catch (error) {
      if (error instanceof StatsQuotaExhaustedError) {
        status = "partial";
        message = `${error.message} The next run resumes from here.`;
      } else {
        status = "failed";
        message = (error as Error).message || "Unknown error.";
        this.logger.error(`Player stats sync failed: ${message}`);
      }
    }

    const requestsUsed = this.client.requestsUsed;
    await this.runsRepository.update(run.idStatsSyncRuns, {
      status,
      finishedAt: new Date(),
      requestsUsed,
      message:
        `${message} Players: ${progress.players}, matches: ${progress.matches}.`.slice(
          0,
          500,
        ),
    });

    return {
      status,
      requestsUsed,
      playersSynced: progress.players,
      matchesSynced: progress.matches,
      message,
    };
  }

  /**
   * Club totals of the configured season, least recently synced first. With
   * the window closed the totals are final: only nominees still missing
   * them are fetched (unless forced).
   */
  private async syncClubSeason(
    progress: SyncProgress,
    force: boolean,
  ): Promise<void> {
    const season = this.configService.get<string>("PLAYER_STATS_CLUB_SEASON")!;
    const candidates = await this.trackedCandidates();

    const lastSynced = new Map<string, number>(
      (
        await this.competitionStatsRepository
          .createQueryBuilder("stats")
          .select("stats.idCandidates", "idCandidates")
          .addSelect("MAX(stats.syncedAt)", "syncedAt")
          .where("stats.season = :season", { season })
          .groupBy("stats.idCandidates")
          .getRawMany<{ idCandidates: string; syncedAt: Date }>()
      ).map((row) => [row.idCandidates, new Date(row.syncedAt).getTime()]),
    );
    // Rows already refreshed today are skipped, so a same-day retry spends
    // its budget on whatever the interrupted run didn't reach.
    const staleBefore = force
      ? Infinity
      : this.windowClosed
        ? 1
        : startOfBrasiliaDay(new Date()).getTime();
    const due = candidates
      .filter((c) => (lastSynced.get(c.idCandidates) ?? 0) < staleBefore)
      .sort(
        (a, b) =>
          (lastSynced.get(a.idCandidates) ?? 0) -
          (lastSynced.get(b.idCandidates) ?? 0),
      );

    for (const candidate of due) {
      const response = await this.client.playerStatistics(
        candidate.statsProviderId!,
      );
      const rows = toCompetitionRows(
        candidate.idCandidates,
        season,
        response[0]?.perCompetition ?? [],
        new Date(),
      );

      // An empty answer is treated as a provider hiccup: keep what we had.
      if (!rows.length) {
        this.logger.warn(`No ${season} stats returned for ${candidate.slug}.`);
        continue;
      }

      await this.dataSource.transaction(async (manager) => {
        await manager.delete(PlayerCompetitionStatsEntity, {
          idCandidates: candidate.idCandidates,
          season,
        });
        await manager.insert(PlayerCompetitionStatsEntity, rows);
      });
      progress.players += 1;
    }
  }

  /** Box scores of finished national-team matches not read yet. */
  private async syncNationalTeamMatches(progress: SyncProgress): Promise<void> {
    const leagueId = this.configService.get<number>(
      "PLAYER_STATS_NATIONAL_LEAGUE_ID",
    );
    const season = this.configService.get<string>(
      "PLAYER_STATS_NATIONAL_SEASON",
    );
    if (!leagueId || !season) return;

    const candidates = await this.trackedCandidates();
    const teams = new Set(
      candidates.map((c) => c.nationalTeam).filter(Boolean),
    );
    const candidateByProviderId = new Map(
      candidates.map((c) => [c.statsProviderId!, c]),
    );

    const matches = (await this.listMatches(leagueId, season)).filter(
      (match) =>
        isFinishedMatch(match) &&
        (teams.has(match.homeTeam.name) || teams.has(match.awayTeam.name)),
    );
    if (!matches.length) return;

    const alreadySynced = new Set(
      (
        await this.syncedMatchesRepository.find({
          select: { providerMatchId: true },
          where: { providerMatchId: In(matches.map((m) => m.id)) },
        })
      ).map((row) => row.providerMatchId),
    );

    // Oldest first, so a partial run leaves a contiguous history.
    const pending = matches
      .filter((match) => !alreadySynced.has(match.id))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

    for (const match of pending) {
      const boxScore = await this.client.boxScore(match.id);
      const syncedAt = new Date();
      const rows: MatchStatsRow[] = [];

      for (const side of boxScore) {
        for (const player of side.players) {
          const candidate = candidateByProviderId.get(player.id);
          const row =
            candidate &&
            toMatchRow(
              candidate.idCandidates,
              match,
              side.team.name,
              player,
              syncedAt,
            );
          if (row) rows.push(row);
        }
      }

      await this.dataSource.transaction(async (manager) => {
        if (rows.length) {
          await manager.upsert(PlayerMatchStatsEntity, rows, [
            "idCandidates",
            "providerMatchId",
          ]);
        }
        await manager.upsert(
          StatsSyncedMatchEntity,
          { providerMatchId: match.id, syncedAt },
          ["providerMatchId"],
        );
      });
      progress.matches += 1;
    }
  }

  private async listMatches(
    leagueId: number,
    season: string,
  ): Promise<HighlightlyMatch[]> {
    const matches: HighlightlyMatch[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const page = await this.client.matches(leagueId, season, offset);
      matches.push(...page.data);
      total = page.pagination.totalCount;
      offset += page.data.length || Infinity;
    }

    return matches;
  }

  private async trackedCandidates(): Promise<CandidateEntity[]> {
    return (
      await this.candidatesRepository.find({ order: { displayOrder: "ASC" } })
    ).filter((candidate) => candidate.statsProviderId !== null);
  }

  private async failStaleRuns(now: Date): Promise<void> {
    await this.runsRepository.update(
      {
        status: "running",
        startedAt: LessThan(new Date(now.getTime() - STALE_RUN_MS)),
      },
      {
        status: "failed",
        finishedAt: now,
        message: "Run did not finish (process stopped).",
      },
    );
  }

  /** The Ballon d'Or window is over: its stats no longer change. */
  private get windowClosed(): boolean {
    return (
      this.configService.get<boolean>("PLAYER_STATS_WINDOW_CLOSED") === true
    );
  }

  /**
   * Why this run has nothing to do, if so. With the window closed, one
   * complete run makes the data final and every later run free; otherwise
   * the later schedules of a day only finish what the first one left.
   */
  private async skipReason(now: Date): Promise<string | null> {
    if (this.windowClosed) {
      const complete = await this.runsRepository.exists({
        where: { status: "success" },
      });
      return complete ? "Window closed and data complete." : null;
    }

    const succeededToday = await this.runsRepository.exists({
      where: {
        status: "success",
        startedAt: MoreThanOrEqual(startOfBrasiliaDay(now)),
      },
    });
    return succeededToday ? "Already synced today (Brasília time)." : null;
  }
}
