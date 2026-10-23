import { DataSource } from "typeorm";
import { config } from "dotenv";
import { join } from "path";
import { MIGRATIONS } from "./migrations";

// Used only by the TypeORM CLI (`npm run migration:*`). The app itself runs
// migrations on boot through DatabaseModule.
config({ path: `.env.${process.env.NODE_ENV || "development"}` });

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === "true",
  entities: [join(__dirname, "../modules/**/*.entity.{ts,js}")],
  migrations: MIGRATIONS,
});
