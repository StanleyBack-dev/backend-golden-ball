import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { createDataResponseDto } from "../../../common/responses/factories/create-data-response.dto";
import { CandidateDto } from "../../candidates/dtos/get-candidates-response.dto";
import { CompetitionCategory, StatsScope } from "../enums/player-stats.enums";

@ObjectType()
export class StatLineDto {
  @Field(() => Int)
  gamesPlayed!: number;

  @Field(() => Int)
  minutesPlayed!: number;

  @Field(() => Int)
  goals!: number;

  @Field(() => Int)
  assists!: number;

  @Field(() => Int, { description: "Gols + assistências." })
  goalContributions!: number;

  @Field(() => Int)
  penaltiesScored!: number;

  @Field(() => Int)
  yellowCards!: number;

  @Field(() => Int)
  redCards!: number;

  @Field(() => Float, { description: "Gols por 90 minutos." })
  goalsPer90!: number;

  @Field(() => Float, { description: "Gols + assistências por 90 minutos." })
  contributionsPer90!: number;

  @Field(() => Int, { nullable: true, description: "Minutos por gol." })
  minutesPerGoal!: number | null;
}

@ObjectType()
export class CompetitionStatsDto extends StatLineDto {
  @Field()
  competition!: string;

  @Field(() => CompetitionCategory)
  category!: CompetitionCategory;

  @Field({ description: "Clube ou seleção." })
  team!: string;

  @Field()
  season!: string;

  @Field(() => Int)
  substitutedIn!: number;

  @Field(() => Int)
  substitutedOut!: number;

  @Field(() => Float, {
    nullable: true,
    description: "Nota média (só jogos com box score).",
  })
  averageRating!: number | null;
}

@ObjectType()
export class TeamStatsDto extends StatLineDto {
  @Field()
  team!: string;

  @Field({ description: "Seleção (true) ou clube." })
  isNationalTeam!: boolean;
}

@ObjectType()
export class PlayerMatchStatsDto {
  @Field()
  competition!: string;

  @Field(() => String, { nullable: true })
  round!: string | null;

  @Field({ description: "Data da partida (ISO 8601)." })
  playedAt!: string;

  @Field()
  team!: string;

  @Field()
  opponent!: string;

  @Field()
  isHome!: boolean;

  @Field(() => String, {
    nullable: true,
    description: "Placar, mandante primeiro.",
  })
  score!: string | null;

  @Field(() => String, { nullable: true })
  resultDescription!: string | null;

  @Field(() => String, { nullable: true })
  position!: string | null;

  @Field()
  isSubstitute!: boolean;

  @Field()
  isCaptain!: boolean;

  @Field(() => Int)
  minutesPlayed!: number;

  @Field(() => Float, { nullable: true })
  rating!: number | null;

  @Field(() => Int)
  goals!: number;

  @Field(() => Int)
  assists!: number;

  @Field(() => Int)
  shotsTotal!: number;

  @Field(() => Int)
  shotsOnTarget!: number;

  @Field(() => Int)
  passesTotal!: number;

  @Field(() => Int)
  passesSuccessful!: number;

  @Field(() => Int)
  keyPasses!: number;

  @Field(() => Int)
  dribblesTotal!: number;

  @Field(() => Int)
  dribblesSuccessful!: number;

  @Field(() => Int)
  duelsTotal!: number;

  @Field(() => Int)
  duelsWon!: number;

  @Field(() => Int)
  tackles!: number;

  @Field(() => Int)
  interceptions!: number;

  @Field(() => Int)
  foulsCommitted!: number;

  @Field(() => Int)
  foulsSuffered!: number;

  @Field(() => Int)
  yellowCards!: number;

  @Field(() => Int)
  redCards!: number;

  @Field(() => Float, { nullable: true })
  expectedGoals!: number | null;

  @Field(() => Float, { nullable: true })
  expectedAssists!: number | null;
}

