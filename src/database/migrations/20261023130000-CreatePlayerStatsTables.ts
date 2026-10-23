import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Each nominee's id at the stats provider (Highlightly) and the national
 * team name it uses. Ids were resolved by full name, since several players
 * share a short name ("Raphinha", "Luis Díaz").
 */
const PROVIDER_PLAYERS: [slug: string, providerId: number, team: string][] = [
  ["jude-bellingham", 20884752, "England"],
  ["pau-cubarsi", 63856457, "Spain"],
  ["marc-cucurella", 7628334, "Spain"],
  ["ousmane-dembele", 24787, "France"],
  ["luis-diaz", 400883, "Colombia"],
  ["bruno-fernandes", 239239, "Portugal"],
  ["gabriel-magalhaes", 3578218, "Brazil"],
  ["erling-haaland", 177254, "Norway"],
  ["achraf-hakimi", 1603, "Morocco"],
  ["harry-kane", 29778, "England"],
  ["khvicha-kvaratskhelia", 77917, "Georgia"],
  ["lamine-yamal", 62279462, "Spain"],
  ["sadio-mane", 49098, "Senegal"],
  ["marquinhos", 41531, "Brazil"],
  ["lautaro-martinez", 35091, "Argentina"],
  ["kylian-mbappe", 44912, "France"],
  ["nuno-mendes", 42420756, "Portugal"],
  ["lionel-messi", 24948, "Argentina"],
  ["joao-neves", 53943365, "Portugal"],
  ["michael-olise", 3158491, "France"],
  ["willian-pacho", 2635241, "Ecuador"],
  ["julian-quinones", 5720806, "Mexico"],
  ["declan-rice", 473011, "England"],
  ["rodri", 7238, "Spain"],
  ["fabian-ruiz", 52962, "Spain"],
  ["william-saliba", 3556644, "France"],
  ["ferran-torres", 150045, "Spain"],
  ["dayot-upamecano", 185143, "France"],
  ["vinicius-junior", 122836, "Brazil"],
  ["vitinha", 20669978, "Portugal"],
];

