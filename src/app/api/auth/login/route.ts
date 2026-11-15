import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

type AttemptState = {
  failures: number[];
  blockedUntil?: number;
};

type RateLimitStore = Map<string, AttemptState>;

declare global {
  // eslint-disable-next-line no-var
  var __adminLoginRateLimitStore: RateLimitStore | undefined;
}

const store = globalThis.__adminLoginRateLimitStore ?? new Map<string, AttemptState>();
globalThis.__adminLoginRateLimitStore = store;

function clientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getState(key: string, now: number): AttemptState {
  const current = store.get(key) ?? { failures: [] };
  current.failures = current.failures.filter((timestamp) => now - timestamp <= FAILURE_WINDOW_MS);
  if (current.blockedUntil && current.blockedUntil <= now) current.blockedUntil = undefined;
  store.set(key, current);
  return current;
}

function blockedFor(keys: string[], now: number) {
  let blockedUntil = 0;
  for (const key of keys) {
    const state = getState(key, now);
    if (state.blockedUntil && state.blockedUntil > blockedUntil) blockedUntil = state.blockedUntil;
  }
  return blockedUntil;
}

function recordFailure(keys: string[], now: number) {
  let blockedUntil = 0;
  for (const key of keys) {
    const state = getState(key, now);
    state.failures.push(now);
    if (state.failures.length >= MAX_FAILURES) {
      state.blockedUntil = now + BLOCK_MS;
      blockedUntil = Math.max(blockedUntil, state.blockedUntil);
    }
    store.set(key, state);
  }
  return blockedUntil;
}

function clearAttempts(keys: string[]) {
  for (const key of keys) store.delete(key);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ message: "E-mail e senha são obrigatórios." }, { status: 400 });
  }

  const now = Date.now();
  const normalizedEmail = normalizeEmail(email);
  const ip = clientIp(request);
  const keys = [`ip:${ip}`, `email:${normalizedEmail}`];
  const blockedUntil = blockedFor(keys, now);

  if (blockedUntil > now) {
    const retryAfter = Math.max(1, Math.ceil((blockedUntil - now) / 1000));
    return NextResponse.json(
      { message: "Muitas tentativas de acesso. Tente novamente em alguns minutos." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    const newBlockedUntil = recordFailure(keys, now);
    if (newBlockedUntil > now) {
      return NextResponse.json(
        { message: "Muitas tentativas de acesso. Tente novamente em 15 minutos." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(BLOCK_MS / 1000)) } },
      );
    }

    return NextResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
  }

  clearAttempts(keys);
  return NextResponse.json({ ok: true });
}