@ObjectType()
export class MatchTotalsDto {
  @Field(() => Int)
  matches!: number;

  @Field(() => Float, { nullable: true })
  averageRating!: number | null;

  @Field(() => Int)
  shotsTotal!: number;

  @Field(() => Int)
  shotsOnTarget!: number;

  @Field(() => Int)
  keyPasses!: number;

  @Field(() => Float, { description: "Acerto de passes (%)." })
  passAccuracy!: number;

  @Field(() => Float, { description: "Dribles certos (%)." })
  dribbleSuccess!: number;

  @Field(() => Float, { description: "Duelos ganhos (%)." })
  duelsWonRate!: number;

  @Field(() => Int)
  tackles!: number;

  @Field(() => Int)
  interceptions!: number;
}

@ObjectType()
export class NomineeSeasonStatsDto {
  @Field(() => CandidateDto)
  nominee!: CandidateDto;

  @Field({ description: "Temporada de clubes (ex.: 25/26)." })
  clubSeason!: string;

  @Field(() => StatsScope)
  scope!: StatsScope;

  @Field(() => StatLineDto, { description: "Totais do recorte filtrado." })
  totals!: StatLineDto;

  @Field(() => Float, { nullable: true })
  averageRating!: number | null;

  @Field(() => [CompetitionStatsDto])
  competitions!: CompetitionStatsDto[];

  @Field(() => [TeamStatsDto], { description: "Totais por clube/seleção." })
  teams!: TeamStatsDto[];

  @Field(() => [PlayerMatchStatsDto], {
    description: "Jogos com box score (seleção), do mais recente.",
  })
  matches!: PlayerMatchStatsDto[];

  @Field(() => MatchTotalsDto, {
    nullable: true,
    description: "Números detalhados dos jogos com box score.",
  })
  matchTotals!: MatchTotalsDto | null;

  @Field(() => String, { nullable: true })
  dataUpdatedAt!: string | null;

  @Field({
    description:
      "Falso enquanto a sincronização diária ainda completa os dados.",
  })
  dataComplete!: boolean;
}

@ObjectType()
export class LeaderboardRowDto extends StatLineDto {
  @Field(() => Int)
  rank!: number;

  @Field(() => CandidateDto)
  nominee!: CandidateDto;

  @Field(() => Float, { nullable: true })
  averageRating!: number | null;

  @Field(() => Int, { description: "Competições disputadas no recorte." })
  competitionsPlayed!: number;
}

@ObjectType()
export class CompetitionOptionDto {
  @Field()
  competition!: string;

  @Field(() => CompetitionCategory)
  category!: CompetitionCategory;

  @Field(() => Int, { description: "Indicados que disputaram." })
  nominees!: number;
}

@ObjectType()
export class PlayerStatsLeaderboardDto {
  @Field({ description: "Temporada de clubes (ex.: 25/26)." })
  clubSeason!: string;

  @Field(() => StatsScope)
  scope!: StatsScope;

  @Field(() => [LeaderboardRowDto])
  rows!: LeaderboardRowDto[];

  @Field(() => [CompetitionOptionDto], {
    description: "Competições disponíveis para filtrar.",
  })
  competitions!: CompetitionOptionDto[];

  @Field(() => String, {
    nullable: true,
    description: "Última sincronização com dados (ISO 8601).",
  })
  dataUpdatedAt!: string | null;

  @Field({
    description:
      "Falso enquanto a sincronização diária ainda completa os dados.",
  })
  dataComplete!: boolean;
}

export const PlayerStatsLeaderboardQueryResponseDto = createDataResponseDto(
  PlayerStatsLeaderboardDto,
  "PlayerStatsLeaderboardQueryResponseDto",
);

export const NomineeSeasonStatsQueryResponseDto = createDataResponseDto(
  NomineeSeasonStatsDto,
  "NomineeSeasonStatsQueryResponseDto",
);
