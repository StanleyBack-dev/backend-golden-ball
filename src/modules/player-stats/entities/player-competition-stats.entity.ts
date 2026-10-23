import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** A nominee's season totals in one competition, for one club. */
@Entity("tb_player_competition_stats")
export class PlayerCompetitionStatsEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_player_competition_stats" })
  idPlayerCompetitionStats!: string;

  @Column({ name: "idtb_candidates", type: "uuid" })
  idCandidates!: string;

  @Column({ name: "season", type: "varchar", length: 10 })
  season!: string;

  @Column({ name: "competition", type: "varchar", length: 100 })
  competition!: string;

  /** Provider category: "national league", "national cup", ... */
  @Column({ name: "competition_type", type: "varchar", length: 40 })
  competitionType!: string;

  @Column({ name: "club", type: "varchar", length: 100 })
  club!: string;

  @Column({ name: "games_played", type: "integer", default: 0 })
  gamesPlayed!: number;

  @Column({ name: "minutes_played", type: "integer", default: 0 })
  minutesPlayed!: number;

  @Column({ name: "goals", type: "integer", default: 0 })
  goals!: number;

  @Column({ name: "assists", type: "integer", default: 0 })
  assists!: number;

  @Column({ name: "penalties_scored", type: "integer", default: 0 })
  penaltiesScored!: number;

  @Column({ name: "own_goals", type: "integer", default: 0 })
  ownGoals!: number;

  @Column({ name: "yellow_cards", type: "integer", default: 0 })
  yellowCards!: number;

  @Column({ name: "second_yellow_cards", type: "integer", default: 0 })
  secondYellowCards!: number;

  @Column({ name: "red_cards", type: "integer", default: 0 })
  redCards!: number;

  @Column({ name: "substituted_in", type: "integer", default: 0 })
  substitutedIn!: number;

  @Column({ name: "substituted_out", type: "integer", default: 0 })
  substitutedOut!: number;

  @Column({ name: "clean_sheets", type: "integer", default: 0 })
  cleanSheets!: number;

  @Column({ name: "goals_conceded", type: "integer", default: 0 })
  goalsConceded!: number;

  @Column({ name: "synced_at", type: "timestamptz" })
  syncedAt!: Date;
}
