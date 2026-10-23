import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { BrazilianRegion } from "../../../../common/constants/brazilian-regions.constant";
import { createDataResponseDto } from "../../../../common/responses/factories/create-data-response.dto";
import { TimelineGranularity } from "../../enums/analytics.enums";
import {
  CandidateResultDto,
  StateCandidateResultDto,
} from "../results/poll-results-response.dto";

@ObjectType()
export class CandidateStatesWonDto {
  @Field()
  slug!: string;

  @Field(() => Int)
  states!: number;
}

@ObjectType()
export class AnalyticsSummaryDto {
  @Field(() => Int)
  totalVotes!: number;

  @Field(() => Int, {
    description: "Votos no Brasil inteiro, no mesmo período.",
  })
  nationalVotes!: number;

  @Field(() => Float, { description: "Peso do recorte no total nacional (%)." })
  shareOfNational!: number;

  @Field(() => String, { nullable: true })
  leaderSlug!: string | null;

  @Field(() => Int)
  marginVotes!: number;

  @Field(() => Float, { description: "Vantagem em pontos percentuais." })
  marginPoints!: number;

  @Field(() => [CandidateStatesWonDto])
  statesWon!: CandidateStatesWonDto[];

  @Field(() => Int)
  tiedStates!: number;

  @Field(() => Int)
  statesWithoutVotes!: number;
}

@ObjectType()
export class RegionAnalyticsDto {
  @Field(() => Int)
  totalVotes!: number;

  @Field(() => BrazilianRegion)
  region!: BrazilianRegion;

  @Field()
  label!: string;

  @Field(() => [StateCandidateResultDto])
  candidates!: StateCandidateResultDto[];

  @Field(() => String, { nullable: true })
  leaderSlug!: string | null;

  @Field(() => Float)
  marginPoints!: number;
}

@ObjectType()
export class StateAnalyticsDto {
  @Field(() => Int)
  totalVotes!: number;

  @Field()
  state!: string;

  @Field(() => BrazilianRegion)
  region!: BrazilianRegion;

  @Field(() => Float, { description: "Peso do estado no recorte (%)." })
  shareOfSlice!: number;

  @Field(() => [StateCandidateResultDto])
  candidates!: StateCandidateResultDto[];

  @Field(() => String, { nullable: true })
  leaderSlug!: string | null;

  @Field(() => Int)
  marginVotes!: number;

  @Field(() => Float)
  marginPoints!: number;
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

  @Field(() => [CandidateResultDto])
  candidates!: CandidateResultDto[];

  @Field(() => [RegionAnalyticsDto])
  regions!: RegionAnalyticsDto[];

  @Field(() => [StateAnalyticsDto])
  states!: StateAnalyticsDto[];

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
