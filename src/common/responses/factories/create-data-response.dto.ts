import { Type } from "@nestjs/common";
import { Field, ObjectType } from "@nestjs/graphql";
import { BaseResponseDto } from "../dtos/base-response.dto";

export function createDataResponseDto<TData>(
  classRef: Type<TData>,
  name: string,
) {
  @ObjectType(name)
  class DataResponseDto extends BaseResponseDto {
    @Field(() => classRef)
    data!: TData;
  }

  return DataResponseDto;
}
