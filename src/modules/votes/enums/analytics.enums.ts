import { registerEnumType } from "@nestjs/graphql";

export enum TimelineGranularity {
  HOUR = "HOUR",
  DAY = "DAY",
}

registerEnumType(TimelineGranularity, { name: "TimelineGranularity" });
