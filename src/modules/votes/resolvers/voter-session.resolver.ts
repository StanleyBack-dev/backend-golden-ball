import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { RateLimit } from "../../../common/rate-limit/rate-limit.decorator";
import type { HttpRequestLike } from "../../../common/request/client-ip.util";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { VoterSessionService } from "../../auth/services/voter-session.service";
import { SignInWithGoogleInputDto } from "../dtos/session/sign-in-with-google-input.dto";
import {
  CurrentVoterQueryResponseDto,
  SignInWithGoogleMutationResponseDto,
} from "../dtos/session/voter-session-response.dto";
import { VoterSessionQueryService } from "../services/session/voter-session-query.service";

@Resolver()
export class VoterSessionResolver {
  constructor(
    private readonly voterSessionQueryService: VoterSessionQueryService,
    private readonly voterSessionService: VoterSessionService,
  ) {}

  // Same limits as voting, in its own bucket.
  @RateLimit({
    name: "sign-in",
    configPrefix: "RATE_LIMIT_VOTE",
    store: "database",
  })
  @Mutation(() => SignInWithGoogleMutationResponseDto, {
    name: "signInWithGoogle",
  })
  async signInWithGoogle(@Args("input") input: SignInWithGoogleInputDto) {
    const result = await this.voterSessionQueryService.signIn(input.idToken);
    return buildDataResponse(result, RESPONSE_MESSAGES.auth.signedIn);
  }

  @Query(() => CurrentVoterQueryResponseDto, { name: "currentVoter" })
  async currentVoter(@Context("req") req: HttpRequestLike) {
    const voter = await this.voterSessionQueryService.current(
      this.voterSessionService.fromRequest(req),
    );
    return buildDataResponse(voter, RESPONSE_MESSAGES.auth.currentVoter);
  }
}
