import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Single source of truth for whether votes are accepted: the manual
 * VOTING_OPEN switch AND the official closing instant (VOTING_CLOSES_AT).
 * Comparing absolute instants means time zones never matter here.
 */
@Injectable()
export class VotingWindowService {
  constructor(private readonly configService: ConfigService) {}

  get closesAt(): Date {
    return new Date(this.configService.get<string>("VOTING_CLOSES_AT")!);
  }

  isOpen(now = new Date()): boolean {
    return (
      this.configService.get<boolean>("VOTING_OPEN") === true &&
      now.getTime() < this.closesAt.getTime()
    );
  }
}
