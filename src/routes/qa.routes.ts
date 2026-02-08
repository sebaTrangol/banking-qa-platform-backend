import { Router } from "express";
import { db } from "../db";

export const qaRouter = Router();

// Auth simple por token (solo para mock)
function requireToken(req: any, res: any, next: any) {
  const h = req.header("Authorization");
  const token = h?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.unauthorized" });

  const session = db
    .prepare("SELECT token, revoked FROM sessions WHERE token = ?")
    .get(token) as { token: string; revoked: number } | undefined;
  if (!session) return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.unauthorized" });
  if (session.revoked) return res.status(401).json({ errorCode: "SESSION_REVOKED", messageKey: "auth.error.sessionRevoked" });

  req.token = token;
  next();
}

qaRouter.post("/qa/flags", requireToken, (req: any, res) => {
  const token = req.token as string;
  const body = req.body ?? {};

  const flags = {
    latencyMs: Number(body.latencyMs ?? 0),
    forceError: body.forceError === null || body.forceError === undefined ? null : Number(body.forceError),
    offline: Boolean(body.offline ?? false),
    forceSessionExpiry: Boolean(body.forceSessionExpiry ?? false),
    sessionPolicy: (body.sessionPolicy ?? "single") as "single" | "multi",
  };

  db.prepare(
    `
    INSERT INTO qa_flags (token, latency_ms, force_error, offline, force_session_expiry, session_policy)
    VALUES (@token, @latency_ms, @force_error, @offline, @force_session_expiry, @session_policy)
    ON CONFLICT(token) DO UPDATE SET
      latency_ms = excluded.latency_ms,
      force_error = excluded.force_error,
      offline = excluded.offline,
      force_session_expiry = excluded.force_session_expiry,
      session_policy = excluded.session_policy
  `
  ).run({
    token,
    latency_ms: flags.latencyMs,
    force_error: flags.forceError,
    offline: flags.offline ? 1 : 0,
    force_session_expiry: flags.forceSessionExpiry ? 1 : 0,
    session_policy: flags.sessionPolicy,
  });

  res.json({ flags });
});
