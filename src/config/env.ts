export const env = {
    API_BASE_URL: "http://192.168.0.49:4000",
    PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
    JWT_SECRET: process.env.JWT_SECRET ?? "mock-secret",
    TOKEN_TTL_SECONDS: process.env.TOKEN_TTL_SECONDS ? Number(process.env.TOKEN_TTL_SECONDS) : 900
  };
  
  