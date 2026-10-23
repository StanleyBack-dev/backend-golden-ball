import { PlayerCompetitionStatsEntity } from "../entities/player-competition-stats.entity";
import { PlayerMatchStatsEntity } from "../entities/player-match-stats.entity";
import {
  HighlightlyBoxScorePlayer,
  HighlightlyBoxScoreStatistics,
  HighlightlyCompetitionStats,
  HighlightlyMatch,
} from "../providers/highlightly.types";

export type CompetitionStatsRow = Omit<
  PlayerCompetitionStatsEntity,
  "idPlayerCompetitionStats"
>;

export type MatchStatsRow = Omit<PlayerMatchStatsEntity, "idPlayerMatchStats">;

const COUNTERS = [
  "gamesPlayed",
  "minutesPlayed",
  "goals",
  "assists",
  "penaltiesScored",
  "ownGoals",
  "yellowCards",
  "secondYellowCards",
  "redCards",
  "substitutedIn",
  "substitutedOut",
  "cleanSheets",
  "goalsConceded",
] as const;

const int = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value!)) : 0;

/**
 * The nominee's rows for one season. The provider may split a competition
 * into several entries for the same club; those are summed so each
 * (competition, club) pair appears once.
 */
export function toCompetitionRows(
  idCandidates: string,
  season: string,
  stats: HighlightlyCompetitionStats[],
  syncedAt: Date,
): CompetitionStatsRow[] {
  const rows = new Map<string, CompetitionStatsRow>();

  for (const entry of stats) {
    if (entry.season !== season || !entry.league || !entry.club) continue;

    const key = `${entry.league}\u0000${entry.club}`;
    const row = rows.get(key) ?? {
      idCandidates,
      season,
      competition: entry.league.slice(0, 100),
      competitionType: (entry.type || "other").slice(0, 40),
      club: entry.club.slice(0, 100),
      gamesPlayed: 0,
      minutesPlayed: 0,
      goals: 0,
      assists: 0,
      penaltiesScored: 0,
      ownGoals: 0,
      yellowCards: 0,
      secondYellowCards: 0,
      redCards: 0,
      substitutedIn: 0,
      substitutedOut: 0,
      cleanSheets: 0,
      goalsConceded: 0,
      syncedAt,
    };

    for (const counter of COUNTERS) {
      row[counter] += int(entry[counter]);
    }
    rows.set(key, row);
  }

  return [...rows.values()];
}

export function isFinishedMatch(match: HighlightlyMatch): boolean {
  return /^finished/i.test(match.state?.description ?? "");
}

const rating = (value: string | null) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const decimal = (value: number | null | undefined) =>
  Number.isFinite(value) ? Math.round(value! * 100) / 100 : null;

/** One nominee's line in a match box score; null if they didn't play. */
export function toMatchRow(
  idCandidates: string,
  match: HighlightlyMatch,
  teamName: string,
  player: HighlightlyBoxScorePlayer,
  syncedAt: Date,
): MatchStatsRow | null {
  const minutesPlayed = int(player.minutesPlayed);
  if (minutesPlayed === 0) return null;

  const stats: HighlightlyBoxScoreStatistics =
    (Array.isArray(player.statistics)
      ? player.statistics[0]
      : player.statistics) ?? {};
  const isHome = match.homeTeam.name === teamName;

  return {
    idCandidates,
    providerMatchId: match.id,
    competition: match.league.name.slice(0, 100),
    season: String(match.league.season),
    round: match.round?.slice(0, 60) ?? null,
    playedAt: new Date(match.date),
    team: teamName.slice(0, 100),
    opponent: (isHome ? match.awayTeam.name : match.homeTeam.name).slice(
      0,
      100,
    ),
    isHome,
    score: match.state?.score?.current?.slice(0, 20) ?? null,
    resultDescription: match.state?.description?.slice(0, 60) ?? null,
    position: player.position?.slice(0, 30) ?? null,
    isSubstitute: player.isSubstitute === true,
    isCaptain: player.isCaptain === true,
    minutesPlayed,
    rating: rating(player.matchRating),
    goals: int(stats.goalsScored),
    assists: int(stats.assists),
    shotsTotal: int(stats.shotsTotal),
    shotsOnTarget: int(stats.shotsOnTarget),
    passesTotal: int(stats.passesTotal),
    passesSuccessful: int(stats.passesSuccessful),
    keyPasses: int(stats.passesKey),
    dribblesTotal: int(stats.dribblesTotal),
    dribblesSuccessful: int(stats.dribblesSuccessful),
    duelsTotal: int(stats.duelsTotal),
    duelsWon: int(stats.duelsWon),
    tackles: int(stats.tacklesTotal),
    interceptions: int(stats.interceptionsTotal),
    foulsCommitted: int(stats.fouledOthers),
    foulsSuffered: int(stats.fouledByOthers),
    offsides: int(player.offsides),
    yellowCards: int(stats.cardsYellow),
    redCards: int(stats.cardsRed) + int(stats.cardsSecondYellow),
    penaltiesScored: int(stats.penaltiesScored),
    penaltiesMissed: int(stats.penaltiesMissed),
    expectedGoals: decimal(stats.expectedGoals),
    expectedAssists: decimal(stats.expectedAssists),
    syncedAt,
  };
}
