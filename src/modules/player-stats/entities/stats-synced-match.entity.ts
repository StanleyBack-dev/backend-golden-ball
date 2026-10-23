import { Column, Entity, PrimaryColumn } from "typeorm";

/** A finished match whose box score was already read. */
@Entity("tb_stats_synced_matches")
export class StatsSyncedMatchEntity {
  @PrimaryColumn({
    name: "provider_match_id",
    type: "bigint",
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  providerMatchId!: number;

  @Column({ name: "synced_at", type: "timestamptz" })
  syncedAt!: Date;
}
