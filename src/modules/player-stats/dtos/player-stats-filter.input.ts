import { Field, InputType, Int } from "@nestjs/graphql";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  LeaderboardSortField,
  SortOrder,
  StatsScope,
} from "../enums/player-stats.enums";

const POSITIONS = ["Atacante", "Meio-campista", "Lateral", "Zagueiro"];

@InputType()
export class PlayerStatsFilterInput {
  @Field(() => StatsScope, {
    nullable: true,
    description: "Competições consideradas (padrão: todas).",
  })
  @IsOptional()
  @IsEnum(StatsScope)
  scope?: StatsScope;

  @Field({
    nullable: true,
    description: "Somente esta competição (nome exato, ex.: LaLiga).",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  competition?: string;
}

@InputType()
export class PlayerStatsLeaderboardFilterInput extends PlayerStatsFilterInput {
  @Field({ nullable: true, description: "Posição (ex.: Atacante)." })
  @IsOptional()
  @IsIn(POSITIONS, { message: "Posição inválida." })
  position?: string;

  @Field(() => Int, {
    nullable: true,
    description: "Somente jogadores com pelo menos N minutos no recorte.",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  minMinutes?: number;

  @Field(() => LeaderboardSortField, { nullable: true })
  @IsOptional()
  @IsEnum(LeaderboardSortField)
  sortBy?: LeaderboardSortField;

  @Field(() => SortOrder, { nullable: true })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;
}
