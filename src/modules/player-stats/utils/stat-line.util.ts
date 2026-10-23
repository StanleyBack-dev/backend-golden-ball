import { CompetitionCategory, StatsScope } from "../enums/player-stats.enums";

/** Counters every competition row carries. */
export interface StatCounters {
  gamesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  penaltiesScored: number;
  yellowCards: number;
  redCards: number;
}

export interface StatLine extends StatCounters {
  goalContributions: number;
  /** Per 90 minutes, 2 decimals; 0 without minutes. */
  goalsPer90: number;
  contributionsPer90: number;
  /** null when the player didn't score. */
  minutesPerGoal: number | null;
}

const COUNTER_KEYS: (keyof StatCounters)[] = [
  "gamesPlayed",
  "minutesPlayed",
  "goals",
  "assists",
  "penaltiesScored",
  "yellowCards",
  "redCards",
];

export function emptyCounters(): StatCounters {
  return {
    gamesPlayed: 0,
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    penaltiesScored: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

export function addCounters(target: StatCounters, source: StatCounters): void {
  for (const key of COUNTER_KEYS) {
    target[key] += source[key];
  }
}

const per90 = (value: number, minutes: number) =>
  minutes ? Math.round((value / minutes) * 90 * 100) / 100 : 0;

export function toStatLine(counters: StatCounters): StatLine {
  const goalContributions = counters.goals + counters.assists;
  return {
    ...counters,
    goalContributions,
    goalsPer90: per90(counters.goals, counters.minutesPlayed),
    contributionsPer90: per90(goalContributions, counters.minutesPlayed),
    minutesPerGoal: counters.goals
      ? Math.round(counters.minutesPlayed / counters.goals)
      : null,
  };
}

/** Maps the provider's competition type onto our categories. */
export function categoryOf(providerType: string): CompetitionCategory {
  switch (providerType.trim().toLowerCase()) {
    case "national league":
      return CompetitionCategory.LEAGUE;
    case "national cup":
      return CompetitionCategory.DOMESTIC_CUP;
    case "international competition":
      return CompetitionCategory.CONTINENTAL;
    default:
      return CompetitionCategory.OTHER;
  }
}

export function inScope(
  category: CompetitionCategory,
  scope: StatsScope,
): boolean {
  switch (scope) {
    case StatsScope.ALL:
      return true;
    case StatsScope.CLUB:
      return category !== CompetitionCategory.NATIONAL_TEAM;
    default:
      return (category as string) === (scope as string);
  }
}

/** Mean of the given ratings, 2 decimals; null when there are none. */
export function averageRating(ratings: (number | null)[]): number | null {
  const valid = ratings.filter((r): r is number => r !== null);
  if (!valid.length) return null;
  return (
    Math.round((valid.reduce((sum, r) => sum + r, 0) / valid.length) * 100) /
    100
  );
}
