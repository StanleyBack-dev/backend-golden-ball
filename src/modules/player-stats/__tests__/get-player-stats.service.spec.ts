import { HttpException } from "@nestjs/common";
import { PlayerMatchStatsEntity } from "../entities/player-match-stats.entity";
import {
  CompetitionCategory,
  LeaderboardSortField,
  SortOrder,
  StatsScope,
} from "../enums/player-stats.enums";
import { GetPlayerStatsService } from "../services/query/get-player-stats.service";
import {
  CompetitionEntry,
  PlayerStatsSnapshot,
} from "../services/query/player-stats-snapshot.service";

const NOMINEES = [
  {
    idCandidates: "id-raphinha",
    slug: "raphinha",
    name: "Raphinha",
    position: "Atacante",
  },
  {
    idCandidates: "id-rodri",
    slug: "rodri",
    name: "Rodri",
    position: "Meio-campista",
  },
  {
    idCandidates: "id-kane",
    slug: "harry-kane",
    name: "Kane",
    position: "Atacante",
  },
].map((n) => ({
  ...n,
  fullName: n.name,
  photoUrl: null,
  club: "X",
  nationality: "Y",
  color: "#000000",
}));

const entry = (
  idCandidates: string,
  competition: string,
  category: CompetitionCategory,
  counters: Partial<CompetitionEntry>,
): CompetitionEntry => ({
  idCandidates,
  competition,
  category,
  team: "Club",
  season: "25/26",
  gamesPlayed: 0,
  minutesPlayed: 0,
  goals: 0,
  assists: 0,
  penaltiesScored: 0,
  yellowCards: 0,
  redCards: 0,
  substitutedIn: 0,
  substitutedOut: 0,
  averageRating: null,
  ...counters,
});

const match = (
  idCandidates: string,
  overrides: Partial<PlayerMatchStatsEntity>,
): PlayerMatchStatsEntity =>
  ({
    idCandidates,
    competition: "World Cup",
    season: "2026",
    team: "Spain",
    opponent: "Argentina",
    playedAt: new Date("2026-07-19T19:00:00Z"),
    minutesPlayed: 90,
    rating: 7,
    goals: 0,
    assists: 0,
    shotsTotal: 0,
    shotsOnTarget: 0,
    passesTotal: 0,
    passesSuccessful: 0,
    keyPasses: 0,
    dribblesTotal: 0,
    dribblesSuccessful: 0,
    duelsTotal: 0,
    duelsWon: 0,
    tackles: 0,
    interceptions: 0,
    ...overrides,
  }) as PlayerMatchStatsEntity;

const SNAPSHOT: PlayerStatsSnapshot = {
  clubSeason: "25/26",
  updatedAt: new Date("2026-10-23T09:00:00Z"),
  complete: true,
  entries: [
    entry("id-raphinha", "LaLiga", CompetitionCategory.LEAGUE, {
      gamesPlayed: 22,
      minutesPlayed: 1389,
      goals: 13,
      assists: 3,
    }),
    entry(
      "id-raphinha",
      "UEFA Champions League",
      CompetitionCategory.CONTINENTAL,
      {
        gamesPlayed: 7,
        minutesPlayed: 544,
        goals: 3,
        assists: 3,
      },
    ),
    entry("id-kane", "Bundesliga", CompetitionCategory.LEAGUE, {
      gamesPlayed: 30,
      minutesPlayed: 2600,
      goals: 30,
      assists: 5,
    }),
    entry("id-rodri", "World Cup", CompetitionCategory.NATIONAL_TEAM, {
      team: "Spain",
      gamesPlayed: 2,
      minutesPlayed: 189,
      goals: 1,
      averageRating: 7.5,
    }),
  ],
  matches: [
    match("id-rodri", {
      rating: 8,
      goals: 1,
      passesTotal: 100,
      passesSuccessful: 90,
    }),
    match("id-rodri", {
      rating: 7,
      minutesPlayed: 99,
      passesTotal: 100,
      passesSuccessful: 100,
    }),
  ],
};

