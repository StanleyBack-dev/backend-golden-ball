import { Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import {
  GetCandidatesService,
  toCandidateDto,
} from "../../../candidates/services/get-candidates.service";
import { PollAnalyticsFilterInput } from "../../dtos/analytics/poll-analytics-filter.input";
import {
  PollAnalyticsDto,
  TimelinePointDto,
} from "../../dtos/analytics/poll-analytics-response.dto";
import { TimelineGranularity } from "../../enums/analytics.enums";
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

interface Period {
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
    const period = this.resolvePeriod(filter);
    const [candidates, allRows] = await Promise.all([
      this.getCandidatesService.findAll(),
      this.voteTallyService.rows(),
    ]);

    const slugById = new Map(candidates.map((c) => [c.idCandidates, c.slug]));
    const slugs = candidates.map((c) => c.slug);

    const knownRows = allRows.filter((row) => slugById.has(row.idCandidates));
    const periodRows = knownRows.filter(
      (row) => row.hourMs >= period.fromMs && row.hourMs <= period.toMs,
    );
    const overallVotes = knownRows.reduce((sum, row) => sum + row.votes, 0);

    const slice = emptyBreakdown();
    for (const row of periodRows) {
      addToBreakdown(slice, slugById.get(row.idCandidates)!, row.votes);
    }

    const shares = candidateShares(slice, slugs);
    const lead = computeLead(shares, slice.totalVotes);
    const sharesBySlug = new Map(shares.map((s) => [s.slug, s]));

    const { granularity, timeline } = this.buildTimeline(
      periodRows,
      slugById,
      slugs,
      filter.granularity,
    );

    return {
      summary: {
        totalVotes: slice.totalVotes,
        overallVotes,
        shareOfOverall: percentage(slice.totalVotes, overallVotes),
        leaderSlug: lead.leaderSlug,
        marginVotes: lead.marginVotes,
        marginPoints: lead.marginPoints,
        nomineesWithVotes: shares.filter((s) => s.votes > 0).length,
      },
      candidates: candidates.map((candidate) => ({
        ...toCandidateDto(candidate),
        votes: sharesBySlug.get(candidate.slug)!.votes,
        percentage: sharesBySlug.get(candidate.slug)!.percentage,
      })),
      granularity,
      timeline,
      updatedAt: new Date().toISOString(),
    };
  }

  private resolvePeriod(filter: PollAnalyticsFilterInput): Period {
    // Votes are stored per hour; a `from` mid-hour includes that whole hour
    // so "last 24h" never drops the bucket in progress.
    const fromMs = filter.from
      ? Math.floor(Date.parse(filter.from) / HOUR_MS) * HOUR_MS
      : -Infinity;
    const toMs = filter.to ? Date.parse(filter.to) : Infinity;

    if (fromMs > toMs) {
      throw AppException.from(APP_ERRORS.votes.invalidPeriod, undefined);
    }

    return { fromMs, toMs };
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
