import "server-only";

/** Entrar con Google: flujo "código de autorización" hecho a mano (sin librerías). Variables: GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. */
const clientId = () => (process.env.GOOGLE_CLIENT_ID ?? "").trim();
const clientSecret = () => (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();

export const isGoogleConfigured = (): boolean => Boolean(clientId() && clientSecret());

export function googleAuthUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

export interface GoogleProfile {
  email: string;
  name: string;
  sub: string;
}

/** Cambia el código por los datos del usuario. El id_token llega directo de Google por HTTPS, así que se puede leer sin verificar la firma, pero sí se revisan emisor, audiencia y correo verificado. */
export async function googleProfileFromCode(code: string, redirectUri: string): Promise<GoogleProfile | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id_token?: string };
  const part = data.id_token?.split(".")[1];
  if (!part) return null;
  const c = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    exp?: number;
  };
  const okIss = c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com";
  const verified = c.email_verified === true || c.email_verified === "true";
  if (!okIss || c.aud !== clientId() || !verified || !c.email || !c.sub) return null;
  if (typeof c.exp === "number" && c.exp * 1000 < Date.now()) return null;
  return { email: c.email.toLowerCase(), name: (c.name ?? "").slice(0, 80), sub: c.sub };
}
