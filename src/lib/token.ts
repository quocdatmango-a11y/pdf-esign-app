import { randomBytes } from "crypto";

export function generateSignerToken(): string {
  return randomBytes(32).toString("base64url");
}
