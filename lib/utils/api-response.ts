import { NextResponse } from "next/server";

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      data,
      message: "Success",
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      error: message,
    },
    { status }
  );
}

/**
 * Create a standardized validation error response
 */
export function validationErrorResponse(errors: Record<string, string>) {
  return NextResponse.json(
    {
      error: "Validation failed",
      errors,
    },
    { status: 400 }
  );
}

/**
 * Create a standardized unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json(
    {
      error: message,
    },
    { status: 401 }
  );
}

/**
 * Create a standardized internal server error response
 */
export function internalServerErrorResponse(message = "Internal server error") {
  return NextResponse.json(
    {
      error: message,
    },
    { status: 500 }
  );
}
