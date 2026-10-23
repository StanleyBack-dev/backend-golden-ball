import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { envValidationSchema } from "./env.validation";
import { resolve } from "path";
import corsConfig from "./cors.config";
import { isDeployedEnv } from "./environment.util";

const IS_DEPLOYED = isDeployedEnv();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: IS_DEPLOYED,
      envFilePath: IS_DEPLOYED
        ? undefined
        : resolve(process.cwd(), ".env.development"),
      validationSchema: envValidationSchema,
      load: [corsConfig],
    }),
  ],
})
export class AppConfigModule {}
