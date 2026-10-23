import { Injectable } from "@nestjs/common";
import { BRAZILIAN_STATES } from "../../../../common/constants/brazilian-states.constant";
import {
  GetCandidatesService,
  toCandidateDto,
} from "../../../candidates/services/get-candidates.service";
import { PollResultsDto } from "../../dtos/results/poll-results-response.dto";
import {
  addToBreakdown,
  candidateShares,
  emptyBreakdown,
  VoteBreakdown,
} from "../../utils/vote-breakdown.util";
import { VoteTallyService } from "../tally/vote-tally.service";
import { VotingWindowService } from "../voting-window.service";

@Injectable()
export class GetPollResultsService {
  constructor(
    private readonly voteTallyService: VoteTallyService,
    private readonly getCandidatesService: GetCandidatesService,
    private readonly votingWindowService: VotingWindowService,
  ) {}

  async execute(): Promise<PollResultsDto> {
    const [candidates, rows] = await Promise.all([
      this.getCandidatesService.findAll(),
      this.voteTallyService.rows(),
    ]);

    const slugById = new Map(candidates.map((c) => [c.idCandidates, c.slug]));
    const slugs = candidates.map((c) => c.slug);
    const national = emptyBreakdown();
    const byState = new Map<string, VoteBreakdown>();

    for (const row of rows) {
      const slug = slugById.get(row.idCandidates);
      if (!slug) continue;

      addToBreakdown(national, slug, row.votes);
      const state = byState.get(row.state) ?? emptyBreakdown();
      addToBreakdown(state, slug, row.votes);
      byState.set(row.state, state);
    }

    const shares = new Map(
      candidateShares(national, slugs).map((share) => [share.slug, share]),
    );

    return {
      totalVotes: national.totalVotes,
      // Always computed live (the tally is cached) so it flips exactly at
      // the closing instant.
      votingOpen: this.votingWindowService.isOpen(),
      votingClosesAt: this.votingWindowService.closesAt.toISOString(),
      updatedAt: new Date().toISOString(),
      candidates: candidates.map((candidate) => ({
        ...toCandidateDto(candidate),
        votes: shares.get(candidate.slug)!.votes,
        percentage: shares.get(candidate.slug)!.percentage,
      })),
      states: BRAZILIAN_STATES.map((state) => {
        const breakdown = byState.get(state) ?? emptyBreakdown();
        return {
          state,
          totalVotes: breakdown.totalVotes,
          candidates: candidateShares(breakdown, slugs),
        };
      }),
    };
  }
}
