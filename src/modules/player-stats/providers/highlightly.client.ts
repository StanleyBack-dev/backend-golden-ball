import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HighlightlyBoxScoreTeam,
  HighlightlyMatch,
  HighlightlyPaginated,
  HighlightlyPlayerStatistics,
} from "./highlightly.types";

const HOST = "football-highlights-api.p.rapidapi.com";
const BASE_URL = `https://${HOST}`;
const REQUEST_TIMEOUT_MS = 15_000;

/** The daily request allowance (or this run's budget) is used up. */
export class StatsQuotaExhaustedError extends Error {
  constructor(message = "Highlightly request budget exhausted.") {
    super(message);
    this.name = "StatsQuotaExhaustedError";
  }
}

/**
 * Highlightly Football API through RapidAPI (free Basic plan: 100 requests
 * a day). Only the sync job calls it — never a user request — and every
 * call counts against a per-run budget so a run can't burn the whole day.
 */
@Injectable()
export class HighlightlyClient {
  private readonly logger = new Logger(HighlightlyClient.name);
  private budget = 0;
  private used = 0;
  /** Provider-reported requests left today, when known. */
  private remaining: number | null = null;

  constructor(private readonly configService: ConfigService) {}

  startRun(budget: number): void {
    this.budget = budget;
    this.used = 0;
    this.remaining = null;
  }

  get requestsUsed(): number {
    return this.used;
  }

  playerStatistics(
    providerPlayerId: number,
  ): Promise<HighlightlyPlayerStatistics[]> {
    return this.get(`/players/${providerPlayerId}/statistics`);
  }

  matches(
    leagueId: number,
    season: string,
    offset: number,
  ): Promise<HighlightlyPaginated<HighlightlyMatch>> {
    return this.get("/matches", {
      leagueId: String(leagueId),
      season,
      limit: "100",
      offset: String(offset),
    });
  }

  boxScore(matchId: number): Promise<HighlightlyBoxScoreTeam[]> {
    return this.get(`/box-score/${matchId}`);
  }

  private async get<T>(
    path: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    if (this.used >= this.budget || this.remaining === 0) {
      throw new StatsQuotaExhaustedError();
    }

    const apiKey = this.configService.get<string>("HIGHLIGHTLY_API_KEY");
    if (!apiKey) {
      throw new Error("HIGHLIGHTLY_API_KEY is not set.");
    }

    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    this.used += 1;
    const response = await fetch(url, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": HOST },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const remaining = Number(
      response.headers.get("x-ratelimit-requests-remaining"),
    );
    if (Number.isFinite(remaining)) {
      this.remaining = remaining;
    }

    if (response.status === 429) {
      throw new StatsQuotaExhaustedError(
        "Highlightly daily request limit reached.",
      );
    }
    if (!response.ok) {
      // Never log the URL with headers; path and status are enough.
      this.logger.warn(`Highlightly ${path} answered ${response.status}`);
      throw new Error(`Highlightly ${path} answered ${response.status}.`);
    }

    return (await response.json()) as T;
  }
}
