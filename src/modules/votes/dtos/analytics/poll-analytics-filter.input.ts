import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsOptional, Matches } from "class-validator";
import { TimelineGranularity } from "../../enums/analytics.enums";

// Explicit offset required: a bare local time would be read in the
// server's zone (UTC on Vercel).
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

@InputType()
export class PollAnalyticsFilterInput {
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

  @Field(() => TimelineGranularity, {
    nullable: true,
    description: "Padrão automático: hora até 72h de período, dia acima disso.",
  })
  @IsOptional()
  @IsEnum(TimelineGranularity)
  granularity?: TimelineGranularity;
}
