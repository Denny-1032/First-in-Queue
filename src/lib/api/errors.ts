import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function badRequest(message = "Bad request") {
  return new ApiError(400, message, "BAD_REQUEST");
}

export function unauthorized(message = "Unauthorized") {
  return new ApiError(401, message, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return new ApiError(403, message, "FORBIDDEN");
}

export function notFound(message = "Not found") {
  return new ApiError(404, message, "NOT_FOUND");
}

export function tooManyRequests(message = "Too many requests") {
  return new ApiError(429, message, "RATE_LIMITED");
}

export function internal(message = "Internal server error") {
  return new ApiError(500, message, "INTERNAL_ERROR");
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error("[API] Unhandled error:", error);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
