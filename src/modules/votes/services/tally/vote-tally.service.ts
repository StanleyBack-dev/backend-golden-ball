import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VoteEntity } from "../../entities/vote.entity";

/** Votes for one candidate within one hour. */
export interface TallyRow {
  idCandidates: string;
  /** Start of the hour bucket, epoch ms. */
  hourMs: number;
  votes: number;
}

interface RawTallyRow {
  idCandidates: string;
  votedHour: Date | string;
  votes: string;
}

/**
 * The one aggregate every read endpoint is built from: vote counts grouped
 * by (candidate, hour). It's small (candidates × hours) and
 * cached briefly per instance, so results and every analytics filter are
 * computed in memory without touching the database again — filters cost
 * nothing and never reach SQL.
 */
@Injectable()
export class VoteTallyService {
  private cache: { rows: TallyRow[]; expiresAt: number } | null = null;
  private inFlight: Promise<TallyRow[]> | null = null;

  constructor(
    @InjectRepository(VoteEntity)
    private readonly votesRepository: Repository<VoteEntity>,
    private readonly configService: ConfigService,
  ) {}

  async rows(): Promise<TallyRow[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.rows;
    }

    // Concurrent cache misses share a single query.
    this.inFlight ??= this.load()
      .then((rows) => {
        const ttlMs =
          this.configService.get<number>("RESULTS_CACHE_TTL_SECONDS")! * 1000;
        this.cache = { rows, expiresAt: Date.now() + ttlMs };
        return rows;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  invalidate() {
    this.cache = null;
  }

  private async load(): Promise<TallyRow[]> {
    const raw = await this.votesRepository
      .createQueryBuilder("vote")
      .select("vote.idCandidates", "idCandidates")
      .addSelect("vote.votedHour", "votedHour")
      .addSelect("COUNT(*)", "votes")
      .groupBy("vote.idCandidates")
      .addGroupBy("vote.votedHour")
      .getRawMany<RawTallyRow>();

    return raw.map((row) => ({
      idCandidates: row.idCandidates,
      hourMs: new Date(row.votedHour).getTime(),
      votes: Number(row.votes),
    }));
  }
}
