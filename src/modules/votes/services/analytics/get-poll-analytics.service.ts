import { Injectable } from "@nestjs/common";
import {
  BrazilianRegion,
  REGION_LABELS,
  REGION_STATES,
  STATE_REGION,
} from "../../../../common/constants/brazilian-regions.constant";
import { BRAZILIAN_STATES } from "../../../../common/constants/brazilian-states.constant";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import {
  GetCandidatesService,
  toCandidateDto,
} from "../../../candidates/services/get-candidates.service";
import { PollAnalyticsFilterInput } from "../../dtos/analytics/poll-analytics-filter.input";
import {
  PollAnalyticsDto,
  RegionAnalyticsDto,
  StateAnalyticsDto,
  TimelinePointDto,
} from "../../dtos/analytics/poll-analytics-response.dto";
import {
  SortOrder,
  StateSortField,
  TimelineGranularity,
} from "../../enums/analytics.enums";
import { computeLead, percentage } from "../../utils/tally-math.util";
import {
  addToBreakdown,
  candidateShares,
  emptyBreakdown,
  mergeBreakdown,
  VoteBreakdown,
} from "../../utils/vote-breakdown.util";
import { TallyRow, VoteTallyService } from "../tally/vote-tally.service";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// Brasília has no daylight saving time since 2019: a fixed UTC-3.
const BRASILIA_OFFSET_MS = 3 * HOUR_MS;
const AUTO_HOURLY_MAX_SPAN_MS = 72 * HOUR_MS;
const MAX_HOURLY_POINTS = 24 * 14;

interface Scope {
  states: Set<string>;
  fromMs: number;
  toMs: number;
}

@Injectable()
export class GetPollAnalyticsService {
  constructor(
    private readonly voteTallyService: VoteTallyService,
    private readonly getCandidatesService: GetCandidatesService,
  ) {}

