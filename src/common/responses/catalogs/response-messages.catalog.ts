export const RESPONSE_MESSAGES = {
  auth: {
    signedIn: {
      code: "AUTH_SIGNED_IN",
      message: "Conta Google conectada.",
    },
    currentVoter: {
      code: "AUTH_CURRENT_VOTER",
      message: "Sessão carregada.",
    },
  },
  candidates: {
    listed: {
      code: "CANDIDATES_LISTED",
      message: "Indicados carregados com sucesso.",
    },
  },
  playerStats: {
    leaderboardFetched: {
      code: "PLAYER_STATS_LEADERBOARD_FETCHED",
      message: "Estatísticas dos indicados carregadas com sucesso.",
    },
    nomineeFetched: {
      code: "PLAYER_STATS_NOMINEE_FETCHED",
      message: "Estatísticas do jogador carregadas com sucesso.",
    },
  },
  votes: {
    cast: {
      code: "VOTE_CAST",
      message: "Voto registrado com sucesso. Obrigado por participar!",
    },
    analyticsFetched: {
      code: "POLL_ANALYTICS_FETCHED",
      message: "Análise carregada com sucesso.",
    },
    resultsFetched: {
      code: "POLL_RESULTS_FETCHED",
      message: "Resultados carregados com sucesso.",
    },
  },
} as const;
