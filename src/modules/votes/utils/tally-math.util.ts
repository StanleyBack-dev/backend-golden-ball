export interface CandidateVotes {
  slug: string;
  votes: number;
}

/** Share of `total` in percent, rounded to 2 decimals (0 when no votes). */
export function percentage(part: number, total: number): number {
  return total ? Math.round((part / total) * 10000) / 100 : 0;
}

export interface Lead {
  /** null when there are no votes or the top two are tied. */
  leaderSlug: string | null;
  marginVotes: number;
  /** Difference in percentage points between first and second place. */
  marginPoints: number;
}

export function computeLead(shares: CandidateVotes[], total: number): Lead {
  const ranked = [...shares].sort((a, b) => b.votes - a.votes);
  const first = ranked[0]?.votes ?? 0;
  const second = ranked[1]?.votes ?? 0;
  const marginVotes = first - second;

  return {
    leaderSlug: total > 0 && marginVotes > 0 ? ranked[0].slug : null,
    marginVotes,
    marginPoints:
      Math.round((percentage(first, total) - percentage(second, total)) * 100) /
      100,
  };
}
