import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { RateLimit } from "../../../common/rate-limit/rate-limit.decorator";
import type { HttpRequestLike } from "../../../common/request/client-ip.util";
import { Client } from "../../../common/request/get-request.util";
import type { ClientInfo } from "../../../common/request/get-request.util";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { VoterSessionService } from "../../auth/services/voter-session.service";
import { CastVoteInputDto } from "../dtos/cast/cast-vote-input.dto";
import { CastVoteMutationResponseDto } from "../dtos/cast/cast-vote-response.dto";
import { CastVoteService } from "../services/cast/cast-vote.service";

@Resolver()
export class CastVoteResolver {
  constructor(
    private readonly castVoteService: CastVoteService,
    private readonly voterSessionService: VoterSessionService,
  ) {}

  @RateLimit({
    name: "vote",
    configPrefix: "RATE_LIMIT_VOTE",
    store: "database",
  })
  @Mutation(() => CastVoteMutationResponseDto, { name: "castVote" })
  async castVote(
    @Args("input") input: CastVoteInputDto,
    @Context("req") req: HttpRequestLike,
    @Client() client: ClientInfo,
  ) {
    const result = await this.castVoteService.execute(
      input,
      this.voterSessionService.fromRequest(req),
      client,
    );
    return buildDataResponse(result, RESPONSE_MESSAGES.votes.cast);
  }
}
