import { StatsQuotaExhaustedError } from "../providers/highlightly.client";
import { SyncPlayerStatsService } from "../services/sync/sync-player-stats.service";

const CONFIG: Record<string, unknown> = {
  PLAYER_STATS_CLUB_SEASON: "25/26",
  PLAYER_STATS_NATIONAL_LEAGUE_ID: 1635,
  PLAYER_STATS_NATIONAL_SEASON: "2026",
  PLAYER_STATS_REQUEST_BUDGET: 90,
};

const CANDIDATES = [
  {
    idCandidates: "id-rodri",
    slug: "rodri",
    statsProviderId: 7238,
    nationalTeam: "Spain",
  },
  {
    idCandidates: "id-kane",
    slug: "harry-kane",
    statsProviderId: 29778,
    nationalTeam: "England",
  },
  {
    idCandidates: "id-nobody",
    slug: "nobody",
    statsProviderId: null,
    nationalTeam: null,
  },
];

const seasonStats = (goals: number) => [
  {
    id: 1,
    name: "X",
    perCompetition: [
      {
        club: "Club",
        type: "national league",
        league: "League",
        season: "25/26",
        goals,
        gamesPlayed: 10,
        minutesPlayed: 900,
      },
    ],
  },
];

const matchOf = (id: number, home: string, away: string, finished = true) => ({
  id,
  round: "Group A",
  date: `2026-06-${10 + (id % 10)}T19:00:00.000Z`,
  homeTeam: { id: 1, name: home },
  awayTeam: { id: 2, name: away },
  league: { id: 1635, season: 2026, name: "World Cup" },
  state: {
    description: finished ? "Finished" : "Not started",
    score: { current: "1 - 0", penalties: null },
  },
});

function setup({
  alreadySynced = [] as number[],
  recentSuccess = false,
  config = {} as Record<string, unknown>,
} = {}) {
  const manager = {
    delete: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
  };
  const client = {
    startRun: jest.fn(),
    requestsUsed: 0,
    playerStatistics: jest.fn().mockResolvedValue(seasonStats(5)),
    matches: jest.fn().mockResolvedValue({
      data: [
        matchOf(1, "Spain", "Japan"),
        matchOf(2, "Brazil", "Japan"),
        matchOf(3, "England", "Spain", false),
        matchOf(4, "England", "Iran"),
      ],
      pagination: { totalCount: 4, offset: 0, limit: 100 },
    }),
    boxScore: jest.fn().mockResolvedValue([
      {
        team: { id: 1, name: "Spain" },
        players: [
          { id: 7238, minutesPlayed: 90, matchRating: "7.5", statistics: {} },
        ],
      },
    ]),
  };
  const competitionQuery = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  const runs = {
    update: jest.fn(),
    exists: jest.fn().mockResolvedValue(recentSuccess),
    create: jest.fn((run) => run),
    save: jest.fn(async (run) => ({ ...run, idStatsSyncRuns: "run-1" })),
  };

  const service = new SyncPlayerStatsService(
    { transaction: jest.fn((cb) => cb(manager)) } as never,
    { get: (key: string) => ({ ...CONFIG, ...config })[key] } as never,
    client as never,
    { find: jest.fn().mockResolvedValue(CANDIDATES) } as never,
    { createQueryBuilder: () => competitionQuery } as never,
    {
      find: jest
        .fn()
        .mockResolvedValue(
          alreadySynced.map((id) => ({ providerMatchId: id })),
        ),
    } as never,
    runs as never,
  );

  return { service, client, manager, runs, competitionQuery };
}

