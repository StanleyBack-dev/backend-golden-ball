import { Field, InputType, Int } from "@nestjs/graphql";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { BrazilianRegion } from "../../../../common/constants/brazilian-regions.constant";
import { BRAZILIAN_STATES } from "../../../../common/constants/brazilian-states.constant";
import {
  SortOrder,
  StateSortField,
  TimelineGranularity,
} from "../../enums/analytics.enums";

// Explicit offset required: a bare local time would be read in the
// server's zone (UTC on Vercel).
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

@InputType()
export class PollAnalyticsFilterInput {
  @Field(() => BrazilianRegion, { nullable: true })
  @IsOptional()
  @IsEnum(BrazilianRegion)
  region?: BrazilianRegion;

  @Field(() => [String], {
    nullable: true,
    description: "UFs. Combinado com `region`, vale a interseção.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BRAZILIAN_STATES.length)
  @IsIn(BRAZILIAN_STATES, { each: true, message: "Estado inválido." })
  states?: string[];

  @Field({
    nullable: true,
    description: "Início do período (ISO 8601 com fuso).",
  })
  @IsOptional()
  @Matches(ISO_INSTANT, { message: "Data inicial inválida." })
  from?: string;

  @Field({ nullable: true, description: "Fim do período (ISO 8601 com fuso)." })
  @IsOptional()
  @Matches(ISO_INSTANT, { message: "Data final inválida." })
  to?: string;

  @Field({
    nullable: true,
    description: "Somente estados em que este candidato lidera.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  leaderSlug?: string;

  @Field(() => Int, {
    nullable: true,
    description: "Somente estados com pelo menos N votos.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minVotes?: number;

  @Field(() => StateSortField, { nullable: true })
  @IsOptional()
  @IsEnum(StateSortField)
  sortBy?: StateSortField;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortCandidateSlug?: string;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;

  @Field(() => TimelineGranularity, {
    nullable: true,
    description: "Padrão automático: hora até 72h de período, dia acima disso.",
  })
  @IsOptional()
  @IsEnum(TimelineGranularity)
  granularity?: TimelineGranularity;
}
