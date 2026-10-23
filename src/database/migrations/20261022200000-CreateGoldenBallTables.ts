import { MigrationInterface, QueryRunner } from "typeorm";

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

type Nominee = [
  slug: string,
  name: string,
  fullName: string,
  club: string,
  nationality: string,
  position: string,
  color: string,
];

/**
 * The 30 men's Ballon d'Or 2026 nominees (2025/26 season), as announced by
 * France Football / UEFA. "A / B" clubs mean the player moved from A to B
 * during the season. Listed in the official (alphabetical) order. Photos are
 * served by the frontend from /players/{slug}.jpg (Wikimedia Commons, credited
 * on the site).
 */
const NOMINEES: Nominee[] = [
  [
    "jude-bellingham",
    "Bellingham",
    "Jude Bellingham",
    "Real Madrid",
    "Inglaterra",
    "Meio-campista",
    "#E97E49",
  ],
  [
    "pau-cubarsi",
    "Cubarsí",
    "Pau Cubarsí",
    "Barcelona",
    "Espanha",
    "Zagueiro",
    "#6EEDBD",
  ],
  [
    "marc-cucurella",
    "Cucurella",
    "Marc Cucurella",
    "Chelsea / Real Madrid",
    "Espanha",
    "Lateral",
    "#D62EE5",
  ],
  [
    "ousmane-dembele",
    "Dembélé",
    "Ousmane Dembélé",
    "Paris Saint-Germain",
    "França",
    "Atacante",
    "#C7E949",
  ],
  [
    "luis-diaz",
    "Luis Díaz",
    "Luis Díaz",
    "Bayern de Munique",
    "Colômbia",
    "Atacante",
    "#6EADED",
  ],
  [
    "bruno-fernandes",
    "Bruno Fernandes",
    "Bruno Fernandes",
    "Manchester United",
    "Portugal",
    "Meio-campista",
    "#E52E54",
  ],
  [
    "gabriel-magalhaes",
    "Gabriel",
    "Gabriel Magalhães",
    "Arsenal",
    "Brasil",
    "Zagueiro",
    "#49E957",
  ],
  [
    "erling-haaland",
    "Haaland",
    "Erling Haaland",
    "Manchester City",
    "Noruega",
    "Atacante",
    "#9E6EED",
  ],
  [
    "achraf-hakimi",
    "Hakimi",
    "Achraf Hakimi",
    "Paris Saint-Germain",
    "Marrocos",
    "Lateral",
    "#E5A82E",
  ],
  [
    "harry-kane",
    "Kane",
    "Harry Kane",
    "Bayern de Munique",
    "Inglaterra",
    "Atacante",
    "#49E9E2",
  ],
  [
    "khvicha-kvaratskhelia",
    "Kvaratskhelia",
    "Khvicha Kvaratskhelia",
    "Paris Saint-Germain",
    "Geórgia",
    "Atacante",
    "#ED6ECD",
  ],
  [
    "lamine-yamal",
    "Lamine Yamal",
    "Lamine Yamal",
    "Barcelona",
    "Espanha",
    "Atacante",
    "#82E52E",
  ],
  [
    "sadio-mane",
    "Mané",
    "Sadio Mané",
    "Al-Nassr",
    "Senegal",
    "Atacante",
    "#4964E9",
  ],
  [
    "marquinhos",
    "Marquinhos",
    "Marquinhos",
    "Paris Saint-Germain",
    "Brasil",
    "Zagueiro",
    "#ED7E6E",
  ],
  [
    "lautaro-martinez",
    "Lautaro",
    "Lautaro Martínez",
    "Inter de Milão",
    "Argentina",
    "Atacante",
    "#2EE57B",
  ],
  [
    "kylian-mbappe",
    "Mbappé",
    "Kylian Mbappé",
    "Real Madrid",
    "França",
    "Atacante",
    "#BA49E9",
  ],
  [
    "nuno-mendes",
    "Nuno Mendes",
    "Nuno Mendes",
    "Paris Saint-Germain",
    "Portugal",
    "Lateral",
    "#EDED6E",
  ],
  [
    "lionel-messi",
    "Messi",
    "Lionel Messi",
    "Inter Miami",
    "Argentina",
    "Atacante",
    "#2EAFE5",
  ],
  [
    "joao-neves",
    "João Neves",
    "João Neves",
    "Paris Saint-Germain",
    "Portugal",
    "Meio-campista",
    "#E9498B",
  ],
  [
    "michael-olise",
    "Olise",
    "Michael Olise",
    "Bayern de Munique",
    "França",
    "Atacante",
    "#7DED6E",
  ],
  [
    "willian-pacho",
    "Pacho",
    "Willian Pacho",
    "Paris Saint-Germain",
    "Equador",
    "Zagueiro",
    "#4D2EE5",
  ],
  [
    "julian-quinones",
    "Quiñones",
    "Julián Quiñones",
    "Al-Qadsiah",
    "México",
    "Atacante",
    "#E99349",
  ],
  [
    "declan-rice",
    "Rice",
    "Declan Rice",
    "Arsenal",
    "Inglaterra",
    "Meio-campista",
    "#6EEDCE",
  ],
  [
    "rodri",
    "Rodri",
    "Rodri",
    "Manchester City / Barcelona",
    "Espanha",
    "Meio-campista",
    "#E52EDD",
  ],
  [
    "fabian-ruiz",
    "Fabián Ruiz",
    "Fabián Ruiz",
    "Paris Saint-Germain",
    "Espanha",
    "Meio-campista",
    "#B3E949",
  ],
  [
    "william-saliba",
    "Saliba",
    "William Saliba",
    "Arsenal",
    "França",
    "Zagueiro",
    "#6E9DED",
  ],
  [
    "ferran-torres",
    "Ferran Torres",
    "Ferran Torres",
    "Barcelona / Paris Saint-Germain",
    "Espanha",
    "Atacante",
    "#E52E3D",
  ],
  [
    "dayot-upamecano",
    "Upamecano",
    "Dayot Upamecano",
    "Bayern de Munique",
    "França",
    "Zagueiro",
    "#49E96B",
  ],
  [
    "vinicius-junior",
    "Vini Jr.",
    "Vinícius Júnior",
    "Real Madrid",
    "Brasil",
    "Atacante",
    "#AE6EED",
  ],
  [
    "vitinha",
    "Vitinha",
    "Vitinha",
    "Paris Saint-Germain",
    "Portugal",
    "Meio-campista",
    "#E5C02E",
  ],
];

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`;

export class CreateGoldenBallTables20261022200000 implements MigrationInterface {
  name = "CreateGoldenBallTables20261022200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Ballon d'Or nominees (the ballot options).
    await queryRunner.query(`
      CREATE TABLE "tb_candidates" (
        "idtb_candidates" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(40) NOT NULL,
        "name" varchar(60) NOT NULL,
        "full_name" varchar(120) NOT NULL,
        "photo_url" varchar(255),
        "club" varchar(80) NOT NULL,
        "nationality" varchar(40) NOT NULL,
        "position" varchar(20) NOT NULL,
        "color" varchar(7) NOT NULL,
        "display_order" smallint NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_candidates" PRIMARY KEY ("idtb_candidates"),
        CONSTRAINT "UQ_tb_candidates_slug" UNIQUE ("slug")
      )
    `);

    // Who already voted. Holds only an HMAC of the Google account id — no
    // e-mail, no name — and deliberately has no link to tb_votes (secret ballot).
    await queryRunner.query(`
      CREATE TABLE "tb_voters" (
        "idtb_voters" uuid NOT NULL DEFAULT gen_random_uuid(),
        "voter_hash" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tb_voters" PRIMARY KEY ("idtb_voters"),
        CONSTRAINT "UQ_tb_voters_voter_hash" UNIQUE ("voter_hash")
      )
    `);

    // The ballots. Only the hour is kept so a vote cannot be matched back to
    // a voter row by timestamp.
    await queryRunner.query(`
      CREATE TABLE "tb_votes" (
        "idtb_votes" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idtb_candidates" uuid NOT NULL,
        "state" char(2) NOT NULL,
        "voted_hour" timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
        CONSTRAINT "PK_tb_votes" PRIMARY KEY ("idtb_votes"),
        CONSTRAINT "FK_tb_votes_candidate" FOREIGN KEY ("idtb_candidates")
          REFERENCES "tb_candidates"("idtb_candidates") ON DELETE RESTRICT,
        CONSTRAINT "CHK_tb_votes_state" CHECK ("state" IN (${BRAZILIAN_STATES.map((uf) => `'${uf}'`).join(", ")}))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_votes_candidate_state" ON "tb_votes" ("idtb_candidates", "state")`,
    );

    // Shared rate-limit counters, so limits hold across serverless instances.
    await queryRunner.query(`
      CREATE TABLE "tb_rate_limits" (
        "key" varchar(160) NOT NULL,
        "hits" integer NOT NULL DEFAULT 0,
        "expires_at" timestamptz NOT NULL,
        CONSTRAINT "PK_tb_rate_limits" PRIMARY KEY ("key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_rate_limits_expires_at" ON "tb_rate_limits" ("expires_at")`,
    );

    const values = NOMINEES.map(
      ([slug, name, fullName, club, nationality, position, color], index) =>
        `(${[
          slug,
          name,
          fullName,
          `/players/${slug}.jpg`,
          club,
          nationality,
          position,
          color,
        ]
          .map(sqlString)
          .join(", ")}, ${index + 1})`,
    ).join(",\n        ");

    await queryRunner.query(`
      INSERT INTO "tb_candidates"
        ("slug", "name", "full_name", "photo_url", "club", "nationality", "position", "color", "display_order")
      VALUES
        ${values}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tb_rate_limits"`);
    await queryRunner.query(`DROP TABLE "tb_votes"`);
    await queryRunner.query(`DROP TABLE "tb_voters"`);
    await queryRunner.query(`DROP TABLE "tb_candidates"`);
  }
}
