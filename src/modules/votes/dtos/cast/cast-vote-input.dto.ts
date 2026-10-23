import { Field, InputType } from "@nestjs/graphql";
import { Equals, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { BRAZILIAN_STATES } from "../../../../common/constants/brazilian-states.constant";

/** The voter's identity comes from the Google session, never from input. */
@InputType()
export class CastVoteInputDto {
  @Field()
  @IsString()
  @MaxLength(40)
  candidateSlug!: string;

  @Field()
  @IsIn(BRAZILIAN_STATES, { message: "Estado inválido." })
  state!: string;

  @Field({ description: "Aceite do aviso de privacidade (LGPD)." })
  @Equals(true, { message: "É necessário aceitar o aviso de privacidade." })
  privacyConsent!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;
}
