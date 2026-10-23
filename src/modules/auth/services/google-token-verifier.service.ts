import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { AppException } from "../../../common/exceptions/app-exception";
import { APP_ERRORS } from "../../../common/exceptions/app-errors.catalog";

export interface GoogleProfile {
  /** Google's stable account id (`sub`); never changes, unlike the e-mail. */
  googleId: string;
  email: string;
  name: string;
  pictureUrl: string | null;
}

/**
 * Verifies a Google ID token server-side: signature, expiry, audience (our
 * client id) and a verified e-mail. Same approach as the followlens project.
 */
@Injectable()
export class GoogleTokenVerifier {
  private client?: OAuth2Client;

  constructor(private readonly configService: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw AppException.from(APP_ERRORS.auth.googleNotConfigured, undefined);
    }

    try {
      const ticket = await this.getClient(clientId).verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw AppException.from(APP_ERRORS.auth.googleTokenInvalid, undefined);
      }
      if (!payload.email_verified) {
        throw AppException.from(
          APP_ERRORS.auth.googleEmailNotVerified,
          undefined,
        );
      }

      return {
        googleId: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: payload.name?.trim() || payload.email,
        pictureUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppException.from(APP_ERRORS.auth.googleTokenInvalid, undefined);
    }
  }

  private getClient(clientId: string): OAuth2Client {
    this.client ??= new OAuth2Client(clientId);
    return this.client;
  }
}
