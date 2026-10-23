import { Field, ObjectType } from "@nestjs/graphql";
import { BaseResponseDto } from "../../../common/responses/dtos/base-response.dto";

@ObjectType()
export class CandidateDto {
  @Field()
  slug!: string;

  @Field({ description: "Nome pelo qual o jogador é conhecido." })
  name!: string;

  @Field({ description: "Nome completo do jogador." })
  fullName!: string;

  @Field(() => String, { nullable: true, description: "Foto do jogador." })
  photoUrl!: string | null;

  @Field({ description: "Clube(s) na temporada." })
  club!: string;

  @Field({ description: "Seleção." })
  nationality!: string;

  @Field({ description: "Posição em campo." })
  position!: string;

  @Field()
  color!: string;
}

@ObjectType()
export class GetCandidatesQueryResponseDto extends BaseResponseDto {
  @Field(() => [CandidateDto])
  data!: CandidateDto[];
}
