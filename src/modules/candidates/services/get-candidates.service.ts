import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CandidateDto } from "../dtos/get-candidates-response.dto";
import { CandidateEntity } from "../entities/candidate.entity";

@Injectable()
export class GetCandidatesService {
  // Nominees are seeded by migration and never change at runtime.
  private cached: CandidateEntity[] | null = null;

  constructor(
    @InjectRepository(CandidateEntity)
    private readonly candidatesRepository: Repository<CandidateEntity>,
  ) {}

  /** Every nominee, in the official order. */
  async findAll(): Promise<CandidateEntity[]> {
    this.cached ??= await this.candidatesRepository.find({
      order: { displayOrder: "ASC" },
    });
    return this.cached;
  }

  async findBySlug(slug: string): Promise<CandidateEntity | undefined> {
    return (await this.findAll()).find((candidate) => candidate.slug === slug);
  }

  async execute(): Promise<CandidateDto[]> {
    return (await this.findAll()).map(toCandidateDto);
  }
}

export function toCandidateDto(candidate: CandidateEntity): CandidateDto {
  return {
    slug: candidate.slug,
    name: candidate.name,
    fullName: candidate.fullName,
    photoUrl: candidate.photoUrl,
    club: candidate.club,
    nationality: candidate.nationality,
    position: candidate.position,
    color: candidate.color,
  };
}
