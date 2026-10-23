import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { CaptchaModule } from "../captcha/captcha.module";
import { CandidatesModule } from "../candidates/candidates.module";
import { VoteEntity } from "./entities/vote.entity";
import { VoterEntity } from "./entities/voter.entity";
import { CastVoteService } from "./services/cast/cast-vote.service";
import { VoteRecorderService } from "./services/cast/vote-recorder.service";
import { VoterSessionQueryService } from "./services/session/voter-session-query.service";
import { GetPollResultsService } from "./services/results/get-poll-results.service";
import { VotingWindowService } from "./services/voting-window.service";
import { VoteTallyService } from "./services/tally/vote-tally.service";
import { GetPollAnalyticsService } from "./services/analytics/get-poll-analytics.service";
import { GetPollAnalyticsResolver } from "./resolvers/get-poll-analytics.resolver";
import { CastVoteResolver } from "./resolvers/cast-vote.resolver";
import { GetPollResultsResolver } from "./resolvers/get-poll-results.resolver";
import { VoterSessionResolver } from "./resolvers/voter-session.resolver";

@Module({
  imports: [
    TypeOrmModule.forFeature([VoterEntity, VoteEntity]),
    AuthModule,
    CandidatesModule,
    CaptchaModule,
  ],
  providers: [
    VotingWindowService,
    VoteTallyService,
    GetPollAnalyticsService,
    GetPollAnalyticsResolver,
    VoteRecorderService,
    CastVoteService,
    CastVoteResolver,
    VoterSessionQueryService,
    VoterSessionResolver,
    GetPollResultsService,
    GetPollResultsResolver,
  ],
})
export class VotesModule {}
