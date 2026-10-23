import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import { HttpRequestLike } from "../../../common/request/client-ip.util";
import { hmacSha256 } from "../../../common/security/hmac.util";
import { GoogleProfile } from "./google-token-verifier.service";

const ISSUER = "golden-ball-api";
const AUDIENCE = "golden-ball-bff";

/** Who is signed in. Only `voterHash` is ever stored (in `tb_voters`). */
export interface VoterSession {
  voterHash: string;
  email: string;
  name: string;
  pictureUrl: string | null;
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

/**
 * Stateless voter sessions: a signed JWT the BFF keeps in an httpOnly
 * cookie and forwards as `Authorization: Bearer`. The account id goes in
 * already hashed, so the raw Google id never leaves the sign-in request.
 */
@Injectable()
export class VoterSessionService {
  constructor(private readonly configService: ConfigService) {}

  private get secret(): string {
    return this.configService.get<string>("SESSION_SECRET")!;
  }

  issue(profile: GoogleProfile): IssuedSession {
    const token = jwt.sign(
      {
        email: profile.email,
        name: profile.name,
        picture: profile.pictureUrl,
      },
      this.secret,
      {
        algorithm: "HS256",
        subject: this.hashGoogleId(profile.googleId),
        issuer: ISSUER,
        audience: AUDIENCE,
        expiresIn: this.configService.get<number>("SESSION_TTL_SECONDS")!,
      },
    );
    const { exp } = jwt.decode(token) as { exp: number };

    return { token, expiresAt: new Date(exp * 1000) };
  }

  /** The session carried by `Authorization: Bearer <token>`, if valid. */
  fromRequest(request: HttpRequestLike | undefined): VoterSession | null {
    const header = request?.headers?.authorization;
    const [scheme, token] = (
      (Array.isArray(header) ? header[0] : header) ?? ""
    ).split(" ");

    return scheme === "Bearer" && token ? this.verify(token) : null;
  }

  verify(token: string): VoterSession | null {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
        issuer: ISSUER,
        audience: AUDIENCE,
      });

      if (
        typeof decoded !== "object" ||
        typeof decoded.sub !== "string" ||
        typeof decoded.email !== "string" ||
        typeof decoded.name !== "string"
      ) {
        return null;
      }

      return {
        voterHash: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        pictureUrl:
          typeof decoded.picture === "string" ? decoded.picture : null,
      };
    } catch {
      return null;
    }
  }

  /** HMAC of the Google account id — the only form it is ever stored in. */
  private hashGoogleId(googleId: string): string {
    return hmacSha256(
      this.configService.get<string>("VOTER_HASH_SECRET")!,
      `google:${googleId}`,
    );
  }
}
