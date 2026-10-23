import { registerEnumType } from "@nestjs/graphql";

/** Which competitions a stat line covers. */
export enum StatsScope {
  ALL = "ALL",
  /** Every club competition (league, domestic cups, continental). */
  CLUB = "CLUB",
  LEAGUE = "LEAGUE",
  DOMESTIC_CUP = "DOMESTIC_CUP",
  CONTINENTAL = "CONTINENTAL",
  NATIONAL_TEAM = "NATIONAL_TEAM",
}

/** Category of a single competition row. */
export enum CompetitionCategory {
  LEAGUE = "LEAGUE",
  DOMESTIC_CUP = "DOMESTIC_CUP",
  CONTINENTAL = "CONTINENTAL",
  NATIONAL_TEAM = "NATIONAL_TEAM",
  OTHER = "OTHER",
}

export enum LeaderboardSortField {
  GOALS = "GOALS",
  ASSISTS = "ASSISTS",
  GOAL_CONTRIBUTIONS = "GOAL_CONTRIBUTIONS",
  GAMES = "GAMES",
  MINUTES = "MINUTES",
  GOALS_PER_90 = "GOALS_PER_90",
  CONTRIBUTIONS_PER_90 = "CONTRIBUTIONS_PER_90",
  AVERAGE_RATING = "AVERAGE_RATING",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

registerEnumType(StatsScope, { name: "StatsScope" });
registerEnumType(CompetitionCategory, { name: "CompetitionCategory" });
registerEnumType(LeaderboardSortField, { name: "LeaderboardSortField" });
registerEnumType(SortOrder, { name: "SortOrder" });
