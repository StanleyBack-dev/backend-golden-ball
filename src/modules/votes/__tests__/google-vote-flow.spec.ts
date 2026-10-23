import { HttpException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { AppException } from "../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../common/exceptions/app-errors.catalog";
import { VoterSessionService } from "../../auth/services/voter-session.service";
import { CastVoteInputDto } from "../dtos/cast/cast-vote-input.dto";
import { CastVoteService } from "../services/cast/cast-vote.service";
import { VoteRecorderService } from "../services/cast/vote-recorder.service";
import { VoterSessionQueryService } from "../services/session/voter-session-query.service";

const CONFIG: Record<string, unknown> = {
  VOTER_HASH_SECRET: "test-secret-test-secret-test-secret-1234",
  SESSION_SECRET: "test-session-secret-test-session-secret",
  SESSION_TTL_SECONDS: 3600,
};

const PROFILE = {
  googleId: "109876543210987654321",
  email: "torcedor@example.com",
  name: "Torcedor Teste",
  pictureUrl: "https://lh3.googleusercontent.com/a/photo",
};

const candidate = { idCandidates: "cand-1", slug: "vinicius-junior" };
const client = { ip: "1.2.3.4", ipHash: "iphash" };

async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return ((error as HttpException).getResponse() as { code: string }).code;
  }
  throw new Error("expected rejection");
}

function setup() {
  const manager = { insert: jest.fn() };
  const config = { get: jest.fn((key: string) => CONFIG[key]) };
  const deps = {
    dataSource: {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
    },
    votersRepository: { exists: jest.fn().mockResolvedValue(false) },
    candidates: { findBySlug: jest.fn().mockResolvedValue(candidate) },
    captcha: { verify: jest.fn().mockResolvedValue(true) },
    tally: { invalidate: jest.fn() },
    votingWindow: { isOpen: jest.fn().mockReturnValue(true) },
    google: { verify: jest.fn().mockResolvedValue(PROFILE) },
  };

  const sessions = new VoterSessionService(config as never);
  const recorder = new VoteRecorderService(
    deps.dataSource as never,
    deps.votersRepository as never,
    deps.tally as never,
  );
  const castVote = new CastVoteService(
    deps.candidates as never,
    deps.captcha as never,
    deps.votingWindow as never,
    recorder,
  );
  const sessionQueries = new VoterSessionQueryService(
    deps.google as never,
    sessions,
    recorder,
  );

  return { castVote, sessionQueries, sessions, deps, manager };
}

const voteInput = (overrides: Partial<CastVoteInputDto> = {}) =>
  ({
    candidateSlug: "vinicius-junior",
    state: "SP",
    privacyConsent: true,
    ...overrides,
  }) as CastVoteInputDto;

const bearer = (token: string) => ({
  headers: { authorization: `Bearer ${token}` },
});

describe("Google sign-in", () => {
  it("returns a session token and who signed in", async () => {
    const { sessionQueries } = setup();

    const result = await sessionQueries.signIn("google-id-token");

    expect(result.sessionToken).toEqual(expect.any(String));
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(result.voter).toEqual({
      name: PROFILE.name,
      email: PROFILE.email,
      pictureUrl: PROFILE.pictureUrl,
      hasVoted: false,
    });
  });

  it("keeps only a hash of the Google account id in the session", async () => {
    const { sessionQueries, sessions } = setup();

    const { sessionToken } = await sessionQueries.signIn("google-id-token");
    const session = sessions.verify(sessionToken)!;

    expect(session.voterHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionToken).not.toContain(PROFILE.googleId);
  });

  it("reports when the account already voted", async () => {
    const { sessionQueries, deps } = setup();
    deps.votersRepository.exists.mockResolvedValue(true);

    const result = await sessionQueries.signIn("google-id-token");

    expect(result.voter.hasVoted).toBe(true);
  });

  it("propagates an invalid Google token", async () => {
    const { sessionQueries, deps } = setup();
    deps.google.verify.mockRejectedValue(
      AppException.from(APP_ERRORS.auth.googleTokenInvalid, undefined),
    );

    expect(await errorCode(sessionQueries.signIn("bad"))).toBe(
      "AUTH_GOOGLE_TOKEN_INVALID",
    );
  });

  it("reads the session from the Authorization header", async () => {
    const { sessionQueries, sessions } = setup();
    const { sessionToken } = await sessionQueries.signIn("google-id-token");

    expect(sessions.fromRequest(bearer(sessionToken))?.email).toBe(
      PROFILE.email,
    );
    expect(sessions.fromRequest({ headers: {} })).toBeNull();
    expect(sessions.fromRequest(bearer("forged.token.value"))).toBeNull();
    expect(await sessionQueries.current(null)).toBeNull();
  });

  it("rejects a session signed with another secret", async () => {
    const { sessions } = setup();
    const other = new VoterSessionService({
      get: (key: string) =>
        key === "SESSION_SECRET"
          ? "another-secret-another-secret-another"
          : CONFIG[key],
    } as never);

    expect(sessions.verify(other.issue(PROFILE).token)).toBeNull();
  });
});

