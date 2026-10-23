import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, Repository } from "typeorm";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import { CandidateEntity } from "../../../candidates/entities/candidate.entity";
import { CastVoteResponseDto } from "../../dtos/cast/cast-vote-response.dto";
import { VoteEntity } from "../../entities/vote.entity";
import { VoterEntity } from "../../entities/voter.entity";
import { VoteTallyService } from "../tally/vote-tally.service";

const PG_UNIQUE_VIOLATION = "23505";

/** Writes the ballot of a signed-in Google account. */
@Injectable()
export class VoteRecorderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(VoterEntity)
    private readonly votersRepository: Repository<VoterEntity>,
    private readonly voteTallyService: VoteTallyService,
  ) {}

  hasVoted(voterHash: string): Promise<boolean> {
    return this.votersRepository.exists({ where: { voterHash } });
  }

  /**
   * Voter registry and ballot are written atomically. The UNIQUE constraint
   * on `voter_hash` is the real double-vote guard: it holds even when two
   * requests from the same account race past `hasVoted`.
   */
  async record(
    voterHash: string,
    candidate: Pick<CandidateEntity, "idCandidates" | "slug">,
  ): Promise<CastVoteResponseDto> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(VoterEntity, { voterHash });
        await manager.insert(VoteEntity, {
          idCandidates: candidate.idCandidates,
        });
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw AppException.from(APP_ERRORS.votes.alreadyVoted, undefined);
      }
      throw error;
    }

    this.voteTallyService.invalidate();

    return {
      registered: true,
      candidateSlug: candidate.slug,
      votedAt: new Date().toISOString(),
    };
  }
}
