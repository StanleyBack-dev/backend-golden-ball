import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { json, NextFunction, Request, Response, urlencoded } from "express";
import helmet from "helmet";
import { isDeployedEnv } from "./config/environment.util";
import { hasValidInternalSecret } from "./common/request/client-ip.util";

/** Shared by the local server (main.ts) and the Vercel handler (serverless.ts). */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  const expressApp = app as NestExpressApplication;

  // Vercel sits in front as a reverse proxy.
  expressApp.set("trust proxy", 1);
  expressApp.disable("x-powered-by");

  app.use(
    helmet({
      // The GraphQL sandbox (dev only) needs inline scripts.
      contentSecurityPolicy: isDeployedEnv() ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Votes are tiny; anything bigger is abuse.
  app.use(json({ limit: "10kb" }));
  app.use(urlencoded({ extended: false, limit: "10kb" }));

  // Once deployed, only the BFF may call the API. Locally the sandbox at
  // /graphql stays reachable without the header.
  if (isDeployedEnv()) {
    const secret = config.get<string>("INTERNAL_API_SECRET");
    app.use("/graphql", (req: Request, res: Response, next: NextFunction) => {
      if (!hasValidInternalSecret(req, secret)) {
        res.status(403).json({ message: "Acesso negado." });
        return;
      }
      next();
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors(config.get("cors"));
}
