import { Query, Resolver } from "@nestjs/graphql";
import { RESPONSE_MESSAGES } from "../../../common/responses/catalogs/response-messages.catalog";
import { buildDataResponse } from "../../../common/responses/helpers/response.helper";
import { GetCandidatesQueryResponseDto } from "../dtos/get-candidates-response.dto";
import { GetCandidatesService } from "../services/get-candidates.service";

@Resolver()
export class GetCandidatesResolver {
  constructor(private readonly getCandidatesService: GetCandidatesService) {}

  @Query(() => GetCandidatesQueryResponseDto, { name: "candidates" })
  async candidates() {
    const candidates = await this.getCandidatesService.execute();
    return buildDataResponse(candidates, RESPONSE_MESSAGES.candidates.listed);
  }
}
