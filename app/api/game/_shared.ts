const COOKIE_NAME = "pearling_merdeka_player";
const PLAYER_PATTERN = /^[a-f0-9-]{36}$/i;
const ALLOWED_ORIGINS = new Set([
  "https://pearlinglim.com",
  "https://www.pearlinglim.com",
]);

export function getPlayer(request: Request) {
  const requestedPlayer = new URL(request.url).searchParams.get("player");
  const queryPlayer = requestedPlayer && PLAYER_PATTERN.test(requestedPlayer) ? requestedPlayer : null;
  const cookies = request.headers.get("cookie") ?? "";
  const raw = cookies
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === COOKIE_NAME)?.[1];
  const existing = raw && PLAYER_PATTERN.test(raw) ? raw : null;
  const playerId = queryPlayer ?? existing ?? crypto.randomUUID();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const setCookie = queryPlayer || existing
    ? null
    : `${COOKIE_NAME}=${playerId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;

  return { playerId, setCookie };
}

export function jsonWithPlayer(data: unknown, status: number, setCookie: string | null, request: Request) {
  const headers = new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json",
  });
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  if (setCookie) headers.set("Set-Cookie", setCookie);
  return new Response(JSON.stringify(data), { status, headers });
}

export function normalizeAnswer(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLocaleLowerCase("id-ID").replace(/\s+/g, " ")
    : "";
}
