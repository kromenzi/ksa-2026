import { createHash } from "node:crypto";

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const MIN_PASSWORD_LENGTH = 12;

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").json(body);
}

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!password) return json(res, 422, { error: "Password is required" });
    if (password.length < MIN_PASSWORD_LENGTH) {
      return json(res, 200, {
        allowed: false,
        compromised: false,
        reason: "weak",
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      });
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
      console.error("Pwned Passwords lookup failed", response.status);
      return json(res, 503, {
        allowed: false,
        compromised: null,
        reason: "security_check_unavailable",
        message: "Password security check is temporarily unavailable. Please try again.",
      });
    }

    const count = parsePwnedRange(await response.text(), suffix);
    const compromised = count > 0;

    return json(res, 200, {
      allowed: !compromised,
      compromised,
      count,
      reason: compromised ? "compromised" : "ok",
      message: compromised
        ? "This password has appeared in known data breaches. Choose a different password."
        : "Password passed the leak check.",
    });
  } catch (error) {
    console.error("Password security check failed", error);
    return json(res, 503, {
      allowed: false,
      compromised: null,
      reason: "security_check_unavailable",
      message: "Password security check is temporarily unavailable. Please try again.",
    });
  }
}
