import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
// Use your existing API base URL here (no trailing slash)
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

function extractParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parsed = Linking.parse(url);
  for (const [k, v] of Object.entries(parsed.queryParams ?? {})) {
    if (typeof v === "string") out[k] = v;
  }
  const hashIndex = url.indexOf("#");
  if (hashIndex !== -1) {
    for (const pair of url.slice(hashIndex + 1).split("&")) {
      if (!pair) continue;
      const [k, v = ""] = pair.split("=");
      const key = decodeURIComponent(k);
      if (!(key in out)) out[key] = decodeURIComponent(v.replace(/\+/g, " "));
    }
  }
  return out;
}

/** Returns a Google access token, or null if the user cancelled. Throws on real errors. */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error("Google Web Client ID is missing.");

  const returnUrl = Linking.createURL("google-auth");
  const redirectUri = `${API_URL}/auth/google/bounce`;

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=token" +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&state=${encodeURIComponent(returnUrl)}` +
    "&prompt=select_account";

  const captured: { url: string | null } = { url: null };
  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (url.startsWith(returnUrl)) captured.url = url;
  });

  let callbackUrl: string | null = null;
  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl, {
      browserPackage: "com.android.chrome",
      createTask: false,
    });
    callbackUrl = result.type === "success" ? result.url : captured.url;
    if (!callbackUrl) {
      await new Promise((r) => setTimeout(r, 500));
      callbackUrl = captured.url;
    }
  } finally {
    subscription.remove();
  }

  if (!callbackUrl) return null; // cancelled

  const params = extractParams(callbackUrl);
  if (params.error) throw new Error(params.error_description || params.error);
  if (!params.access_token) throw new Error("Google access token not received.");
  return params.access_token;
}