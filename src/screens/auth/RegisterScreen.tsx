import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AUTH, AuthField, GradientButton } from "../../components/auth/AuthUI";
import SocialSignInRow from "../../components/auth/SocialSignInRow";
import IdentifierField from "../../components/IdentifierField";
import { COUNTRIES, parseIdentifier } from "../../utils/identifier";
import { WonPetsAlert, toast } from "../../components/WonPetsAlert";
import { useAuth } from "../../context/AuthContext";
import { authService, type AppleProfile, type GoogleProfile } from "../../services/auth.service";
import { errorMessage, type ApiError } from "../../services/api";
import { PENDING_DELETION, askToRestore } from "../../utils/restoreAccount";
import { toApiRole } from "../../services/mappers";
import { recordLegalAcceptance } from "../../utils/legalAcceptance";
import AuthLayout from "./AuthLayout";

type Role = "user" | "store_manager" | "doctor";

type SocialProfile =
  | { kind: "google"; data: GoogleProfile }
  | { kind: "apple"; data: AppleProfile };

const ROLES: { key: Role; label: string; desc: string }[] = [
  { key: "user", label: "Pet Owner", desc: "Manage and care for your pets" },
  { key: "store_manager", label: "Store Manager", desc: "Manage your pet store and sales" },
  { key: "doctor", label: "Doctor", desc: "Provide pet care and consultations" },
];

const roleIcon = (key: Role, color: string) =>
  key === "user" ? (
    <Ionicons name="person" size={30} color={color} />
  ) : key === "store_manager" ? (
    <MaterialCommunityIcons name="storefront-outline" size={30} color={color} />
  ) : (
    <MaterialCommunityIcons name="stethoscope" size={30} color={color} />
  );

