// Subset of the Highlightly Football API responses this project reads.
// https://highlightly.net/football-api/documentation/

export interface HighlightlyCompetitionStats {
  club: string;
  type: string;
  league: string;
  /** "25/26" for club seasons, "2026" for calendar-year competitions. */
  season: string;
  goals: number;
  assists: number;
  ownGoals: number;
  redCards: number;
  cleanSheets: number;
  gamesPlayed: number;
  yellowCards: number;
  goalsConceded: number;
  minutesPlayed: number;
  substitutedIn: number;
  substitutedOut: number;
  penaltiesScored: number;
  secondYellowCards: number;
}

export interface HighlightlyPlayerStatistics {
  id: number;
  name: string;
  perCompetition: HighlightlyCompetitionStats[];
}

export interface HighlightlyTeam {
  id: number;
  name: string;
}

export interface HighlightlyMatch {
  id: number;
  round: string | null;
  date: string;
  homeTeam: HighlightlyTeam;
  awayTeam: HighlightlyTeam;
  league: { id: number; season: number; name: string };
  state: {
    description: string;
    score: { current: string | null; penalties: string | null } | null;
  } | null;
}

export interface HighlightlyPaginated<T> {
  data: T[];
  pagination: { totalCount: number; offset: number; limit: number };
}

export interface HighlightlyBoxScoreStatistics {
  goalsScored?: number;
  assists?: number;
  shotsTotal?: number;
  shotsOnTarget?: number;
  passesTotal?: number;
  passesSuccessful?: number;
  passesKey?: number;
  dribblesTotal?: number;
  dribblesSuccessful?: number;
  duelsTotal?: number;
  duelsWon?: number;
  tacklesTotal?: number;
  interceptionsTotal?: number;
  fouledOthers?: number;
  fouledByOthers?: number;
  cardsYellow?: number;
  cardsSecondYellow?: number;
  cardsRed?: number;
  penaltiesScored?: number;
  penaltiesMissed?: number;
  expectedGoals?: number | null;
  expectedAssists?: number | null;
}

export interface HighlightlyBoxScorePlayer {
  id: number;
  position: string | null;
  isCaptain: boolean;
  isSubstitute: boolean;
  minutesPlayed: number | null;
  matchRating: string | null;
  offsides: number | null;
  // Documented as an array, served as a single object.
  statistics: HighlightlyBoxScoreStatistics | HighlightlyBoxScoreStatistics[];
}

export interface HighlightlyBoxScoreTeam {
  team: HighlightlyTeam;
  players: HighlightlyBoxScorePlayer[];
}
