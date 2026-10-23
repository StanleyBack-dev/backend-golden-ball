import { registerEnumType } from "@nestjs/graphql";
import { BrazilianRegion } from "../../../common/constants/brazilian-regions.constant";

export enum StateSortField {
  TOTAL_VOTES = "TOTAL_VOTES",
  STATE = "STATE",
  MARGIN = "MARGIN",
  /** Share of the candidate given in `sortCandidateSlug`. */
  CANDIDATE_SHARE = "CANDIDATE_SHARE",
}

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

export enum TimelineGranularity {
  HOUR = "HOUR",
  DAY = "DAY",
}

registerEnumType(BrazilianRegion, {
  name: "BrazilianRegion",
  description: "Regiões geográficas do IBGE.",
});
registerEnumType(StateSortField, { name: "StateSortField" });
registerEnumType(SortOrder, { name: "SortOrder" });
registerEnumType(TimelineGranularity, { name: "TimelineGranularity" });
