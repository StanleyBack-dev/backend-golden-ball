import { Field, ObjectType } from "@nestjs/graphql";
import { createDataResponseDto } from "../../../../common/responses/factories/create-data-response.dto";

@ObjectType()
export class CastVoteResponseDto {
  @Field()
  registered!: boolean;

  @Field()
  candidateSlug!: string;

  @Field({ description: "Momento do registro, segundo o servidor (ISO 8601)." })
  votedAt!: string;
}

export const CastVoteMutationResponseDto = createDataResponseDto(
  CastVoteResponseDto,
  "CastVoteMutationResponseDto",
);
