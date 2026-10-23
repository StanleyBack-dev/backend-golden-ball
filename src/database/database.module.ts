import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { MIGRATIONS } from "./migrations";
import { MigrationsRunnerService } from "./migrations-runner.service";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        ({
          type: "postgres",
          url: configService.get<string>("DATABASE_URL"),
          // Schema is managed exclusively through migrations, run on every
          // boot (local and deployed) by MigrationsRunnerService under an
          // advisory lock — not by TypeORM's `migrationsRun`, which has none.
          synchronize: false,
          migrations: MIGRATIONS,
          migrationsRun: false,
          logging: configService.get<boolean>("TYPEORM_LOGGING") === true,
          ssl: configService.get<boolean>("DB_SSL")
            ? { rejectUnauthorized: false }
            : false,
          extra: { max: 5 },
          autoLoadEntities: true,
        }) as PostgresConnectionOptions,
    }),
  ],
  providers: [MigrationsRunnerService],
})
export class DatabaseModule {}
