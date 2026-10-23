import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { createDataResponseDto } from "../../../../common/responses/factories/create-data-response.dto";
import { TimelineGranularity } from "../../enums/analytics.enums";
import { CandidateResultDto } from "../results/poll-results-response.dto";

@ObjectType()
export class AnalyticsSummaryDto {
  @Field(() => Int, { description: "Votos dentro do período." })
  totalVotes!: number;

  @Field(() => Int, { description: "Votos desde o início da enquete." })
  overallVotes!: number;

  @Field(() => Float, { description: "Peso do período no total (%)." })
  shareOfOverall!: number;

  @Field(() => String, { nullable: true })
  leaderSlug!: string | null;

  @Field(() => Int)
  marginVotes!: number;

  @Field(() => Float, { description: "Vantagem em pontos percentuais." })
  marginPoints!: number;

  @Field(() => Int, { description: "Indicados com pelo menos 1 voto." })
  nomineesWithVotes!: number;
}

@ObjectType()
export class TimelineCandidateDto {
  @Field()
  slug!: string;

  @Field(() => Int, { description: "Votos dentro do intervalo." })
  votes!: number;

  @Field(() => Int)
  cumulativeVotes!: number;

  @Field(() => Float, { description: "Percentual acumulado." })
  cumulativePercentage!: number;
}

@ObjectType()
export class TimelinePointDto {
  @Field({ description: "Início do intervalo (ISO 8601, UTC)." })
  at!: string;

  @Field(() => Int)
  totalVotes!: number;

  @Field(() => Int)
  cumulativeTotal!: number;

  @Field(() => [TimelineCandidateDto])
  candidates!: TimelineCandidateDto[];
}

@ObjectType()
export class PollAnalyticsDto {
  @Field(() => AnalyticsSummaryDto)
  summary!: AnalyticsSummaryDto;

  @Field(() => [CandidateResultDto], {
    description: "Votos e percentuais de cada indicado no período.",
  })
  candidates!: CandidateResultDto[];

  @Field(() => TimelineGranularity)
  granularity!: TimelineGranularity;

  @Field(() => [TimelinePointDto])
  timeline!: TimelinePointDto[];

  @Field()
  updatedAt!: string;
}

export const PollAnalyticsQueryResponseDto = createDataResponseDto(
  PollAnalyticsDto,
  "PollAnalyticsQueryResponseDto",
);
