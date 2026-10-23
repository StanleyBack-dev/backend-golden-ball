import { HttpException } from "@nestjs/common";
import { TimelineGranularity } from "../enums/analytics.enums";
import { GetPollAnalyticsService } from "../services/analytics/get-poll-analytics.service";
import { TallyRow } from "../services/tally/vote-tally.service";

const H = 3_600_000;
const T0 = Date.parse("2026-10-23T12:00:00Z");

const OPTIONS = [
  { idCandidates: "id-vini", slug: "vinicius-junior", name: "Vini Jr." },
  { idCandidates: "id-yamal", slug: "lamine-yamal", name: "Lamine Yamal" },
  { idCandidates: "id-kane", slug: "harry-kane", name: "Kane" },
].map((o) => ({
  ...o,
  fullName: o.name,
  photoUrl: null,
  club: "X",
  nationality: "Y",
  position: "Atacante",
  color: "#000000",
}));

type Slug = "vinicius-junior" | "lamine-yamal" | "harry-kane";

const row = (slug: Slug, hour: number, votes: number): TallyRow => ({
  idCandidates: OPTIONS.find((o) => o.slug === slug)!.idCandidates,
  hourMs: T0 + hour * H,
  votes,
});

// Vini 14 x 9 Yamal, spread over three hours.
const ROWS: TallyRow[] = [
  row("vinicius-junior", 0, 6),
  row("lamine-yamal", 0, 3),
  row("vinicius-junior", 1, 5),
  row("lamine-yamal", 1, 4),
  row("vinicius-junior", 2, 3),
  row("lamine-yamal", 2, 2),
];

function setup(rows = ROWS) {
  return new GetPollAnalyticsService(
    { rows: jest.fn().mockResolvedValue(rows) } as never,
    { findAll: jest.fn().mockResolvedValue(OPTIONS) } as never,
  );
}

const pct = (data: { candidates: { slug: string; percentage: number }[] }) =>
  Object.fromEntries(data.candidates.map((c) => [c.slug, c.percentage]));

describe("GetPollAnalyticsService", () => {
  it("summarizes the whole poll", async () => {
    const result = await setup().execute();

    expect(result.summary).toEqual({
      totalVotes: 23,
      overallVotes: 23,
      shareOfOverall: 100,
      leaderSlug: "vinicius-junior",
      marginVotes: 14 - 9,
      marginPoints: 21.74,
      nomineesWithVotes: 2,
    });
  });

  it("restricts the period, rounding `from` down to the hour", async () => {
    const result = await setup().execute({
      from: new Date(T0 + 2 * H + 30 * 60_000).toISOString(),
    });

    // Only hour 2: Vini 3 x 2 Yamal, against 23 overall.
    expect(result.summary).toMatchObject({
      totalVotes: 5,
      overallVotes: 23,
      shareOfOverall: 21.74,
      leaderSlug: "vinicius-junior",
    });
    expect(pct(result)).toEqual({
      "vinicius-junior": 60,
      "lamine-yamal": 40,
      "harry-kane": 0,
    });
  });

  it("closes the period with `to`", async () => {
    const result = await setup().execute({
      to: new Date(T0 + H).toISOString(),
    });
    expect(result.summary.totalVotes).toBe(18);
  });

  it("rejects a period that ends before it starts", async () => {
    await expect(
      setup().execute({
        from: "2026-10-24T00:00:00Z",
        to: "2026-10-23T00:00:00Z",
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("builds a continuous cumulative hourly timeline", async () => {
    const { timeline, granularity } = await setup().execute();

    expect(granularity).toBe(TimelineGranularity.HOUR);
    expect(timeline.map((p) => p.at)).toEqual([
      new Date(T0).toISOString(),
      new Date(T0 + H).toISOString(),
      new Date(T0 + 2 * H).toISOString(),
    ]);
    expect(timeline.map((p) => p.cumulativeTotal)).toEqual([9, 18, 23]);
    expect(timeline.at(-1)!.candidates[0].cumulativeVotes).toBe(14);
  });

  it("switches to daily buckets cut at midnight Brasília", async () => {
    const at = (iso: string) => ({
      ...row("vinicius-junior", 0, 1),
      hourMs: Date.parse(iso),
    });
    // 02:00 UTC = 23:00 Brasília (day 1) · 04:00 UTC = 01:00 Brasília (day 2)
    const { timeline, granularity } = await setup([
      at("2026-10-20T02:00:00Z"),
      at("2026-10-20T04:00:00Z"),
      at("2026-10-24T04:00:00Z"),
    ]).execute();

    expect(granularity).toBe(TimelineGranularity.DAY);
    expect(timeline[0].at).toBe("2026-10-19T03:00:00.000Z");
    expect(timeline[0].totalVotes).toBe(1);
    expect(timeline[1].at).toBe("2026-10-20T03:00:00.000Z");
    expect(timeline[1].totalVotes).toBe(1);
    expect(timeline).toHaveLength(6);
  });

  it("returns an empty timeline when there are no votes", async () => {
    const result = await setup([]).execute();

    expect(result.timeline).toEqual([]);
    expect(result.summary).toMatchObject({
      leaderSlug: null,
      shareOfOverall: 0,
      nomineesWithVotes: 0,
    });
  });

  it("ranks a three-way race by the top two", async () => {
    const result = await setup([
      row("vinicius-junior", 0, 5),
      row("lamine-yamal", 0, 3),
      row("harry-kane", 1, 2),
    ]).execute();

    expect(result.summary).toMatchObject({
      totalVotes: 10,
      leaderSlug: "vinicius-junior",
      marginVotes: 2,
      marginPoints: 20,
      nomineesWithVotes: 3,
    });
    expect(pct(result)).toEqual({
      "vinicius-junior": 50,
      "lamine-yamal": 30,
      "harry-kane": 20,
    });

    const last = result.timeline.at(-1)!;
    expect(last.cumulativeTotal).toBe(10);
    expect(last.candidates.map((c) => c.cumulativePercentage)).toEqual([
      50, 30, 20,
    ]);
  });

  it("has no leader when the top two are tied, even with a third behind", async () => {
    const result = await setup([
      row("vinicius-junior", 0, 2),
      row("lamine-yamal", 0, 2),
      row("harry-kane", 0, 1),
    ]).execute();

    expect(result.summary.leaderSlug).toBeNull();
    expect(result.summary.marginVotes).toBe(0);
  });
});
