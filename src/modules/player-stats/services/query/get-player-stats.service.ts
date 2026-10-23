import { Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import {
  GetCandidatesService,
  toCandidateDto,
} from "../../../candidates/services/get-candidates.service";
import {
  PlayerStatsFilterInput,
  PlayerStatsLeaderboardFilterInput,
} from "../../dtos/player-stats-filter.input";
import {
  CompetitionOptionDto,
  LeaderboardRowDto,
  MatchTotalsDto,
  NomineeSeasonStatsDto,
  PlayerMatchStatsDto,
  PlayerStatsLeaderboardDto,
  TeamStatsDto,
} from "../../dtos/player-stats-response.dto";
import { PlayerMatchStatsEntity } from "../../entities/player-match-stats.entity";
import {
  CompetitionCategory,
  LeaderboardSortField,
  SortOrder,
  StatsScope,
} from "../../enums/player-stats.enums";
import {
  addCounters,
  averageRating,
  emptyCounters,
  inScope,
  toStatLine,
} from "../../utils/stat-line.util";
import {
  CompetitionEntry,
  PlayerStatsSnapshotService,
} from "./player-stats-snapshot.service";

const CATEGORY_ORDER: CompetitionCategory[] = [
  CompetitionCategory.LEAGUE,
  CompetitionCategory.CONTINENTAL,
  CompetitionCategory.DOMESTIC_CUP,
  CompetitionCategory.OTHER,
  CompetitionCategory.NATIONAL_TEAM,
];

const rate = (part: number, total: number) =>
  total ? Math.round((part / total) * 10000) / 100 : 0;

@Injectable()
export class GetPlayerStatsService {
  constructor(
    private readonly snapshotService: PlayerStatsSnapshotService,
    private readonly getCandidatesService: GetCandidatesService,
  ) {}

  async leaderboard(
    filter: PlayerStatsLeaderboardFilterInput = {},
  ): Promise<PlayerStatsLeaderboardDto> {
    const scope = filter.scope ?? StatsScope.ALL;
    const [snapshot, candidates] = await Promise.all([
      this.snapshotService.get(),
      this.getCandidatesService.findAll(),
    ]);

    const rows = candidates
      .filter((c) => !filter.position || c.position === filter.position)
      .map((candidate) => {
        const entries = this.select(
          snapshot.entries,
          candidate.idCandidates,
          filter,
        );
        const counters = emptyCounters();
        entries.forEach((entry) => addCounters(counters, entry));
        const matches = this.selectMatches(
          snapshot.matches,
          candidate.idCandidates,
          filter,
        );

        return {
          rank: 0,
          nominee: toCandidateDto(candidate),
          ...toStatLine(counters),
          averageRating: averageRating(matches.map((m) => m.rating)),
          competitionsPlayed: new Set(entries.map((e) => e.competition)).size,
        };
      })
      .filter((row) => row.minutesPlayed >= (filter.minMinutes ?? 0));

    this.sortRows(rows, filter);
    rows.forEach((row, index) => (row.rank = index + 1));

    return {
      clubSeason: snapshot.clubSeason,
      scope,
      rows,
      competitions: this.competitionOptions(snapshot.entries),
      dataUpdatedAt: snapshot.updatedAt?.toISOString() ?? null,
      dataComplete: snapshot.complete,
    };
  }

  async nominee(
    slug: string,
    filter: PlayerStatsFilterInput = {},
  ): Promise<NomineeSeasonStatsDto> {
    const candidate = await this.getCandidatesService.findBySlug(slug);
    if (!candidate) {
      throw AppException.from(
        APP_ERRORS.playerStats.nomineeNotFound,
        undefined,
      );
    }

    const snapshot = await this.snapshotService.get();
    const entries = this.select(
      snapshot.entries,
      candidate.idCandidates,
      filter,
    ).sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) -
          CATEGORY_ORDER.indexOf(b.category) ||
        b.minutesPlayed - a.minutesPlayed,
    );
    const matches = this.selectMatches(
      snapshot.matches,
      candidate.idCandidates,
      filter,
    );

    const totals = emptyCounters();
    entries.forEach((entry) => addCounters(totals, entry));

    return {
      nominee: toCandidateDto(candidate),
      clubSeason: snapshot.clubSeason,
      scope: filter.scope ?? StatsScope.ALL,
      totals: toStatLine(totals),
      averageRating: averageRating(matches.map((m) => m.rating)),
      competitions: entries.map((entry) => ({
        ...toStatLine(entry),
        competition: entry.competition,
        category: entry.category,
        team: entry.team,
        season: entry.season,
        substitutedIn: entry.substitutedIn,
        substitutedOut: entry.substitutedOut,
        averageRating: entry.averageRating,
      })),
      teams: this.teamTotals(entries),
      matches: matches.map(toMatchDto),
      matchTotals: matchTotals(matches),
      dataUpdatedAt: snapshot.updatedAt?.toISOString() ?? null,
      dataComplete: snapshot.complete,
    };
  }

  private select(
    entries: CompetitionEntry[],
    idCandidates: string,
    filter: PlayerStatsFilterInput,
  ): CompetitionEntry[] {
    const scope = filter.scope ?? StatsScope.ALL;
    return entries.filter(
      (entry) =>
        entry.idCandidates === idCandidates &&
        inScope(entry.category, scope) &&
        (!filter.competition || entry.competition === filter.competition),
    );
  }

  private selectMatches(
    matches: PlayerMatchStatsEntity[],
    idCandidates: string,
    filter: PlayerStatsFilterInput,
  ): PlayerMatchStatsEntity[] {
    const scope = filter.scope ?? StatsScope.ALL;
    if (!inScope(CompetitionCategory.NATIONAL_TEAM, scope)) return [];

    return matches.filter(
      (match) =>
        match.idCandidates === idCandidates &&
        (!filter.competition || match.competition === filter.competition),
    );
  }

  private teamTotals(entries: CompetitionEntry[]): TeamStatsDto[] {
    const teams = new Map<
      string,
      { counters: ReturnType<typeof emptyCounters>; national: boolean }
    >();
    for (const entry of entries) {
      const national = entry.category === CompetitionCategory.NATIONAL_TEAM;
      const team = teams.get(entry.team) ?? {
        counters: emptyCounters(),
        national,
      };
      addCounters(team.counters, entry);
      teams.set(entry.team, team);
    }

    return [...teams.entries()]
      .map(([team, { counters, national }]) => ({
        team,
        isNationalTeam: national,
        ...toStatLine(counters),
      }))
      .sort(
        (a, b) =>
          Number(a.isNationalTeam) - Number(b.isNationalTeam) ||
          b.minutesPlayed - a.minutesPlayed,
      );
  }

  private competitionOptions(
    entries: CompetitionEntry[],
  ): CompetitionOptionDto[] {
    const options = new Map<
      string,
      CompetitionOptionDto & { ids: Set<string> }
    >();
    for (const entry of entries) {
      const option = options.get(entry.competition) ?? {
        competition: entry.competition,
        category: entry.category,
        nominees: 0,
        ids: new Set<string>(),
      };
      option.ids.add(entry.idCandidates);
      option.nominees = option.ids.size;
      options.set(entry.competition, option);
    }

    return [...options.values()]
      .map(({ competition, category, nominees }) => ({
        competition,
        category,
        nominees,
      }))
      .sort(
        (a, b) =>
          CATEGORY_ORDER.indexOf(a.category) -
            CATEGORY_ORDER.indexOf(b.category) ||
          b.nominees - a.nominees ||
          a.competition.localeCompare(b.competition),
      );
  }

  private sortRows(
    rows: LeaderboardRowDto[],
    filter: PlayerStatsLeaderboardFilterInput,
  ): void {
    const sortBy = filter.sortBy ?? LeaderboardSortField.GOALS;
    const direction = filter.order === SortOrder.ASC ? 1 : -1;

    const key = (row: LeaderboardRowDto): number | null => {
      switch (sortBy) {
        case LeaderboardSortField.ASSISTS:
          return row.assists;
        case LeaderboardSortField.GOAL_CONTRIBUTIONS:
          return row.goalContributions;
        case LeaderboardSortField.GAMES:
          return row.gamesPlayed;
        case LeaderboardSortField.MINUTES:
          return row.minutesPlayed;
        case LeaderboardSortField.GOALS_PER_90:
          return row.goalsPer90;
        case LeaderboardSortField.CONTRIBUTIONS_PER_90:
          return row.contributionsPer90;
        case LeaderboardSortField.AVERAGE_RATING:
          return row.averageRating;
        default:
          return row.goals;
      }
    };

    rows.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      // Missing values (no rating) always go last, whatever the order.
      if (ka === null || kb === null) {
        return ka === kb ? 0 : ka === null ? 1 : -1;
      }
      return (
        (ka - kb) * direction ||
        b.goalContributions - a.goalContributions ||
        a.nominee.name.localeCompare(b.nominee.name)
      );
    });
  }
}

