import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { AUTH, GradientButton } from "../../components/auth/AuthUI";
import SocialSignInRow from "../../components/auth/SocialSignInRow";
import IdentifierField from "../../components/IdentifierField";
import { WonPetsAlert, toast } from "../../components/WonPetsAlert";
import { useAuth } from "../../context/AuthContext";
import { COUNTRIES, parseIdentifier } from "../../utils/identifier";
import { authService } from "../../services/auth.service";
import { errorMessage, type ApiError } from "../../services/api";
import { PENDING_DELETION, askToRestore } from "../../utils/restoreAccount";
import AuthLayout from "./AuthLayout";

export default function LoginScreen({ navigation }: any) {
  const { startSession } = useAuth();
  const [value, setValue] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [busy, setBusy] = useState(false);
  const parsed = parseIdentifier(value, country);

  // Dev only: log whether this device reports Apple sign-in as available.
  useEffect(() => {
    if (__DEV__ && Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then((ok) => console.log("[APPLE] available on this device:", ok))
        .catch((err) => console.log("[APPLE] availability check failed:", err));
    }
  }, []);

  const sendOtp = async (restore = false) => {
    if (busy) return;
    setBusy(true);
    try {
      await authService.sendOtp(parsed.value, "login", restore === true);
      navigation.navigate("Otp", { identifier: parsed.value, kind: parsed.kind, mode: "login", restore: restore === true });
    } catch (e) {
      if ((e as ApiError).code === PENDING_DELETION) {
        // deleted less than 90 days ago: ask first - no OTP is sent until they say yes
        setBusy(false);
        const answer = await askToRestore(errorMessage(e));
        if (answer.isConfirmed) await sendOtp(true);
        return;
      }
      // "User not found. Please signup." etc. come straight from the server
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (accessToken: string, restore = false) => {
    setBusy(true);
    try {
      const res = await authService.googleLogin(accessToken, restore === true);
      if (res.isNewUser) {
        // no account yet -> continue to sign-up with the Google details filled in
        navigation.navigate("Register", { google: res.googleProfile });
        return;
      }
      const r = await startSession({ token: res.token, user: res.user });
      if (!r.ok) WonPetsAlert.error("Can't sign in", r.message);
      else if (res.restored) toast.success("Welcome back! Your account has been restored.");
    } catch (e) {
      if ((e as ApiError).code === PENDING_DELETION) {
        setBusy(false);
        const answer = await askToRestore(errorMessage(e));
        if (answer.isConfirmed) await onGoogle(accessToken, true);
        return;
      }
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onApple = async (
    restore = false,
    saved?: AppleAuthentication.AppleAuthenticationCredential
  ) => {
    setBusy(true);
    // Apple only returns name/email on the FIRST sign-in, so keep the credential
    // for the "restore account" retry instead of opening the Apple sheet again.
    let cred = saved;
    try {
      if (!cred) {
        cred = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
      }
      if (!cred.identityToken) throw new Error("Apple sign-in failed. Please try again.");

      const res = await authService.appleLogin(
        {
          identityToken: cred.identityToken,
          email: cred.email ?? undefined,
          fullName: [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" "),
        },
        restore === true
      );
      if (res.isNewUser) {
        // no account yet -> continue to sign-up with the Apple details filled in
        navigation.navigate("Register", { apple: res.appleProfile });
        return;
      }
      const r = await startSession({ token: res.token, user: res.user });
      if (!r.ok) WonPetsAlert.error("Can't sign in", r.message);
      else if (res.restored) toast.success("Welcome back! Your account has been restored.");
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return; // user dismissed the Apple sheet
      if (__DEV__) console.log("[APPLE] sign-in error:", e?.code, e?.message);
      if (
        e?.code === "ERR_REQUEST_UNKNOWN" ||
        e?.code === "ERR_REQUEST_NOT_HANDLED" ||
        e?.code === "ERR_REQUEST_NOT_INTERACTIVE"
      ) {
        toast.error("Apple sign-in couldn't start. Make sure you're signed in to iCloud and that this build has Sign in with Apple enabled.");
        return;
      }
      if ((e as ApiError).code === PENDING_DELETION) {
        setBusy(false);
        const answer = await askToRestore(errorMessage(e));
        if (answer.isConfirmed) await onApple(true, cred);
        return;
      }
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      large
      lead="Welcome"
      accent="back!"
      subtitle={<>Sign in to continue to <Text style={{ fontWeight: "800" }}>Won Pet Pro</Text></>}
      art="house"
      footer={
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: AUTH.ink, fontSize: 15 }}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate("Register")} hitSlop={8}>
            <Text style={{ color: AUTH.orange, fontWeight: "800", fontSize: 15 }}>Sign Up</Text>
          </Pressable>
        </View>
      }
    >
      <IdentifierField value={value} onChangeText={setValue} country={country} onCountryChange={setCountry} />
      <View style={{ marginTop: 10 }}>
        <GradientButton title={busy ? "Sending…" : "Send OTP"} disabled={!parsed.valid || busy} onPress={() => sendOtp()} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, height: 1, backgroundColor: AUTH.border }} />
        <View style={{ marginHorizontal: 10, paddingHorizontal: 12, paddingVertical: 2, borderRadius: 12, backgroundColor: "#FBE9DA" }}>
          <Text style={{ fontSize: 14, color: AUTH.ink }}>or</Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: AUTH.border }} />
      </View>
      <SocialSignInRow onGoogleToken={onGoogle} onApple={() => onApple()} disabled={busy} />
    </AuthLayout>
  );
}