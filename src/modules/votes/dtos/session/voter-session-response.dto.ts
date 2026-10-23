import { Field, ObjectType } from "@nestjs/graphql";
import { BaseResponseDto } from "../../../../common/responses/dtos/base-response.dto";
import { createDataResponseDto } from "../../../../common/responses/factories/create-data-response.dto";

/** Shown in the vote form ("votando como ..."); never stored. */
@ObjectType()
export class VoterDto {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  pictureUrl!: string | null;

  @Field({ description: "Se esta conta já registrou um voto." })
  hasVoted!: boolean;
}

@ObjectType()
export class SignInWithGoogleResponseDto {
  @Field({ description: "Sessão; o BFF a guarda num cookie httpOnly." })
  sessionToken!: string;

  @Field({ description: "Expiração da sessão (ISO 8601)." })
  expiresAt!: string;

  @Field(() => VoterDto)
  voter!: VoterDto;
}

export const SignInWithGoogleMutationResponseDto = createDataResponseDto(
  SignInWithGoogleResponseDto,
  "SignInWithGoogleMutationResponseDto",
);

@ObjectType("CurrentVoterQueryResponseDto")
export class CurrentVoterQueryResponseDto extends BaseResponseDto {
  @Field(() => VoterDto, {
    nullable: true,
    description: "Nulo quando não há sessão válida.",
  })
  data!: VoterDto | null;
}
