import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// Postgres returns numeric columns as strings; keep them as numbers here.
const decimal = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/** A nominee's box score in one national-team match. */
@Entity("tb_player_match_stats")
export class PlayerMatchStatsEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_player_match_stats" })
  idPlayerMatchStats!: string;

  @Column({ name: "idtb_candidates", type: "uuid" })
  idCandidates!: string;

  // bigint comes back as a string; match ids fit safely in a JS number.
  @Column({
    name: "provider_match_id",
    type: "bigint",
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  providerMatchId!: number;

  @Column({ name: "competition", type: "varchar", length: 100 })
  competition!: string;

  @Column({ name: "season", type: "varchar", length: 10 })
  season!: string;

  @Column({ name: "round", type: "varchar", length: 60, nullable: true })
  round!: string | null;

  @Column({ name: "played_at", type: "timestamptz" })
  playedAt!: Date;

  @Column({ name: "team", type: "varchar", length: 100 })
  team!: string;

  @Column({ name: "opponent", type: "varchar", length: 100 })
  opponent!: string;

  @Column({ name: "is_home", type: "boolean" })
  isHome!: boolean;

  /** As the provider reports it, home team first ("2 - 1"). */
  @Column({ name: "score", type: "varchar", length: 20, nullable: true })
  score!: string | null;

  @Column({
    name: "result_description",
    type: "varchar",
    length: 60,
    nullable: true,
  })
  resultDescription!: string | null;

  @Column({ name: "position", type: "varchar", length: 30, nullable: true })
  position!: string | null;

  @Column({ name: "is_substitute", type: "boolean", default: false })
  isSubstitute!: boolean;

  @Column({ name: "is_captain", type: "boolean", default: false })
  isCaptain!: boolean;

  @Column({ name: "minutes_played", type: "integer", default: 0 })
  minutesPlayed!: number;

  @Column({
    name: "rating",
    type: "numeric",
    precision: 4,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  rating!: number | null;

  @Column({ name: "goals", type: "integer", default: 0 })
  goals!: number;

  @Column({ name: "assists", type: "integer", default: 0 })
  assists!: number;

  @Column({ name: "shots_total", type: "integer", default: 0 })
  shotsTotal!: number;

  @Column({ name: "shots_on_target", type: "integer", default: 0 })
  shotsOnTarget!: number;

  @Column({ name: "passes_total", type: "integer", default: 0 })
  passesTotal!: number;

  @Column({ name: "passes_successful", type: "integer", default: 0 })
  passesSuccessful!: number;

  @Column({ name: "key_passes", type: "integer", default: 0 })
  keyPasses!: number;

  @Column({ name: "dribbles_total", type: "integer", default: 0 })
  dribblesTotal!: number;

  @Column({ name: "dribbles_successful", type: "integer", default: 0 })
  dribblesSuccessful!: number;

  @Column({ name: "duels_total", type: "integer", default: 0 })
  duelsTotal!: number;

  @Column({ name: "duels_won", type: "integer", default: 0 })
  duelsWon!: number;

  @Column({ name: "tackles", type: "integer", default: 0 })
  tackles!: number;

  @Column({ name: "interceptions", type: "integer", default: 0 })
  interceptions!: number;

  @Column({ name: "fouls_committed", type: "integer", default: 0 })
  foulsCommitted!: number;

  @Column({ name: "fouls_suffered", type: "integer", default: 0 })
  foulsSuffered!: number;

  @Column({ name: "offsides", type: "integer", default: 0 })
  offsides!: number;

  @Column({ name: "yellow_cards", type: "integer", default: 0 })
  yellowCards!: number;

  @Column({ name: "red_cards", type: "integer", default: 0 })
  redCards!: number;

  @Column({ name: "penalties_scored", type: "integer", default: 0 })
  penaltiesScored!: number;

  @Column({ name: "penalties_missed", type: "integer", default: 0 })
  penaltiesMissed!: number;

  @Column({
    name: "expected_goals",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  expectedGoals!: number | null;

  @Column({
    name: "expected_assists",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  expectedAssists!: number | null;

  @Column({ name: "synced_at", type: "timestamptz" })
  syncedAt!: Date;
}
