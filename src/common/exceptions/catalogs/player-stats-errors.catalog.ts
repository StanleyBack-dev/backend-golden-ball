import { HttpStatus } from "@nestjs/common";

export const playerStatsErrors = {
  nomineeNotFound: {
    code: "PLAYER_STATS_NOMINEE_NOT_FOUND",
    status: HttpStatus.NOT_FOUND,
    message: "Jogador não encontrado.",
  },
} as const;
