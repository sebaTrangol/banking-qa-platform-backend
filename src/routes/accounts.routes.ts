import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { applyQaFlags } from "../middlewares/qa";
import { db } from "../db";

export const accountsRouter = Router();

accountsRouter.get("/accounts", requireAuth, applyQaFlags, (req, res) => {
  const userId = (req as any).auth.userId as string;
  const accounts = db
    .prepare(
      "SELECT id, type, currency, balance, number_masked as numberMasked FROM accounts WHERE user_id = ?"
    )
    .all(userId);
  return res.status(200).json({ accounts });
});

accountsRouter.get("/accounts/:id/movements", requireAuth, applyQaFlags, (req, res) => {
  const userId = (req as any).auth.userId as string;
  const accountId = String(req.params.id);

  const ownsAccount = db
    .prepare("SELECT 1 FROM accounts WHERE id = ? AND user_id = ?")
    .get(accountId, userId);
  if (!ownsAccount) {
    return res.status(404).json({ errorCode: "ACCOUNT_NOT_FOUND", messageKey: "accounts.error.notFound" });
  }

  const movements = db
    .prepare(
      "SELECT id, date, description, amount, currency FROM movements WHERE account_id = ? ORDER BY date DESC"
    )
    .all(accountId);
  return res.status(200).json({ movements });
});