  async execute(
    filter: PollAnalyticsFilterInput = {},
  ): Promise<PollAnalyticsDto> {
    const scope = this.resolveScope(filter);
    const [candidates, allRows] = await Promise.all([
      this.getCandidatesService.findAll(),
      this.voteTallyService.rows(),
    ]);

    const slugById = new Map(candidates.map((c) => [c.idCandidates, c.slug]));
    const slugs = candidates.map((c) => c.slug);

    // Same period for both the slice and the national baseline.
    const periodRows = allRows.filter(
      (row) =>
        row.hourMs >= scope.fromMs &&
        row.hourMs <= scope.toMs &&
        slugById.has(row.idCandidates),
    );
    const sliceRows = periodRows.filter((row) => scope.states.has(row.state));
    const nationalVotes = periodRows.reduce((sum, row) => sum + row.votes, 0);

    // --- per state -------------------------------------------------------
    const stateBreakdowns = new Map<string, VoteBreakdown>();
    for (const row of sliceRows) {
      const breakdown = stateBreakdowns.get(row.state) ?? emptyBreakdown();
      addToBreakdown(breakdown, slugById.get(row.idCandidates)!, row.votes);
      stateBreakdowns.set(row.state, breakdown);
    }

    const slice = emptyBreakdown();
    for (const breakdown of stateBreakdowns.values()) {
      mergeBreakdown(slice, breakdown);
    }

    const allStates: StateAnalyticsDto[] = BRAZILIAN_STATES.filter((uf) =>
      scope.states.has(uf),
    ).map((state) =>
      this.buildStateRow(
        state,
        stateBreakdowns.get(state) ?? emptyBreakdown(),
        slugs,
        slice.totalVotes,
      ),
    );

    // --- slice totals ----------------------------------------------------
    const sliceShares = candidateShares(slice, slugs);
    const lead = computeLead(sliceShares, slice.totalVotes);

    // --- regions within the scope ----------------------------------------
    const regions: RegionAnalyticsDto[] = (
      Object.keys(REGION_STATES) as BrazilianRegion[]
    )
      .filter((region) =>
        REGION_STATES[region].some((uf) => scope.states.has(uf)),
      )
      .map((region) => {
        const breakdown = emptyBreakdown();
        for (const uf of REGION_STATES[region]) {
          const state = stateBreakdowns.get(uf);
          if (state && scope.states.has(uf)) mergeBreakdown(breakdown, state);
        }
        const shares = candidateShares(breakdown, slugs);
        const regionLead = computeLead(shares, breakdown.totalVotes);

        return {
          region,
          label: REGION_LABELS[region],
          totalVotes: breakdown.totalVotes,
          candidates: shares,
          leaderSlug: regionLead.leaderSlug,
          marginPoints: regionLead.marginPoints,
        };
      });

    // --- state list: filter + sort ---------------------------------------
    const states = this.sortStates(
      allStates.filter(
        (row) =>
          (!filter.leaderSlug || row.leaderSlug === filter.leaderSlug) &&
          row.totalVotes >= (filter.minVotes ?? 0),
      ),
      filter,
      slugs[0],
    );

    const { granularity, timeline } = this.buildTimeline(
      sliceRows,
      slugById,
      slugs,
      filter.granularity,
    );

    const sharesBySlug = new Map(sliceShares.map((s) => [s.slug, s]));

    return {
      summary: {
        totalVotes: slice.totalVotes,
        nationalVotes,
        shareOfNational: percentage(slice.totalVotes, nationalVotes),
        leaderSlug: lead.leaderSlug,
        marginVotes: lead.marginVotes,
        marginPoints: lead.marginPoints,
        statesWon: slugs.map((slug) => ({
          slug,
          states: allStates.filter((row) => row.leaderSlug === slug).length,
        })),
        tiedStates: allStates.filter(
          (row) => row.totalVotes > 0 && row.leaderSlug === null,
        ).length,
        statesWithoutVotes: allStates.filter((row) => row.totalVotes === 0)
          .length,
      },
      candidates: candidates.map((candidate) => ({
        ...toCandidateDto(candidate),
        votes: sharesBySlug.get(candidate.slug)!.votes,
        percentage: sharesBySlug.get(candidate.slug)!.percentage,
      })),
      regions,
      states,
      granularity,
      timeline,
      updatedAt: new Date().toISOString(),
    };
  }

  private resolveScope(filter: PollAnalyticsFilterInput): Scope {
    let states = new Set<string>(BRAZILIAN_STATES);

    if (filter.region) {
      states = new Set(REGION_STATES[filter.region]);
    }
    if (filter.states?.length) {
      const requested = new Set(filter.states);
      states = new Set([...states].filter((uf) => requested.has(uf)));
    }

    // Votes are stored per hour; a `from` mid-hour includes that whole hour
    // so "last 24h" never drops the bucket in progress.
    const fromMs = filter.from
      ? Math.floor(Date.parse(filter.from) / HOUR_MS) * HOUR_MS
      : -Infinity;
    const toMs = filter.to ? Date.parse(filter.to) : Infinity;

    if (fromMs > toMs) {
      throw AppException.from(APP_ERRORS.votes.invalidPeriod, undefined);
    }

    return { states, fromMs, toMs };
  }

  private buildStateRow(
    state: string,
    breakdown: VoteBreakdown,
    slugs: string[],
    sliceTotal: number,
  ): StateAnalyticsDto {
    const shares = candidateShares(breakdown, slugs);
    const lead = computeLead(shares, breakdown.totalVotes);

    return {
      state,
      region: STATE_REGION[state],
      totalVotes: breakdown.totalVotes,
      shareOfSlice: percentage(breakdown.totalVotes, sliceTotal),
      candidates: shares,
      leaderSlug: lead.leaderSlug,
      marginVotes: lead.marginVotes,
      marginPoints: lead.marginPoints,
    };
  }

