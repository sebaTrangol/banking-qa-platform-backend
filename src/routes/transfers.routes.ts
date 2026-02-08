import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { applyQaFlags } from "../middlewares/qa";
import { normalizeRut } from "../utils/rut";
import { db } from "../db";

export const transfersRouter = Router();

type TransferPayload = {
  fromAccountId?: string;
  toIdentifierType?: "RUT" | "EMAIL";
  toIdentifier?: string;
  toAccountNumber?: string;
  amount?: number;
  comment?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

transfersRouter.post("/transfers", requireAuth, applyQaFlags, (req, res) => {
  const userId = (req as any).auth.userId as string;
  const body: TransferPayload = req.body ?? {};

  const fromAccountId = String(body.fromAccountId ?? "");
  const toIdentifierType = body.toIdentifierType;
  const rawIdentifier = String(body.toIdentifier ?? "");
  const rawToAccountNumber = String(body.toAccountNumber ?? "");
  const amount = Number(body.amount ?? 0);
  const normalizedToAccountNumber = rawToAccountNumber.replace(/\D/g, "");

  if (!fromAccountId || !toIdentifierType || !rawIdentifier || !normalizedToAccountNumber || !Number.isFinite(amount)) {
    return res.status(400).json({ errorCode: "INVALID_REQUEST", messageKey: "common.error.invalidRequest" });
  }

  if (amount <= 0) {
    return res.status(400).json({ errorCode: "INVALID_AMOUNT", messageKey: "transfer.error.invalidAmount" });
  }

  const fromAccount = db
    .prepare(
      "SELECT id, user_id, balance, currency FROM accounts WHERE id = ? AND user_id = ?"
    )
    .get(fromAccountId, userId) as { id: string; user_id: string; balance: number; currency: string } | undefined;
  if (!fromAccount) {
    return res.status(404).json({ errorCode: "ACCOUNT_NOT_FOUND", messageKey: "accounts.error.notFound" });
  }

  if (fromAccount.balance < amount) {
    return res.status(409).json({ errorCode: "INSUFFICIENT_FUNDS", messageKey: "transfer.error.insufficientFunds" });
  }

  const normalizedIdentifier =
    toIdentifierType === "RUT" ? normalizeRut(rawIdentifier) : rawIdentifier.trim().toLowerCase();

  const recipient = db
    .prepare("SELECT id, name, type, identifier FROM users WHERE type = ? AND identifier = ?")
    .get(toIdentifierType, normalizedIdentifier) as
    | { id: string; name: string; type: "RUT" | "EMAIL"; identifier: string }
    | undefined;

  if (!recipient) {
    return res.status(404).json({ errorCode: "RECIPIENT_NOT_FOUND", messageKey: "transfer.error.recipientNotFound" });
  }

  const recipientAccount = db
    .prepare("SELECT id, balance, currency FROM accounts WHERE user_id = ? AND number_masked = ?")
    .get(recipient.id, normalizedToAccountNumber) as { id: string; balance: number; currency: string } | undefined;
  if (!recipientAccount) {
    return res.status(404).json({ errorCode: "RECIPIENT_ACCOUNT_NOT_FOUND", messageKey: "transfer.error.recipientAccountNotFound" });
  }

  const sender = db.prepare("SELECT name FROM users WHERE id = ?").get(userId) as { name: string } | undefined;
  const transferId = createId("trf");
  const createdAt = nowIso();

  const txn = db.transaction(() => {
    const newFromBalance = Math.round((fromAccount.balance - amount) * 100) / 100;
    const newToBalance = Math.round((recipientAccount.balance + amount) * 100) / 100;

    db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newFromBalance, fromAccount.id);
    db.prepare("UPDATE accounts SET balance = ? WHERE id = ?").run(newToBalance, recipientAccount.id);

    db.prepare(
      "INSERT INTO movements (id, account_id, date, description, amount, currency) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(createId("m"), fromAccount.id, createdAt, `Transferencia a ${recipient.name}`, -amount, fromAccount.currency);

    db.prepare(
      "INSERT INTO movements (id, account_id, date, description, amount, currency) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      createId("m"),
      recipientAccount.id,
      createdAt,
      `Transferencia de ${sender?.name ?? "usuario"}`,
      amount,
      recipientAccount.currency
    );

    db.prepare(
      `
      INSERT INTO transfers
        (id, from_account_id, to_user_id, to_account_id, to_identifier_type, to_identifier, amount, currency, comment, created_at)
      VALUES
        (@id, @from_account_id, @to_user_id, @to_account_id, @to_identifier_type, @to_identifier, @amount, @currency, @comment, @created_at)
    `
    ).run({
      id: transferId,
      from_account_id: fromAccount.id,
      to_user_id: recipient.id,
      to_account_id: recipientAccount.id,
      to_identifier_type: toIdentifierType,
      to_identifier: rawIdentifier,
      amount,
      currency: fromAccount.currency,
      comment: body.comment ?? null,
      created_at: createdAt,
    });
  });

  txn();

  return res.status(201).json({
    transfer: {
      id: transferId,
      fromAccountId,
      to: {
        identifierType: toIdentifierType,
        identifier: rawIdentifier,
        accountNumber: normalizedToAccountNumber,
        name: recipient.name,
      },
      amount,
      currency: fromAccount.currency,
      comment: body.comment ?? null,
      createdAt,
    },
  });
});
