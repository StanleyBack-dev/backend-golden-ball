import { CreateGoldenBallTables20261022200000 } from "./20261022200000-CreateGoldenBallTables";

// Explicit list (instead of a glob) so the serverless bundle includes every
// migration. Append new migrations here in chronological order.
export const MIGRATIONS = [CreateGoldenBallTables20261022200000];
