import { Field, InputType } from "@nestjs/graphql";
import { Equals, IsOptional, IsString, MaxLength } from "class-validator";

/** The voter's identity comes from the Google session, never from input. */
@InputType()
export class CastVoteInputDto {
  @Field()
  @IsString()
  @MaxLength(40)
  candidateSlug!: string;

  @Field({ description: "Aceite do aviso de privacidade (LGPD)." })
  @Equals(true, { message: "É necessário aceitar o aviso de privacidade." })
  privacyConsent!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;
}
