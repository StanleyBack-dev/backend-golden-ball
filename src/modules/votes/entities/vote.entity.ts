import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CandidateEntity } from "../../candidates/entities/candidate.entity";

@Entity("tb_votes")
export class VoteEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_votes" })
  idVotes!: string;

  @ManyToOne(() => CandidateEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "idtb_candidates" })
  candidate?: CandidateEntity;

  @Column({ name: "idtb_candidates", type: "uuid" })
  idCandidates!: string;

  // Truncated to the hour by the DB default, so it can't be matched to the
  // exact `tb_voters.created_at` of the person who cast it.
  @Column({
    name: "voted_hour",
    type: "timestamptz",
    insert: false,
    update: false,
  })
  votedHour!: Date;
}
