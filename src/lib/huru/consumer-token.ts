import { SignJWT, jwtVerify } from "jose";
import { runtimeConfig } from "@/lib/huru/config";

const TOKEN_PREFIX = "ct_";
const ALGORITHM = "HS256";
const EXPIRY = "24h";

export interface ConsumerTokenPayload {
  /** Consumer public ID (con_...) */
  sub: string;
  /** Project public ID */
  pid: string;
  /** Project storage ID (internal) */
  ppid: string;
  /** Consumer email */
  email: string;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(runtimeConfig.consumerTokenSecret);
}

export async function signConsumerToken(
  payload: ConsumerTokenPayload,
): Promise<string> {
  const jwt = await new SignJWT({
    pid: payload.pid,
    ppid: payload.ppid,
    email: payload.email,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .setIssuer("huru")
    .sign(getSecretKey());

  return `${TOKEN_PREFIX}${jwt}`;
}

export async function verifyConsumerToken(
  token: string,
): Promise<ConsumerTokenPayload | null> {
  if (!isConsumerToken(token)) {
    return null;
  }

  const jwt = token.slice(TOKEN_PREFIX.length);

  try {
    const { payload } = await jwtVerify(jwt, getSecretKey(), {
      issuer: "huru",
      algorithms: [ALGORITHM],
    });

    if (
      !payload.sub ||
      typeof payload.pid !== "string" ||
      typeof payload.ppid !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      pid: payload.pid as string,
      ppid: payload.ppid as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export function isConsumerToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX);
}
