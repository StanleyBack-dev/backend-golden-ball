import { HttpException, HttpStatus } from "@nestjs/common";
import { GraphQLFormattedError, GraphQLError } from "graphql";
import { sanitizeSensitiveData } from "../security/sanitize-sensitive-data";
import { isDeployedEnv } from "../../config/environment.util";

const CLIENT_ERROR_CODES = new Set([
  "GRAPHQL_PARSE_FAILED",
  "GRAPHQL_VALIDATION_FAILED",
  "BAD_USER_INPUT",
  "BAD_REQUEST",
  "PERSISTED_QUERY_NOT_FOUND",
  "OPERATION_RESOLUTION_FAILURE",
]);

type ExceptionBody = {
  code?: string;
  details?: unknown;
  error?: string;
  message?: string | string[];
  statusCode?: number;
};

function normalizeHttpException(exception: HttpException) {
  const response = exception.getResponse() as string | ExceptionBody;
  const body = typeof response === "string" ? { message: response } : response;
  const rawMessage = body.message;

  return {
    code:
      body.code ??
      (exception.getStatus() === HttpStatus.BAD_REQUEST
        ? "VALIDATION_ERROR"
        : "HTTP_EXCEPTION"),
    details: sanitizeSensitiveData(body.details ?? null),
    message: Array.isArray(rawMessage)
      ? sanitizeSensitiveData(rawMessage.join(", "))
      : sanitizeSensitiveData(rawMessage ?? "Erro na requisição."),
    statusCode: body.statusCode ?? exception.getStatus(),
  };
}

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const originalError =
    error instanceof GraphQLError ? error.originalError : undefined;

  if (originalError instanceof HttpException) {
    const normalized = normalizeHttpException(originalError);

    return {
      message: normalized.message,
      extensions: {
        code: normalized.code,
        details: normalized.details,
        statusCode: normalized.statusCode,
      },
    };
  }

  const code =
    typeof formattedError.extensions?.code === "string"
      ? formattedError.extensions.code
      : "INTERNAL_SERVER_ERROR";
  const isClientError = CLIENT_ERROR_CODES.has(code);

  if (!isClientError) {
    // Unexpected failures (DB, network...) are logged server-side only; their
    // messages can carry SQL or stack details that must not reach clients.
    console.error(
      "[graphql] unexpected error:",
      sanitizeSensitiveData(formattedError.message),
    );
  }

  return {
    message:
      isClientError || !isDeployedEnv()
        ? sanitizeSensitiveData(formattedError.message)
        : "Erro interno. Tente novamente mais tarde.",
    extensions: {
      code,
      details: null,
      statusCode: isClientError
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR,
    },
  };
}
