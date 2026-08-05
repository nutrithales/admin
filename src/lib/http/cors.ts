// Shared CORS allowlist for the public, unauthenticated patient-facing
// endpoints (self-register, forgot-password) called from the static site
// on nutrithales.com.br — a different origin than this Next.js app.

const ALLOWED_ORIGINS = new Set([
  "https://nutrithales.com.br",
  "https://www.nutrithales.com.br",
]);

export function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://nutrithales.com.br";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}
