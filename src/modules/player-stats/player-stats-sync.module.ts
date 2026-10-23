import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CandidateEntity } from "../candidates/entities/candidate.entity";
import { PlayerCompetitionStatsEntity } from "./entities/player-competition-stats.entity";
import { PlayerMatchStatsEntity } from "./entities/player-match-stats.entity";
import { StatsSyncRunEntity } from "./entities/stats-sync-run.entity";
import { StatsSyncedMatchEntity } from "./entities/stats-synced-match.entity";
import { HighlightlyClient } from "./providers/highlightly.client";
import { SyncPlayerStatsService } from "./services/sync/sync-player-stats.service";

/** Write side: copies provider data into Postgres (daily job only). */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateEntity,
      PlayerCompetitionStatsEntity,
      PlayerMatchStatsEntity,
      StatsSyncedMatchEntity,
      StatsSyncRunEntity,
    ]),
  ],
  providers: [HighlightlyClient, SyncPlayerStatsService],
  exports: [SyncPlayerStatsService],
})
export class PlayerStatsSyncModule {}
