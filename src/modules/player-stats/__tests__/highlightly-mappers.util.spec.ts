import { HighlightlyMatch } from "../providers/highlightly.types";
import {
  isFinishedMatch,
  toCompetitionRows,
  toMatchRow,
} from "../utils/highlightly-mappers.util";

const SYNCED_AT = new Date("2026-10-23T09:00:00Z");

const entry = (overrides: Record<string, unknown>) => ({
  club: "FC Barcelona",
  type: "national league",
  league: "LaLiga",
  season: "25/26",
  goals: 0,
  assists: 0,
  ownGoals: 0,
  redCards: 0,
  cleanSheets: 0,
  gamesPlayed: 0,
  yellowCards: 0,
  goalsConceded: 0,
  minutesPlayed: 0,
  substitutedIn: 0,
  substitutedOut: 0,
  penaltiesScored: 0,
  secondYellowCards: 0,
  ...overrides,
});

const MATCH: HighlightlyMatch = {
  id: 1354678750,
  round: "Final",
  date: "2026-07-19T19:00:00.000Z",
  homeTeam: { id: 1, name: "Spain" },
  awayTeam: { id: 2, name: "Argentina" },
  league: { id: 1635, season: 2026, name: "World Cup" },
  state: {
    description: "Finished after extra time",
    score: { current: "1 - 0", penalties: null },
  },
};

describe("toCompetitionRows", () => {
  it("keeps only the requested season", () => {
    const rows = toCompetitionRows(
      "cand-1",
      "25/26",
      [
        entry({ goals: 13, gamesPlayed: 22 }),
        entry({ season: "24/25", goals: 18 }),
      ],
      SYNCED_AT,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      idCandidates: "cand-1",
      competition: "LaLiga",
      competitionType: "national league",
      club: "FC Barcelona",
      goals: 13,
      gamesPlayed: 22,
      syncedAt: SYNCED_AT,
    });
  });

  it("sums split entries of the same competition and club", () => {
    const rows = toCompetitionRows(
      "cand-1",
      "25/26",
      [
        entry({ league: "UEFA Champions League", goals: 2, gamesPlayed: 4 }),
        entry({ league: "UEFA Champions League", goals: 1, gamesPlayed: 3 }),
        entry({
          league: "UEFA Champions League",
          club: "Paris Saint-Germain",
          goals: 5,
        }),
      ],
      SYNCED_AT,
    );

    expect(rows.map((r) => [r.club, r.goals, r.gamesPlayed])).toEqual([
      ["FC Barcelona", 3, 7],
      ["Paris Saint-Germain", 5, 0],
    ]);
  });

  it("treats missing or invalid counters as zero", () => {
    const [row] = toCompetitionRows(
      "cand-1",
      "25/26",
      [entry({ goals: null, assists: -2, minutesPlayed: Number.NaN })],
      SYNCED_AT,
    );
    expect(row).toMatchObject({ goals: 0, assists: 0, minutesPlayed: 0 });
  });
});

describe("toMatchRow", () => {
  const player = {
    id: 7238,
    position: "Midfielder",
    isCaptain: true,
    isSubstitute: false,
    minutesPlayed: 99,
    matchRating: "8.31",
    offsides: 0,
    statistics: {
      goalsScored: 0,
      assists: 1,
      shotsTotal: 1,
      passesTotal: 106,
      passesSuccessful: 101,
      passesKey: 2,
      cardsYellow: 1,
      cardsSecondYellow: 0,
      cardsRed: 0,
      expectedGoals: null,
    },
  };

  it("maps a box score line from the nominee's side", () => {
    const row = toMatchRow("cand-1", MATCH, "Spain", player, SYNCED_AT)!;

    expect(row).toMatchObject({
      providerMatchId: 1354678750,
      competition: "World Cup",
      season: "2026",
      round: "Final",
      team: "Spain",
      opponent: "Argentina",
      isHome: true,
      score: "1 - 0",
      minutesPlayed: 99,
      rating: 8.31,
      assists: 1,
      passesTotal: 106,
      keyPasses: 2,
      yellowCards: 1,
      expectedGoals: null,
      isCaptain: true,
    });
  });

  it("reads statistics served as an array too", () => {
    const row = toMatchRow(
      "cand-1",
      MATCH,
      "Argentina",
      { ...player, statistics: [{ goalsScored: 2 }] },
      SYNCED_AT,
    )!;
    expect(row).toMatchObject({ goals: 2, isHome: false, opponent: "Spain" });
  });

  it("skips players who didn't get on the pitch", () => {
    expect(
      toMatchRow(
        "cand-1",
        MATCH,
        "Spain",
        { ...player, minutesPlayed: 0 },
        SYNCED_AT,
      ),
    ).toBeNull();
  });

  it("drops missing ratings instead of storing zero", () => {
    const row = toMatchRow(
      "cand-1",
      MATCH,
      "Spain",
      { ...player, matchRating: null },
      SYNCED_AT,
    )!;
    expect(row.rating).toBeNull();
  });
});

describe("isFinishedMatch", () => {
  it("accepts every finished variant only", () => {
    expect(isFinishedMatch(MATCH)).toBe(true);
    expect(
      isFinishedMatch({
        ...MATCH,
        state: { description: "Not started", score: null },
      }),
    ).toBe(false);
    expect(isFinishedMatch({ ...MATCH, state: null })).toBe(false);
  });
});
