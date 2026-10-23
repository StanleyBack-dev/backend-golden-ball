import { VotingWindowService } from "../services/voting-window.service";

function build(env: Record<string, unknown>) {
  const config = { get: jest.fn((key: string) => env[key]) };
  return new VotingWindowService(config as never);
}

const OFFICIAL_CLOSE = "2026-10-26T17:00:00-03:00";

describe("VotingWindowService", () => {
  const service = build({
    VOTING_OPEN: true,
    VOTING_CLOSES_AT: OFFICIAL_CLOSE,
  });

  it("closes at 17h Brasília = 20:00 UTC on ceremony day", () => {
    expect(service.closesAt.toISOString()).toBe("2026-10-26T20:00:00.000Z");
  });

  it("is open one second before and closed exactly at the deadline", () => {
    expect(service.isOpen(new Date("2026-10-26T19:59:59.999Z"))).toBe(true);
    expect(service.isOpen(new Date("2026-10-26T20:00:00.000Z"))).toBe(false);
  });

  it("closes at the official Brasília instant", () => {
    // 16h in Manaus (UTC-4) and 15h in Rio Branco (UTC-5) are the same instant.
    expect(service.isOpen(new Date("2026-10-26T16:00:00-04:00"))).toBe(false);
    expect(service.isOpen(new Date("2026-10-26T15:00:00-05:00"))).toBe(false);
    expect(service.isOpen(new Date("2026-10-26T14:59:59-05:00"))).toBe(true);
  });

  it("stays closed when the manual switch is off", () => {
    const closed = build({
      VOTING_OPEN: false,
      VOTING_CLOSES_AT: OFFICIAL_CLOSE,
    });
    expect(closed.isOpen(new Date("2026-10-20T12:00:00Z"))).toBe(false);
  });
});
