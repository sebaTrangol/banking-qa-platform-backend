import { Request, Response, NextFunction } from "express";
import { db } from "../db";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function applyQaFlags(req: Request, res: Response, next: NextFunction) {
  const token = (req as any).auth?.token as string | undefined;
  if (!token) return next();

  const flags = db
    .prepare(
      "SELECT latency_ms, force_error, offline, force_session_expiry, session_policy FROM qa_flags WHERE token = ?"
    )
    .get(token) as
    | {
        latency_ms: number;
        force_error: number | null;
        offline: number;
        force_session_expiry: number;
        session_policy: "single" | "multi";
      }
    | undefined;
  if (!flags) return next();

  if (flags.offline) {
    return res.status(503).json({ errorCode: "OFFLINE", messageKey: "qa.error.offline" });
  }

  if (flags.latency_ms && flags.latency_ms > 0) {
    await delay(flags.latency_ms);
  }

  if (flags.force_session_expiry) {
    return res.status(401).json({ errorCode: "SESSION_EXPIRED", messageKey: "auth.error.sessionExpired" });
  }

  if (flags.force_error !== null && flags.force_error !== undefined) {
    const status = Number(flags.force_error);
    if (Number.isFinite(status) && status >= 400) {
      return res.status(status).json({ errorCode: "FORCED_ERROR", messageKey: "qa.error.forcedError" });
    }
  }

  return next();
}
