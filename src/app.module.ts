// LIBS
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";

// COMMON
import { formatGraphqlError } from "./common/exceptions/graphql-error.formatter";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";

// CONFIG
import { AppConfigModule } from "./config/config.module";
import { isDeployedEnv } from "./config/environment.util";
import { DatabaseModule } from "./database/database.module";

// MODULES
import { CandidatesModule } from "./modules/candidates/candidates.module";
import { PlayerStatsModule } from "./modules/player-stats/player-stats.module";
import { VotesModule } from "./modules/votes/votes.module";
import { AppController } from "./app.controller";

const IS_DEPLOYED = isDeployedEnv();

@Module({
  controllers: [AppController],
  imports: [
    AppConfigModule,
    DatabaseModule,
    RateLimitModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: IS_DEPLOYED
        ? true
        : join(process.cwd(), "src/graphql/schema.gql"),
      // No schema exploration in production.
      playground: !IS_DEPLOYED,
      introspection: !IS_DEPLOYED,
      // Rejects "simple" cross-site requests (CSRF) that skip CORS preflight.
      csrfPrevention: true,
      context: ({ req, res }) => ({ req, res }),
      formatError: formatGraphqlError,
    }),
    CandidatesModule,
    VotesModule,
    PlayerStatsModule,
  ],
})
export class AppModule {}
