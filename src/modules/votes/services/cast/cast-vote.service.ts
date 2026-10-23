import { Injectable } from "@nestjs/common";
import { AppException } from "../../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../../common/exceptions/app-errors.catalog";
import { ClientInfo } from "../../../../common/request/get-request.util";
import { VoterSession } from "../../../auth/services/voter-session.service";
import { CaptchaService } from "../../../captcha/captcha.service";
import { GetCandidatesService } from "../../../candidates/services/get-candidates.service";
import { CastVoteInputDto } from "../../dtos/cast/cast-vote-input.dto";
import { CastVoteResponseDto } from "../../dtos/cast/cast-vote-response.dto";
import { VotingWindowService } from "../voting-window.service";
import { VoteRecorderService } from "./vote-recorder.service";

/** Records the vote of the signed-in Google account: one per account. */
@Injectable()
export class CastVoteService {
  constructor(
    private readonly getCandidatesService: GetCandidatesService,
    private readonly captchaService: CaptchaService,
    private readonly votingWindowService: VotingWindowService,
    private readonly voteRecorder: VoteRecorderService,
  ) {}

  async execute(
    input: CastVoteInputDto,
    session: VoterSession | null,
    client: ClientInfo,
  ): Promise<CastVoteResponseDto> {
    if (!this.votingWindowService.isOpen()) {
      throw AppException.from(APP_ERRORS.votes.votingClosed, undefined);
    }

    if (!session) {
      throw AppException.from(APP_ERRORS.auth.sessionRequired, undefined);
    }

    if (!(await this.captchaService.verify(input.captchaToken, client.ip))) {
      throw AppException.from(APP_ERRORS.votes.captchaFailed, undefined);
    }

    const candidate = await this.getCandidatesService.findBySlug(
      input.candidateSlug,
    );
    if (!candidate) {
      throw AppException.from(APP_ERRORS.votes.candidateNotFound, undefined);
    }

    if (await this.voteRecorder.hasVoted(session.voterHash)) {
      throw AppException.from(APP_ERRORS.votes.alreadyVoted, undefined);
    }

    return this.voteRecorder.record(session.voterHash, candidate);
  }
}
