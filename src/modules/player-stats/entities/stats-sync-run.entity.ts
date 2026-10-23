import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type StatsSyncStatus = "running" | "success" | "partial" | "failed";

/** One execution of the daily stats sync. */
@Entity("tb_stats_sync_runs")
export class StatsSyncRunEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_stats_sync_runs" })
  idStatsSyncRuns!: string;

  @Column({ name: "started_at", type: "timestamptz" })
  startedAt!: Date;

  @Column({ name: "finished_at", type: "timestamptz", nullable: true })
  finishedAt!: Date | null;

  @Column({ name: "status", type: "varchar", length: 20 })
  status!: StatsSyncStatus;

  @Column({ name: "requests_used", type: "integer", default: 0 })
  requestsUsed!: number;

  @Column({ name: "message", type: "varchar", length: 500, nullable: true })
  message!: string | null;
}