describe("CastVoteService", () => {
  async function signedIn(ctx: ReturnType<typeof setup>) {
    const { sessionToken } = await ctx.sessionQueries.signIn("google-id-token");
    return ctx.sessions.verify(sessionToken);
  }

  it("records the vote under the account hash only", async () => {
    const ctx = setup();
    const session = await signedIn(ctx);

    const result = await ctx.castVote.execute(voteInput(), session, client);

    expect(result).toMatchObject({
      registered: true,
      candidateSlug: "vinicius-junior",
    });
    expect(ctx.manager.insert).toHaveBeenCalledTimes(2);
    expect(ctx.manager.insert.mock.calls[0][1]).toEqual({
      voterHash: session!.voterHash,
    });
    const written = JSON.stringify(ctx.manager.insert.mock.calls);
    expect(written).not.toContain(PROFILE.email);
    expect(written).not.toContain(PROFILE.googleId);
    expect(ctx.deps.tally.invalidate).toHaveBeenCalled();
  });

  it("requires a signed-in account", async () => {
    const ctx = setup();

    expect(
      await errorCode(ctx.castVote.execute(voteInput(), null, client)),
    ).toBe("AUTH_REQUIRED");
    expect(ctx.manager.insert).not.toHaveBeenCalled();
  });

  it("rejects a second vote from the same account", async () => {
    const ctx = setup();
    const session = await signedIn(ctx);
    ctx.deps.votersRepository.exists.mockResolvedValue(true);

    expect(
      await errorCode(ctx.castVote.execute(voteInput(), session, client)),
    ).toBe("VOTE_ALREADY_CAST");
    expect(ctx.manager.insert).not.toHaveBeenCalled();
  });

  it("maps a unique violation race into VOTE_ALREADY_CAST", async () => {
    const ctx = setup();
    const session = await signedIn(ctx);
    (ctx.deps.dataSource.transaction as jest.Mock).mockRejectedValue(
      new QueryFailedError("insert", [], { code: "23505" } as never),
    );

    expect(
      await errorCode(ctx.castVote.execute(voteInput(), session, client)),
    ).toBe("VOTE_ALREADY_CAST");
  });

  it("rejects failed captcha before touching the registry", async () => {
    const ctx = setup();
    const session = await signedIn(ctx);
    ctx.deps.votersRepository.exists.mockClear();
    ctx.deps.captcha.verify.mockResolvedValue(false);

    expect(
      await errorCode(ctx.castVote.execute(voteInput(), session, client)),
    ).toBe("VOTE_CAPTCHA_FAILED");
    expect(ctx.deps.votersRepository.exists).not.toHaveBeenCalled();
  });

  it("rejects an unknown candidate", async () => {
    const ctx = setup();
    const session = await signedIn(ctx);
    ctx.deps.candidates.findBySlug.mockResolvedValue(null);

    expect(
      await errorCode(ctx.castVote.execute(voteInput(), session, client)),
    ).toBe("VOTE_CANDIDATE_NOT_FOUND");
  });

  it("refuses votes when voting is closed", async () => {
    const ctx = setup();
    const session = await signedIn(ctx);
    ctx.deps.votingWindow.isOpen.mockReturnValue(false);

    expect(
      await errorCode(ctx.castVote.execute(voteInput(), session, client)),
    ).toBe("VOTING_CLOSED");
    expect(ctx.deps.captcha.verify).not.toHaveBeenCalled();
  });
});
