// LIBS
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";

// MODULES
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);

  const port = app.get(ConfigService).get<number>("PORT") || 4000;

  await app.listen(port);
  console.log(`\n🚀 Servidor rodando em http://localhost:${port}/graphql`);
}

bootstrap();
