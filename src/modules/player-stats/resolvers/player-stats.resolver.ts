import { Args, Query, Resolver } from "@nestjs/graphql";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import {
  PlayerStatsFilterInput,
  PlayerStatsLeaderboardFilterInput,
} from "../dtos/player-stats-filter.input";
import {
  NomineeSeasonStatsQueryResponseDto,
  PlayerStatsLeaderboardQueryResponseDto,
} from "../dtos/player-stats-response.dto";
import { GetPlayerStatsService } from "../services/query/get-player-stats.service";

@Resolver()
export class PlayerStatsResolver {
  constructor(private readonly getPlayerStatsService: GetPlayerStatsService) {}

  @Query(() => PlayerStatsLeaderboardQueryResponseDto, {
    name: "playerStatsLeaderboard",
    description: "Os 30 indicados lado a lado na temporada, com filtros.",
  })
  async playerStatsLeaderboard(
    @Args("filter", { nullable: true })
    filter?: PlayerStatsLeaderboardFilterInput,
  ) {
    const leaderboard = await this.getPlayerStatsService.leaderboard(
      filter ?? {},
    );
    return buildDataResponse(
      leaderboard,
      RESPONSE_MESSAGES.playerStats.leaderboardFetched,
    );
  }

  @Query(() => NomineeSeasonStatsQueryResponseDto, {
    name: "nomineeSeasonStats",
    description: "Temporada completa de um indicado, por competição e jogo.",
  })
  async nomineeSeasonStats(
    @Args("slug") slug: string,
    @Args("filter", { nullable: true }) filter?: PlayerStatsFilterInput,
  ) {
    const stats = await this.getPlayerStatsService.nominee(
      slug.slice(0, 40),
      filter ?? {},
    );
    return buildDataResponse(
      stats,
      RESPONSE_MESSAGES.playerStats.nomineeFetched,
    );
  }
}
