import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { qaRouter } from "./routes/qa.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(authRouter);
app.use(qaRouter);

app.listen(env.PORT, () => {
  console.log(`mock backend running on http://localhost:${env.PORT}`);
});