export class CreatePlayerStatsTables20261023130000 implements MigrationInterface {
  name = "CreatePlayerStatsTables20261023130000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        ADD COLUMN "stats_provider_id" integer,
        ADD COLUMN "national_team" varchar(60)
    `);
    for (const [slug, providerId, team] of PROVIDER_PLAYERS) {
      await queryRunner.query(
        `UPDATE "tb_candidates" SET "stats_provider_id" = $1, "national_team" = $2 WHERE "slug" = $3`,
        [providerId, team, slug],
      );
    }

    // Season totals per competition and club, as the provider reports them.
    await queryRunner.query(`
      CREATE TABLE "tb_player_competition_stats" (
        "idtb_player_competition_stats" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idtb_candidates" uuid NOT NULL,
        "season" varchar(10) NOT NULL,
        "competition" varchar(100) NOT NULL,
        "competition_type" varchar(40) NOT NULL,
        "club" varchar(100) NOT NULL,
        "games_played" integer NOT NULL DEFAULT 0,
        "minutes_played" integer NOT NULL DEFAULT 0,
        "goals" integer NOT NULL DEFAULT 0,
        "assists" integer NOT NULL DEFAULT 0,
        "penalties_scored" integer NOT NULL DEFAULT 0,
        "own_goals" integer NOT NULL DEFAULT 0,
        "yellow_cards" integer NOT NULL DEFAULT 0,
        "second_yellow_cards" integer NOT NULL DEFAULT 0,
        "red_cards" integer NOT NULL DEFAULT 0,
        "substituted_in" integer NOT NULL DEFAULT 0,
        "substituted_out" integer NOT NULL DEFAULT 0,
        "clean_sheets" integer NOT NULL DEFAULT 0,
        "goals_conceded" integer NOT NULL DEFAULT 0,
        "synced_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_player_competition_stats" PRIMARY KEY ("idtb_player_competition_stats"),
        CONSTRAINT "FK_tb_player_competition_stats_candidate" FOREIGN KEY ("idtb_candidates")
          REFERENCES "tb_candidates"("idtb_candidates") ON DELETE CASCADE,
        CONSTRAINT "UQ_tb_player_competition_stats_row" UNIQUE ("idtb_candidates", "season", "competition", "club")
      )
    `);

    // One row per nominee per national-team match (box score).
    await queryRunner.query(`
      CREATE TABLE "tb_player_match_stats" (
        "idtb_player_match_stats" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idtb_candidates" uuid NOT NULL,
        "provider_match_id" bigint NOT NULL,
        "competition" varchar(100) NOT NULL,
        "season" varchar(10) NOT NULL,
        "round" varchar(60),
        "played_at" timestamptz NOT NULL,
        "team" varchar(100) NOT NULL,
        "opponent" varchar(100) NOT NULL,
        "is_home" boolean NOT NULL,
        "score" varchar(20),
        "result_description" varchar(60),
        "position" varchar(30),
        "is_substitute" boolean NOT NULL DEFAULT false,
        "is_captain" boolean NOT NULL DEFAULT false,
        "minutes_played" integer NOT NULL DEFAULT 0,
        "rating" numeric(4, 2),
        "goals" integer NOT NULL DEFAULT 0,
        "assists" integer NOT NULL DEFAULT 0,
        "shots_total" integer NOT NULL DEFAULT 0,
        "shots_on_target" integer NOT NULL DEFAULT 0,
        "passes_total" integer NOT NULL DEFAULT 0,
        "passes_successful" integer NOT NULL DEFAULT 0,
        "key_passes" integer NOT NULL DEFAULT 0,
        "dribbles_total" integer NOT NULL DEFAULT 0,
        "dribbles_successful" integer NOT NULL DEFAULT 0,
        "duels_total" integer NOT NULL DEFAULT 0,
        "duels_won" integer NOT NULL DEFAULT 0,
        "tackles" integer NOT NULL DEFAULT 0,
        "interceptions" integer NOT NULL DEFAULT 0,
        "fouls_committed" integer NOT NULL DEFAULT 0,
        "fouls_suffered" integer NOT NULL DEFAULT 0,
        "offsides" integer NOT NULL DEFAULT 0,
        "yellow_cards" integer NOT NULL DEFAULT 0,
        "red_cards" integer NOT NULL DEFAULT 0,
        "penalties_scored" integer NOT NULL DEFAULT 0,
        "penalties_missed" integer NOT NULL DEFAULT 0,
        "expected_goals" numeric(5, 2),
        "expected_assists" numeric(5, 2),
        "synced_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_player_match_stats" PRIMARY KEY ("idtb_player_match_stats"),
        CONSTRAINT "FK_tb_player_match_stats_candidate" FOREIGN KEY ("idtb_candidates")
          REFERENCES "tb_candidates"("idtb_candidates") ON DELETE CASCADE,
        CONSTRAINT "UQ_tb_player_match_stats_match" UNIQUE ("idtb_candidates", "provider_match_id")
      )
    `);

    // Finished matches whose box score was already read, so a daily sync
    // never spends quota on the same match twice.
    await queryRunner.query(`
      CREATE TABLE "tb_stats_synced_matches" (
        "provider_match_id" bigint NOT NULL,
        "synced_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_stats_synced_matches" PRIMARY KEY ("provider_match_id")
      )
    `);

    // Audit trail of every sync run; also lets the fallback run skip a day
    // that already succeeded.
    await queryRunner.query(`
      CREATE TABLE "tb_stats_sync_runs" (
        "idtb_stats_sync_runs" uuid NOT NULL DEFAULT gen_random_uuid(),
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "finished_at" timestamptz,
        "status" varchar(20) NOT NULL,
        "requests_used" integer NOT NULL DEFAULT 0,
        "message" varchar(500),
        CONSTRAINT "PK_tb_stats_sync_runs" PRIMARY KEY ("idtb_stats_sync_runs"),
        CONSTRAINT "CHK_tb_stats_sync_runs_status" CHECK ("status" IN ('running', 'success', 'partial', 'failed'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_stats_sync_runs_started_at" ON "tb_stats_sync_runs" ("started_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tb_stats_sync_runs"`);
    await queryRunner.query(`DROP TABLE "tb_stats_synced_matches"`);
    await queryRunner.query(`DROP TABLE "tb_player_match_stats"`);
    await queryRunner.query(`DROP TABLE "tb_player_competition_stats"`);
    await queryRunner.query(`
      ALTER TABLE "tb_candidates"
        DROP COLUMN "national_team",
        DROP COLUMN "stats_provider_id"
    `);
  }
}
