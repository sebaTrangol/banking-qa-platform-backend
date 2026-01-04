import { seed } from "./seed";

export type SessionPolicy = "single" | "multi";

export type Session = {
  token: string;
  userId: string;
  expiresAt: string;
  revoked: boolean;
  device?: { platform: "ios" | "android"; id: string };
};

export type QaFlags = {
  latencyMs: number;
  forceError: number | null;
  offline: boolean;
  forceSessionExpiry: boolean;
  sessionPolicy: SessionPolicy;
};

export const store = {
  users: seed.users,
  sessionsByToken: new Map<string, Session>(),
  // flags por token (lo acordado)
  qaFlagsByToken: new Map<string, QaFlags>(),
};
