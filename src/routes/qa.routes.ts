import { Router } from "express";
import { store, QaFlags, SessionPolicy } from "../store/store";

export const qaRouter = Router();

// Auth simple por token (solo para mock)
function requireToken(req: any, res: any, next: any) {
  const h = req.header("Authorization");
  const token = h?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.unauthorized" });

  const session = store.sessionsByToken.get(token);
  if (!session) return res.status(401).json({ errorCode: "UNAUTHORIZED", messageKey: "auth.error.unauthorized" });
  if (session.revoked) return res.status(401).json({ errorCode: "SESSION_REVOKED", messageKey: "auth.error.sessionRevoked" });

  req.token = token;
  next();
}

qaRouter.post("/qa/flags", requireToken, (req: any, res) => {
  const token = req.token as string;
  const body = req.body ?? {};

  const flags: QaFlags = {
    latencyMs: Number(body.latencyMs ?? 0),
    forceError: body.forceError === null || body.forceError === undefined ? null : Number(body.forceError),
    offline: Boolean(body.offline ?? false),
    forceSessionExpiry: Boolean(body.forceSessionExpiry ?? false),
    sessionPolicy: (body.sessionPolicy ?? "single") as SessionPolicy,
  };

  store.qaFlagsByToken.set(token, flags);
  res.json({ flags });
});