function setup(snapshot = SNAPSHOT) {
  return new GetPlayerStatsService(
    { get: jest.fn().mockResolvedValue(snapshot) } as never,
    {
      findAll: jest.fn().mockResolvedValue(NOMINEES),
      findBySlug: jest
        .fn()
        .mockImplementation(async (slug: string) =>
          NOMINEES.find((n) => n.slug === slug),
        ),
    } as never,
  );
}

const order = (rows: { nominee: { slug: string } }[]) =>
  rows.map((r) => r.nominee.slug);

describe("GetPlayerStatsService.leaderboard", () => {
  it("ranks every nominee by goals across all competitions", async () => {
    const result = await setup().leaderboard();

    expect(order(result.rows)).toEqual(["harry-kane", "raphinha", "rodri"]);
    expect(result.rows[1]).toMatchObject({
      rank: 2,
      goals: 16,
      assists: 6,
      goalContributions: 22,
      gamesPlayed: 29,
      competitionsPlayed: 2,
    });
    expect(result.dataUpdatedAt).toBe("2026-10-23T09:00:00.000Z");
    expect(result.dataComplete).toBe(true);
  });

  it("filters by scope and by a single competition", async () => {
    const clubs = await setup().leaderboard({ scope: StatsScope.CLUB });
    expect(clubs.rows.find((r) => r.nominee.slug === "rodri")!.goals).toBe(0);

    const ucl = await setup().leaderboard({
      competition: "UEFA Champions League",
    });
    expect(ucl.rows.map((r) => [r.nominee.slug, r.goals])).toEqual([
      ["raphinha", 3],
      ["harry-kane", 0],
      ["rodri", 0],
    ]);
  });

  it("filters by position and minimum minutes", async () => {
    const forwards = await setup().leaderboard({ position: "Atacante" });
    expect(order(forwards.rows)).toEqual(["harry-kane", "raphinha"]);

    const regulars = await setup().leaderboard({ minMinutes: 1000 });
    expect(order(regulars.rows)).toEqual(["harry-kane", "raphinha"]);
  });

  it("sorts by per-90 output and keeps missing ratings last", async () => {
    const per90 = await setup().leaderboard({
      sortBy: LeaderboardSortField.GOALS_PER_90,
    });
    expect(per90.rows[0]).toMatchObject({ goalsPer90: 1.04 });

    const byRating = await setup().leaderboard({
      sortBy: LeaderboardSortField.AVERAGE_RATING,
      order: SortOrder.ASC,
    });
    expect(byRating.rows[0]).toMatchObject({ averageRating: 7.5 });
    expect(byRating.rows.slice(1).every((r) => r.averageRating === null)).toBe(
      true,
    );
  });

  it("lists the competitions available to filter", async () => {
    const { competitions } = await setup().leaderboard();
    expect(competitions.map((c) => c.competition)).toEqual([
      "Bundesliga",
      "LaLiga",
      "UEFA Champions League",
      "World Cup",
    ]);
  });
});

describe("GetPlayerStatsService.nominee", () => {
  it("returns the season by competition, team and match", async () => {
    const result = await setup().nominee("raphinha");

    expect(result.totals).toMatchObject({ goals: 16, assists: 6 });
    expect(result.competitions.map((c) => c.competition)).toEqual([
      "LaLiga",
      "UEFA Champions League",
    ]);
    expect(result.teams).toHaveLength(1);
    expect(result.matches).toEqual([]);
    expect(result.matchTotals).toBeNull();
  });

  it("summarizes the box-score matches", async () => {
    const result = await setup().nominee("rodri");

    expect(result.averageRating).toBe(7.5);
    expect(result.matches).toHaveLength(2);
    expect(result.matchTotals).toMatchObject({
      matches: 2,
      averageRating: 7.5,
      passAccuracy: 95,
    });
  });

  it("hides national-team matches outside the scope", async () => {
    const result = await setup().nominee("rodri", { scope: StatsScope.CLUB });
    expect(result.matches).toEqual([]);
    expect(result.totals.goals).toBe(0);
  });

  it("rejects an unknown nominee", async () => {
    await expect(setup().nominee("nobody")).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
