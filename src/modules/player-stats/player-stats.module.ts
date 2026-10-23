import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CandidatesModule } from "../candidates/candidates.module";
import { PlayerCompetitionStatsEntity } from "./entities/player-competition-stats.entity";
import { PlayerMatchStatsEntity } from "./entities/player-match-stats.entity";
import { StatsSyncRunEntity } from "./entities/stats-sync-run.entity";
import { PlayerStatsResolver } from "./resolvers/player-stats.resolver";
import { GetPlayerStatsService } from "./services/query/get-player-stats.service";
import { PlayerStatsSnapshotService } from "./services/query/player-stats-snapshot.service";

/** Read side: serves the synced stats; never calls the provider. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerCompetitionStatsEntity,
      PlayerMatchStatsEntity,
      StatsSyncRunEntity,
    ]),
    CandidatesModule,
  ],
  providers: [
    PlayerStatsSnapshotService,
    GetPlayerStatsService,
    PlayerStatsResolver,
  ],
})
export class PlayerStatsModule {}