  private sortStates(
    rows: StateAnalyticsDto[],
    filter: PollAnalyticsFilterInput,
    defaultCandidate: string,
  ): StateAnalyticsDto[] {
    const sortBy = filter.sortBy ?? StateSortField.TOTAL_VOTES;
    const direction =
      (filter.order ??
        (sortBy === StateSortField.STATE ? SortOrder.ASC : SortOrder.DESC)) ===
      SortOrder.ASC
        ? 1
        : -1;
    const shareSlug = filter.sortCandidateSlug ?? defaultCandidate;
    const shareOf = (row: StateAnalyticsDto) =>
      row.candidates.find((c) => c.slug === shareSlug)?.percentage ?? 0;

    const key = (row: StateAnalyticsDto): number | string => {
      switch (sortBy) {
        case StateSortField.STATE:
          return row.state;
        case StateSortField.MARGIN:
          return row.marginPoints;
        case StateSortField.CANDIDATE_SHARE:
          return shareOf(row);
        default:
          return row.totalVotes;
      }
    };

    return [...rows].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      const cmp =
        typeof ka === "string"
          ? ka.localeCompare(kb as string)
          : ka - (kb as number);
      // Stable, predictable tie-break: alphabetical by UF.
      return cmp * direction || a.state.localeCompare(b.state);
    });
  }

  private buildTimeline(
    rows: TallyRow[],
    slugById: Map<string, string>,
    slugs: string[],
    requested?: TimelineGranularity,
  ): { granularity: TimelineGranularity; timeline: TimelinePointDto[] } {
    if (!rows.length) {
      return {
        granularity: requested ?? TimelineGranularity.HOUR,
        timeline: [],
      };
    }

    const firstMs = Math.min(...rows.map((r) => r.hourMs));
    const lastMs = Math.max(...rows.map((r) => r.hourMs));
    const span = lastMs - firstMs;

    let granularity =
      requested ??
      (span <= AUTO_HOURLY_MAX_SPAN_MS
        ? TimelineGranularity.HOUR
        : TimelineGranularity.DAY);
    if (
      granularity === TimelineGranularity.HOUR &&
      span / HOUR_MS + 1 > MAX_HOURLY_POINTS
    ) {
      granularity = TimelineGranularity.DAY;
    }

    const step = granularity === TimelineGranularity.HOUR ? HOUR_MS : DAY_MS;
    // Days are cut at midnight Brasília time.
    const bucketOf = (ms: number) =>
      granularity === TimelineGranularity.HOUR
        ? ms
        : Math.floor((ms - BRASILIA_OFFSET_MS) / DAY_MS) * DAY_MS +
          BRASILIA_OFFSET_MS;

    const buckets = new Map<number, VoteBreakdown>();
    for (const row of rows) {
      const key = bucketOf(row.hourMs);
      const breakdown = buckets.get(key) ?? emptyBreakdown();
      addToBreakdown(breakdown, slugById.get(row.idCandidates)!, row.votes);
      buckets.set(key, breakdown);
    }

    // Continuous axis: empty buckets are kept so time stays linear.
    const timeline: TimelinePointDto[] = [];
    const cumulative = emptyBreakdown();

    for (let at = bucketOf(firstMs); at <= bucketOf(lastMs); at += step) {
      const bucket = buckets.get(at) ?? emptyBreakdown();
      mergeBreakdown(cumulative, bucket);

      timeline.push({
        at: new Date(at).toISOString(),
        totalVotes: bucket.totalVotes,
        cumulativeTotal: cumulative.totalVotes,
        candidates: slugs.map((slug) => {
          const cumulativeVotes = cumulative.byCandidate.get(slug) ?? 0;
          return {
            slug,
            votes: bucket.byCandidate.get(slug) ?? 0,
            cumulativeVotes,
            cumulativePercentage: percentage(
              cumulativeVotes,
              cumulative.totalVotes,
            ),
          };
        }),
      });
    }

    return { granularity, timeline };
  }
}
