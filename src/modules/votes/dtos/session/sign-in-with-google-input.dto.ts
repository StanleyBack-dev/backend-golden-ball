import { Field, InputType } from "@nestjs/graphql";
import { IsString, MaxLength, MinLength } from "class-validator";

@InputType()
export class SignInWithGoogleInputDto {
  @Field({
    description: "ID token (credential) devolvido pelo botão do Google.",
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  idToken!: string;
}
