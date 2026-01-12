import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

export const accountsRouter = Router();

accountsRouter.get("/accounts", requireAuth, (req, res) => {
  const userId = (req as any).auth.userId as string;

  // Mock simple: 2 cuentas por usuario
  return res.status(200).json({
    accounts: [
      {
        id: `acc_${userId}_1`,
        type: "checking",
        currency: "CLP",
        balance: 1250000,
        numberMasked: "****1234",
      },
      {
        id: `acc_${userId}_2`,
        type: "savings",
        currency: "CLP",
        balance: 320000,
        numberMasked: "****9876",
      },
    ],
  });
});
