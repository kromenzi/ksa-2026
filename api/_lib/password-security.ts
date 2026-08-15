import { createHash } from "node:crypto";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const MIN_PASSWORD_LENGTH = 12;

function sha1(value: string) {
  return createHash("sha1").update(value, "utf8").digest("hex").toUpperCase();
}

function parsePwnedRange(body: string, suffix: string) {
  const expected = suffix.toUpperCase();
  for (const line of body.split(/\r?\n/)) {
    const [returnedSuffix, countText] = line.trim().split(":");
    if (returnedSuffix?.toUpperCase() === expected) {
      const count = Number.parseInt(countText || "0", 10);
      return Number.isFinite(count) ? count : 0;
    }
  }
  return 0;
}

export type PasswordSecurityResult =
  | { allowed: true; compromised: false; count: number; reason: "ok"; message: string }
  | { allowed: false; compromised: false; count?: 0; reason: "weak"; message: string }
  | { allowed: false; compromised: true; count: number; reason: "compromised"; message: string }
  | { allowed: false; compromised: null; count?: undefined; reason: "security_check_unavailable"; message: string };

export async function checkPasswordSecurity(password: string): Promise<PasswordSecurityResult> {
  if (!password) {
    return {
      allowed: false,
      compromised: false,
      reason: "weak",
      message: "Password is required.",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      allowed: false,
      compromised: false,
      reason: "weak",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    };
  }

  const digest = sha1(password);
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
    headers: {
      "Add-Padding": "true",
      "User-Agent": "ABDULKAREM-BOARD-Password-Security",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      allowed: false,
      compromised: null,
      reason: "security_check_unavailable",
      message: "Password security check is temporarily unavailable. Please try again.",
    };
  }

  const count = parsePwnedRange(await response.text(), suffix);
  const compromised = count > 0;

  if (compromised) {
    return {
      allowed: false,
      compromised: true,
      count,
      reason: "compromised",
      message: "This password has appeared in known data breaches. Choose a different password.",
    };
  }

  return {
    allowed: true,
    compromised: false,
    count,
    reason: "ok",
    message: "Password passed the leak check.",
  };
}

export { MIN_PASSWORD_LENGTH };
