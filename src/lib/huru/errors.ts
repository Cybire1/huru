import { NextResponse } from "next/server";

type HuruErrorType =
  | "invalid_request"
  | "authentication_error"
  | "permission_error"
  | "rate_limit_error"
  | "billing_error"
  | "provider_error"
  | "internal_error";

export function jsonError(
  status: number,
  type: HuruErrorType,
  code: string,
  message: string,
) {
  return NextResponse.json(
    {
      error: {
        type,
        code,
        message,
      },
    },
    { status },
  );
}

export function jsonErrorWithHeaders(
  status: number,
  type: HuruErrorType,
  code: string,
  message: string,
  headers: Record<string, string>,
) {
  return NextResponse.json(
    {
      error: {
        type,
        code,
        message,
      },
    },
    { status, headers },
  );
}

export function jsonErrorWithBody(
  status: number,
  type: HuruErrorType,
  code: string,
  message: string,
  extra: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: {
        type,
        code,
        message,
        ...extra,
      },
    },
    { status },
  );
}
