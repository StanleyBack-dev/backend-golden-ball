import { Injectable } from "@nestjs/common";
import { GoogleTokenVerifier } from "../../../auth/services/google-token-verifier.service";
import {
  VoterSession,
  VoterSessionService,
} from "../../../auth/services/voter-session.service";
import {
  SignInWithGoogleResponseDto,
  VoterDto,
} from "../../dtos/session/voter-session-response.dto";
import { VoteRecorderService } from "../cast/vote-recorder.service";

/** Google sign-in, and who is signed in (plus whether they already voted). */
@Injectable()
export class VoterSessionQueryService {
  constructor(
    private readonly googleTokenVerifier: GoogleTokenVerifier,
    private readonly voterSessionService: VoterSessionService,
    private readonly voteRecorder: VoteRecorderService,
  ) {}

  async signIn(idToken: string): Promise<SignInWithGoogleResponseDto> {
    const profile = await this.googleTokenVerifier.verify(idToken);
    const { token, expiresAt } = this.voterSessionService.issue(profile);
    const session = this.voterSessionService.verify(token)!;

    return {
      sessionToken: token,
      expiresAt: expiresAt.toISOString(),
      voter: await this.toVoter(session),
    };
  }

  async current(session: VoterSession | null): Promise<VoterDto | null> {
    return session ? this.toVoter(session) : null;
  }

  private async toVoter(session: VoterSession): Promise<VoterDto> {
    return {
      name: session.name,
      email: session.email,
      pictureUrl: session.pictureUrl,
      hasVoted: await this.voteRecorder.hasVoted(session.voterHash),
    };
  }
}
