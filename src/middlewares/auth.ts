import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { db } from "../db";

type JwtPayload = { sub?: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("Authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.missingToken" });
  }

  const token = match[1];

  // 1) firma JWT
  try {
    jwt.verify(token, env.JWT_SECRET);
  } catch {
    return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.invalidToken" });
  }

  // 2) sesión en store (revocado/expirado)
  const session = db
    .prepare("SELECT token, user_id, expires_at, revoked FROM sessions WHERE token = ?")
    .get(token) as { token: string; user_id: string; expires_at: string; revoked: number } | undefined;
  if (!session) {
    return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.sessionNotFound" });
  }

  if (session.revoked) {
    return res.status(401).json({ errorCode: "SESSION_REVOKED", messageKey: "auth.error.sessionRevoked" });
  }

  const expiresAtMs = Date.parse(session.expires_at);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return res.status(401).json({ errorCode: "SESSION_EXPIRED", messageKey: "auth.error.sessionExpired" });
  }

  // inyectar contexto
  (req as any).auth = { token, userId: session.user_id };
  next();
}
