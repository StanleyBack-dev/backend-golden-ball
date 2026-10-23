import { percentage } from "./tally-math.util";

/** Vote counts for one slice (country, region, state, time bucket). */
export interface VoteBreakdown {
  totalVotes: number;
  byCandidate: Map<string, number>;
}

export function emptyBreakdown(): VoteBreakdown {
  return { totalVotes: 0, byCandidate: new Map() };
}

export function addToBreakdown(
  breakdown: VoteBreakdown,
  candidateSlug: string,
  votes: number,
): void {
  breakdown.totalVotes += votes;
  breakdown.byCandidate.set(
    candidateSlug,
    (breakdown.byCandidate.get(candidateSlug) ?? 0) + votes,
  );
}

export function mergeBreakdown(
  target: VoteBreakdown,
  source: VoteBreakdown,
): void {
  target.totalVotes += source.totalVotes;
  for (const [slug, votes] of source.byCandidate) {
    target.byCandidate.set(slug, (target.byCandidate.get(slug) ?? 0) + votes);
  }
}

/** Every candidate's votes and share of the slice, in the given order. */
export function candidateShares(
  breakdown: VoteBreakdown,
  candidateSlugs: string[],
) {
  return candidateSlugs.map((slug) => {
    const votes = breakdown.byCandidate.get(slug) ?? 0;
    return {
      slug,
      votes,
      percentage: percentage(votes, breakdown.totalVotes),
    };
  });
}
