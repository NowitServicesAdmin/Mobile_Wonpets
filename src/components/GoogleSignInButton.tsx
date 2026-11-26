import React, { useState } from "react";
import { GoogleButton } from "./auth/AuthUI";
import { toast } from "./WonPetsAlert";
import { GOOGLE_WEB_CLIENT_ID, getGoogleAccessToken } from "../utils/googleBrowserAuth";

export const googleConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);

export default function GoogleSignInButton({
  onToken,
  disabled,
}: {
  onToken: (accessToken: string) => void;
  disabled?: boolean;
}) {
  const [opening, setOpening] = useState(false);

  const start = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const token = await getGoogleAccessToken();
      if (token) onToken(token);
    } catch (e: any) {
      if (__DEV__) console.log("[GOOGLE] Sign-in error:", e);
      toast.error(e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setOpening(false);
    }
  };

  return <GoogleButton disabled={disabled || opening || !googleConfigured} onPress={start} />;
}