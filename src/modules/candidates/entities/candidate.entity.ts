import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

/** A Ballon d'Or nominee. */
@Entity("tb_candidates")
export class CandidateEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_candidates" })
  idCandidates!: string;

  @Column({ name: "slug", type: "varchar", length: 40, unique: true })
  slug!: string;

  /** Short name as fans know the player ("Vini Jr."). */
  @Column({ name: "name", type: "varchar", length: 60 })
  name!: string;

  @Column({ name: "full_name", type: "varchar", length: 120 })
  fullName!: string;

  /** Optional player photo, relative to the frontend origin. */
  @Column({ name: "photo_url", type: "varchar", length: 255, nullable: true })
  photoUrl!: string | null;

  /** Club(s) during the season; "A / B" when the player moved mid-season. */
  @Column({ name: "club", type: "varchar", length: 80 })
  club!: string;

  @Column({ name: "nationality", type: "varchar", length: 40 })
  nationality!: string;

  @Column({ name: "position", type: "varchar", length: 20 })
  position!: string;

  @Column({ name: "color", type: "varchar", length: 7 })
  color!: string;

  @Column({ name: "display_order", type: "smallint", default: 0 })
  displayOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
