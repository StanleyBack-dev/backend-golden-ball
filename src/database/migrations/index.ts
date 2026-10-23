import { CreateGoldenBallTables20261022200000 } from "./20261022200000-CreateGoldenBallTables";
import { DropVoteState20261023120000 } from "./20261023120000-DropVoteState";
import { CreatePlayerStatsTables20261023130000 } from "./20261023130000-CreatePlayerStatsTables";

// Explicit list (instead of a glob) so the serverless bundle includes every
// migration. Append new migrations here in chronological order.
export const MIGRATIONS = [
  CreateGoldenBallTables20261022200000,
  DropVoteState20261023120000,
  CreatePlayerStatsTables20261023130000,
];
