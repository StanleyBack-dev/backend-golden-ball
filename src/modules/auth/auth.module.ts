import { Module } from "@nestjs/common";
import { GoogleTokenVerifier } from "./services/google-token-verifier.service";
import { VoterSessionService } from "./services/voter-session.service";

@Module({
  providers: [GoogleTokenVerifier, VoterSessionService],
  exports: [GoogleTokenVerifier, VoterSessionService],
})
export class AuthModule {}
