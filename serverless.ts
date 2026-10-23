import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { Request, Response } from "express";
import { createServer } from "http";
import { configureApp } from "./src/configure-app";

const expressApp = express();
let server: ReturnType<typeof createServer> | null = null;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ["error", "warn"], bodyParser: false },
  );

  configureApp(app);

  await app.init();
  server = createServer(expressApp);
}

async function handler(req: Request, res: Response): Promise<void> {
  try {
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrap().catch((err) => {
        bootstrapPromise = null;
        throw err;
      });
    }

    await bootstrapPromise;
    server!.emit("request", req, res);
  } catch (err) {
    console.error("Erro ao inicializar NestJS:", err);
    res.statusCode = 500;
    res.end("Erro interno ao iniciar o servidor");
  }
}

module.exports = handler;
