import { HttpStatus } from "@nestjs/common";

export const votesErrors = {
  votingClosed: {
    code: "VOTING_CLOSED",
    status: HttpStatus.FORBIDDEN,
    message: "A votação está encerrada.",
  },
  alreadyVoted: {
    code: "VOTE_ALREADY_CAST",
    status: HttpStatus.CONFLICT,
    message: "Esta conta Google já registrou um voto.",
  },
  candidateNotFound: {
    code: "VOTE_CANDIDATE_NOT_FOUND",
    status: HttpStatus.BAD_REQUEST,
    message: "Jogador inválido.",
  },
  invalidPeriod: {
    code: "ANALYTICS_INVALID_PERIOD",
    status: HttpStatus.BAD_REQUEST,
    message: "A data inicial deve ser anterior à data final.",
  },
  captchaFailed: {
    code: "VOTE_CAPTCHA_FAILED",
    status: HttpStatus.BAD_REQUEST,
    message:
      "Falha na verificação anti-robô. Recarregue a página e tente de novo.",
  },
} as const;
