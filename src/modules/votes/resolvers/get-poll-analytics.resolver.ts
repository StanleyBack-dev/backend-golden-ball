import { Args, Query, Resolver } from "@nestjs/graphql";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { PollAnalyticsFilterInput } from "../dtos/analytics/poll-analytics-filter.input";
import { PollAnalyticsQueryResponseDto } from "../dtos/analytics/poll-analytics-response.dto";
import { GetPollAnalyticsService } from "../services/analytics/get-poll-analytics.service";

@Resolver()
export class GetPollAnalyticsResolver {
  constructor(
    private readonly getPollAnalyticsService: GetPollAnalyticsService,
  ) {}

  @Query(() => PollAnalyticsQueryResponseDto, { name: "pollAnalytics" })
  async pollAnalytics(
    @Args("filter", { nullable: true }) filter?: PollAnalyticsFilterInput,
  ) {
    const analytics = await this.getPollAnalyticsService.execute(filter ?? {});
    return buildDataResponse(
      analytics,
      RESPONSE_MESSAGES.votes.analyticsFetched,
    );
  }
}
