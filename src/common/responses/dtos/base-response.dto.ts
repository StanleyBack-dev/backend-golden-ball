import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType({ isAbstract: true })
export abstract class BaseResponseDto {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  code?: string;
}
