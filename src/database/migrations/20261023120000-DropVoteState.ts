import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The poll no longer asks where the voter lives: drops the state column
 * (its CHECK constraint and index go with it) and indexes the columns the
 * tally groups by instead.
 */
export class DropVoteState20261023120000 implements MigrationInterface {
  name = "DropVoteState20261023120000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tb_votes_candidate_state"`,
    );
    await queryRunner.query(`ALTER TABLE "tb_votes" DROP COLUMN "state"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_votes_candidate_hour" ON "tb_votes" ("idtb_candidates", "voted_hour")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_tb_votes_candidate_hour"`);
    // Past states are gone for good; the column comes back empty.
    await queryRunner.query(
      `ALTER TABLE "tb_votes" ADD COLUMN "state" char(2)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tb_votes_candidate_state" ON "tb_votes" ("idtb_candidates", "state")`,
    );
  }
}
