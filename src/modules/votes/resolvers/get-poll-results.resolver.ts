import { Query, Resolver } from "@nestjs/graphql";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { PollResultsQueryResponseDto } from "../dtos/results/poll-results-response.dto";
import { GetPollResultsService } from "../services/results/get-poll-results.service";

@Resolver()
export class GetPollResultsResolver {
  constructor(private readonly getPollResultsService: GetPollResultsService) {}

  @Query(() => PollResultsQueryResponseDto, { name: "pollResults" })
  async pollResults() {
    const results = await this.getPollResultsService.execute();
    return buildDataResponse(results, RESPONSE_MESSAGES.votes.resultsFetched);
  }
}
