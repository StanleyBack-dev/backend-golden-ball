import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { MigrationExecutor } from "typeorm/migration/MigrationExecutor";

// Arbitrary app-wide key for the advisory lock ("BO2026" in hex-ish).
const MIGRATIONS_LOCK_KEY = 0x424f2026;

/**
 * Runs pending migrations on boot, before the app serves requests.
 *
 * TypeORM's own `migrationsRun` takes no lock, so on Vercel several cold
 * starts after a deploy could run the same migration at once. Here all
 * pending migrations run in ONE transaction that first takes
 * `pg_advisory_xact_lock`: concurrent instances queue on the lock, and by
 * the time they get it the migrations table already lists everything.
 * The transaction-scoped lock (not the session one) is deliberate — it is
 * reliable through Neon's pooled (PgBouncer, transaction-mode) endpoint.
 */
@Injectable()
export class MigrationsRunnerService implements OnModuleInit {
  private readonly logger = new Logger(MigrationsRunnerService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<boolean>("DB_MIGRATIONS_RUN") !== true) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();
      await queryRunner.query("SELECT pg_advisory_xact_lock($1)", [
        MIGRATIONS_LOCK_KEY,
      ]);

      const executor = new MigrationExecutor(this.dataSource, queryRunner);
      // We own the transaction (and the lock that lives inside it).
      executor.transaction = "none";
      const executed = await executor.executePendingMigrations();

      await queryRunner.commitTransaction();

      if (executed.length) {
        this.logger.log(
          `Migrations aplicadas: ${executed.map((m) => m.name).join(", ")}`,
        );
      }
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
