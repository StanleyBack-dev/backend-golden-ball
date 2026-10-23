import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CandidateEntity } from "./entities/candidate.entity";
import { GetCandidatesService } from "./services/get-candidates.service";
import { GetCandidatesResolver } from "./resolvers/get-candidates.resolver";

@Module({
  imports: [TypeOrmModule.forFeature([CandidateEntity])],
  providers: [GetCandidatesService, GetCandidatesResolver],
  exports: [GetCandidatesService],
})
export class CandidatesModule {}
