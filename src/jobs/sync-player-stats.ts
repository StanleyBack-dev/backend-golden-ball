// Entry point of the daily stats sync (GitHub Actions cron, or
// `npm run stats:sync:dev` locally). Exits non-zero only when the run
// failed, so a partial run (request budget reached) doesn't page anyone:
// the next run picks up where it stopped.
import { Logger, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { StatsSyncConfigModule } from "../config/stats-sync-config.module";
import { DatabaseModule } from "../database/database.module";
import { PlayerStatsSyncModule } from "../modules/player-stats/player-stats-sync.module";
import { SyncPlayerStatsService } from "../modules/player-stats/services/sync/sync-player-stats.service";

@Module({
  imports: [StatsSyncConfigModule, DatabaseModule, PlayerStatsSyncModule],
})
class StatsSyncJobModule {}

async function main() {
  const logger = new Logger("StatsSyncJob");
  const force = process.argv.includes("--force");
  const app = await NestFactory.createApplicationContext(StatsSyncJobModule, {
    logger: ["log", "warn", "error"],
  });

  try {
    const result = await app.get(SyncPlayerStatsService).run({ force });
    logger.log(
      `status=${result.status} requests=${result.requestsUsed} players=${result.playersSynced} matches=${result.matchesSynced} — ${result.message}`,
    );
    process.exitCode = result.status === "failed" ? 1 : 0;
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  new Logger("StatsSyncJob").error((error as Error).message);
  process.exit(1);
});