describe("SyncPlayerStatsService", () => {
  it("syncs club seasons and new national-team box scores", async () => {
    const { service, client, manager, runs } = setup();

    const result = await service.run();

    expect(result).toMatchObject({
      status: "success",
      playersSynced: 2,
      matchesSynced: 2,
    });
    // Only nominees with a provider id are fetched.
    expect(client.playerStatistics).toHaveBeenCalledTimes(2);
    // Finished matches of tracked teams only (Spain–Japan, England–Iran).
    expect(client.boxScore.mock.calls.map(([id]) => id)).toEqual([1, 4]);
    expect(manager.upsert).toHaveBeenCalledWith(
      expect.anything(),
      [expect.objectContaining({ idCandidates: "id-rodri", rating: 7.5 })],
      ["idCandidates", "providerMatchId"],
    );
    expect(runs.update).toHaveBeenLastCalledWith(
      "run-1",
      expect.objectContaining({ status: "success" }),
    );
  });

  it("never reads the same match twice", async () => {
    const { service, client } = setup({ alreadySynced: [1] });

    await service.run();

    expect(client.boxScore.mock.calls.map(([id]) => id)).toEqual([4]);
  });

  it("skips club stats already synced today (Brasília)", async () => {
    const H = 3_600_000;
    const startOfDay =
      Math.floor((Date.now() - 3 * H) / (24 * H)) * 24 * H + 3 * H;
    const { service, client, competitionQuery } = setup();
    competitionQuery.getRawMany.mockResolvedValue([
      { idCandidates: "id-rodri", syncedAt: new Date() },
      // Last night's 23:50 run: due again today.
      { idCandidates: "id-kane", syncedAt: new Date(startOfDay - 10 * 60_000) },
    ]);

    await service.run();

    expect(client.playerStatistics.mock.calls).toEqual([[29778]]);
  });

  it("keeps the previous rows when the provider returns nothing", async () => {
    const { service, client, manager } = setup();
    client.playerStatistics.mockResolvedValue([]);

    const result = await service.run();

    expect(result.playersSynced).toBe(0);
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it("ends as partial when the request budget runs out", async () => {
    const { service, client, runs } = setup();
    client.boxScore
      .mockResolvedValueOnce([])
      .mockRejectedValue(new StatsQuotaExhaustedError());

    const result = await service.run();

    // Work saved before the budget ran out is still reported.
    expect(result).toMatchObject({
      status: "partial",
      playersSynced: 2,
      matchesSynced: 1,
    });
    expect(runs.update).toHaveBeenLastCalledWith(
      "run-1",
      expect.objectContaining({ status: "partial" }),
    );
  });

  it("records a failed run without throwing", async () => {
    const { service, client } = setup();
    client.playerStatistics.mockRejectedValue(new Error("boom"));

    const result = await service.run();

    expect(result).toMatchObject({ status: "failed", message: "boom" });
  });

  it("lets the fallback schedule skip a day that already succeeded", async () => {
    const { service, client, runs } = setup({ recentSuccess: true });

    expect((await service.run()).status).toBe("skipped");
    expect(client.startRun).not.toHaveBeenCalled();
    expect(runs.save).not.toHaveBeenCalled();

    expect((await service.run({ force: true })).status).toBe("success");
  });

  describe("with the Ballon d'Or window closed", () => {
    const closed = { PLAYER_STATS_WINDOW_CLOSED: true };

    it("spends nothing once a run completed", async () => {
      const { service, client } = setup({
        recentSuccess: true,
        config: closed,
      });

      expect(await service.run()).toMatchObject({
        status: "skipped",
        requestsUsed: 0,
      });
      expect(client.startRun).not.toHaveBeenCalled();
    });

    it("fetches club totals only for nominees still missing them", async () => {
      const { service, client, competitionQuery } = setup({ config: closed });
      competitionQuery.getRawMany.mockResolvedValue([
        // Synced long ago: final, not fetched again.
        { idCandidates: "id-rodri", syncedAt: new Date("2026-08-01") },
      ]);

      await service.run();

      expect(client.playerStatistics.mock.calls).toEqual([[29778]]);
    });

    it("refetches everything when forced", async () => {
      const { service, client, competitionQuery } = setup({
        recentSuccess: true,
        config: closed,
      });
      competitionQuery.getRawMany.mockResolvedValue([
        { idCandidates: "id-rodri", syncedAt: new Date() },
      ]);

      expect((await service.run({ force: true })).status).toBe("success");
      expect(client.playerStatistics).toHaveBeenCalledTimes(2);
    });
  });
});