function toMatchDto(match: PlayerMatchStatsEntity): PlayerMatchStatsDto {
  return {
    competition: match.competition,
    round: match.round,
    playedAt: match.playedAt.toISOString(),
    team: match.team,
    opponent: match.opponent,
    isHome: match.isHome,
    score: match.score,
    resultDescription: match.resultDescription,
    position: match.position,
    isSubstitute: match.isSubstitute,
    isCaptain: match.isCaptain,
    minutesPlayed: match.minutesPlayed,
    rating: match.rating,
    goals: match.goals,
    assists: match.assists,
    shotsTotal: match.shotsTotal,
    shotsOnTarget: match.shotsOnTarget,
    passesTotal: match.passesTotal,
    passesSuccessful: match.passesSuccessful,
    keyPasses: match.keyPasses,
    dribblesTotal: match.dribblesTotal,
    dribblesSuccessful: match.dribblesSuccessful,
    duelsTotal: match.duelsTotal,
    duelsWon: match.duelsWon,
    tackles: match.tackles,
    interceptions: match.interceptions,
    foulsCommitted: match.foulsCommitted,
    foulsSuffered: match.foulsSuffered,
    yellowCards: match.yellowCards,
    redCards: match.redCards,
    expectedGoals: match.expectedGoals,
    expectedAssists: match.expectedAssists,
  };
}

function matchTotals(matches: PlayerMatchStatsEntity[]): MatchTotalsDto | null {
  if (!matches.length) return null;
  const sum = (pick: (m: PlayerMatchStatsEntity) => number) =>
    matches.reduce((total, match) => total + pick(match), 0);

  return {
    matches: matches.length,
    averageRating: averageRating(matches.map((m) => m.rating)),
    shotsTotal: sum((m) => m.shotsTotal),
    shotsOnTarget: sum((m) => m.shotsOnTarget),
    keyPasses: sum((m) => m.keyPasses),
    passAccuracy: rate(
      sum((m) => m.passesSuccessful),
      sum((m) => m.passesTotal),
    ),
    dribbleSuccess: rate(
      sum((m) => m.dribblesSuccessful),
      sum((m) => m.dribblesTotal),
    ),
    duelsWonRate: rate(
      sum((m) => m.duelsWon),
      sum((m) => m.duelsTotal),
    ),
    tackles: sum((m) => m.tackles),
    interceptions: sum((m) => m.interceptions),
  };
}
