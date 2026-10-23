import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { createDataResponseDto } from "../../../../common/responses/factories/create-data-response.dto";
import { CandidateDto } from "../../../candidates/dtos/get-candidates-response.dto";

@ObjectType()
export class CandidateResultDto extends CandidateDto {
  @Field(() => Int)
  votes!: number;

  @Field(() => Float, { description: "Percentual dos votos (0–100)." })
  percentage!: number;
}

@ObjectType()
export class StateCandidateResultDto {
  @Field()
  slug!: string;

  @Field(() => Int)
  votes!: number;

  @Field(() => Float, { description: "Percentual dos votos do recorte." })
  percentage!: number;
}

@ObjectType()
export class StateResultDto {
  @Field()
  state!: string;

  @Field(() => Int)
  totalVotes!: number;

  @Field(() => [StateCandidateResultDto])
  candidates!: StateCandidateResultDto[];
}

@ObjectType()
export class PollResultsDto {
  @Field(() => Int)
  totalVotes!: number;

  @Field()
  votingOpen!: boolean;

  @Field({
    description:
      "Instante oficial de encerramento (ISO 8601, UTC). Igual para todos os estados.",
  })
  votingClosesAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [CandidateResultDto], {
    description: "Indicados na ordem oficial (alfabética).",
  })
  candidates!: CandidateResultDto[];

  @Field(() => [StateResultDto])
  states!: StateResultDto[];
}

export const PollResultsQueryResponseDto = createDataResponseDto(
  PollResultsDto,
  "PollResultsQueryResponseDto",
);
