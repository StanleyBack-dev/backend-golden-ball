import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "path";
import { statsSyncEnvValidationSchema } from "./env.validation";
import { isDeployedEnv } from "./environment.util";

const IS_DEPLOYED = isDeployedEnv();

/** Configuration for the stats sync job (database + provider key only). */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: IS_DEPLOYED,
      envFilePath: IS_DEPLOYED
        ? undefined
        : resolve(process.cwd(), ".env.development"),
      validationSchema: statsSyncEnvValidationSchema,
    }),
  ],
})
export class StatsSyncConfigModule {}