export default function RegisterScreen({ navigation, route }: any) {
  const { startSession } = useAuth();

  // A Google / Apple profile means "this person is verified, finish sign-up".
  // It arrives from the Login screen (route params) or from the buttons on this screen.
  const [profile, setProfile] = useState<SocialProfile | null>(() => {
    const g = route?.params?.google as GoogleProfile | undefined;
    const a = route?.params?.apple as AppleProfile | undefined;
    return g ? { kind: "google", data: g } : a ? { kind: "apple", data: a } : null;
  });
  const google = profile?.kind === "google" ? profile.data : undefined;
  const apple = profile?.kind === "apple" ? profile.data : undefined;
  const social = profile?.data;
  const socialName = profile?.kind === "google" ? "Google" : "Apple";

  const [name, setName] = useState(social?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(social?.email ?? "");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [role, setRole] = useState<Role | null>(null);
  const [agree, setAgree] = useState(false);

  // Dev only: log whether this device reports Apple sign-in as available.
  useEffect(() => {
    if (__DEV__ && Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then((ok) => console.log("[APPLE] available on this device:", ok))
        .catch((err) => console.log("[APPLE] availability check failed:", err));
    }
  }, []);

  const parsed = parseIdentifier(value, country);
  const valid =
    name.trim().length > 1 && (!!social || parsed.valid) && !!role && agree;

  /* ----------------------- Google / Apple from this screen ----------------------- */
  // Same calls as the Login screen. A NEW person gets their details filled in here and
  // then picks a role; someone who already has an account is simply signed in.

  const finishExisting = async (res: { token: string; user: any; restored?: boolean }) => {
    const r = await startSession({ token: res.token, user: res.user });
    if (!r.ok) WonPetsAlert.error("Can't sign in", r.message);
    else if (res.restored) toast.success("Welcome back! Your account has been restored.");
    else toast.info("You already have an account, so we signed you in.");
  };

  const onGoogle = async (accessToken: string, restore = false) => {
    setBusy(true);
    try {
      const res = await authService.googleLogin(accessToken, restore === true);
      if (res.isNewUser) {
        setProfile({ kind: "google", data: res.googleProfile });
        setName((prev) => prev || res.googleProfile.name || "");
        return;
      }
      await finishExisting(res);
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
        setProfile({ kind: "apple", data: res.appleProfile });
        setName((prev) => prev || res.appleProfile.name || "");
        return;
      }
      await finishExisting(res);
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

  /* --------------------------------- create account -------------------------------- */

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (social) {
        // Google / Apple already verified the e-mail - no OTP step.
        // The server takes the e-mail from the signed token, so only the token is sent.
        const session = await authService.register({
          name: name.trim(),
          role: toApiRole(role!),
          ...(google
            ? { googleSignupToken: google.signupToken, profileImage: google.picture }
            : { appleSignupToken: apple!.signupToken }),
        });
        await recordLegalAcceptance(); // which Terms / Privacy / Refund versions they agreed to
        if (role === "user") {
          const r = await startSession(session);
          if (!r.ok) WonPetsAlert.error("Can't sign in", r.message);
        } else {
          WonPetsAlert.success("Account created", "Doctor and store manager accounts need approval from WON PET before they can be used. Please use the web portal to finish your profile.");
          navigation.navigate("Login");
        }
        return;
      }
      await authService.sendOtp(parsed.value, "signup"); // fails if the account already exists
      await recordLegalAcceptance(); // which Terms / Privacy / Refund versions they agreed to
      navigation.navigate("Otp", {
        identifier: parsed.value,
        kind: parsed.kind,
        mode: "register",
        profile: { name: name.trim(), role: role! },
      });
    } catch (e) {
      // The signed Google / Apple token only lasts 30 minutes.
      const status = (e as any)?.status ?? (e as any)?.response?.status;
      if (social && status === 401) {
        toast.error(`Your ${socialName} sign-up expired. Please sign in with ${socialName} again.`);
        setProfile(null); // back to the normal form so they can tap the button again
        return;
      }
      if ((e as ApiError).code === PENDING_DELETION) {
        // this email / number belongs to an account deleted < 90 days ago: offer to restore it
        setBusy(false);
        const answer = await askToRestore(errorMessage(e));
        if (answer.isConfirmed) {
          try {
            setBusy(true);
            await authService.sendOtp(parsed.value, "login", true);
            navigation.navigate("Otp", { identifier: parsed.value, kind: parsed.kind, mode: "login", restore: true });
          } catch (e2) {
            toast.error(errorMessage(e2));
          } finally {
            setBusy(false);
          }
        }
        return;
      }
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const showSocialButtons = !social;

  return (
    <AuthLayout
      lead="Create"
      accent="your account"
      subtitle={
        social
          ? `Almost done! Finish setting up your account with ${socialName}.`
          : "Sign up to get started with Won Pet Pro"
      }
      footer={
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: AUTH.ink, fontSize: 15 }}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate("Login")} hitSlop={8}>
            <Text style={{ color: AUTH.orange, fontWeight: "800", fontSize: 15 }}>Sign In</Text>
          </Pressable>
        </View>
      }
    >
      <AuthField
        label="Full Name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
        autoCapitalize="words"
      />
      {social ? (
        <AuthField label="Email" icon="mail-outline" value={social.email} editable={false} />
      ) : (
        <IdentifierField
          value={value}
          onChangeText={setValue}
          country={country}
          onCountryChange={setCountry}
        />
      )}

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 2 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: AUTH.border }} />
          <Text style={{ marginHorizontal: 14, fontSize: 17, fontWeight: "800", color: AUTH.ink }}>Sign up as</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: AUTH.border }} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {ROLES.map((r) => {
            const on = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key)}
                style={{
                  flex: 1,
                  minHeight: 128,
                  paddingVertical: 10,
                  paddingHorizontal: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: on ? AUTH.orange : "#E9E1DA",
                  backgroundColor: on ? "#FFF3E8" : "rgba(255,255,255,0.85)",
                }}
              >
                {roleIcon(r.key, on ? AUTH.orange : AUTH.ink)}
                <Text style={{ fontSize: 12.5, fontWeight: "800", color: AUTH.ink, textAlign: "center" }}>{r.label}</Text>
                <Text style={{ fontSize: 10, lineHeight: 13, color: "#6B7280", textAlign: "center" }}>{r.desc}</Text>
                {on && (
                  <View
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -4,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: AUTH.orange,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark" size={15} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => setAgree(!agree)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: AUTH.orange,
            backgroundColor: agree ? AUTH.orange : "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {agree && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={{ color: AUTH.ink, fontSize: 15 }}>
          I agree to the{" "}
          <Text
            style={{ color: AUTH.orange, fontWeight: "800" }}
            onPress={() => navigation.navigate("Legal", { doc: "terms" })}
          >
            Terms & Conditions
          </Text>
          ,{" "}
          <Text
            style={{ color: AUTH.orange, fontWeight: "800" }}
            onPress={() => navigation.navigate("Legal", { doc: "privacy" })}
          >
            Privacy Policy
          </Text>
          {" "}and{" "}
          <Text
            style={{ color: AUTH.orange, fontWeight: "800" }}
            onPress={() => navigation.navigate("Legal", { doc: "refund" })}
          >
            Refund Policy
          </Text>
        </Text>
      </Pressable>

      <GradientButton
        title={busy ? "Please wait…" : social ? "Create account" : "Sign Up"}
        disabled={!valid || busy}
        onPress={submit}
      />

      {/* GOOGLE / APPLE SIGN UP - hidden once a profile is already verified */}
      {showSocialButtons && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, height: 1, backgroundColor: AUTH.border }} />
            <View style={{ marginHorizontal: 10, paddingHorizontal: 12, paddingVertical: 2, borderRadius: 12, backgroundColor: "#FBE9DA" }}>
              <Text style={{ fontSize: 14, color: AUTH.ink }}>or sign up with</Text>
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: AUTH.border }} />
          </View>
          <SocialSignInRow onGoogleToken={onGoogle} onApple={() => onApple()} disabled={busy} />
        </>
      )}
    </AuthLayout>
  );
}