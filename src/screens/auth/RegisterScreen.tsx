import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AUTH, AuthField, GradientButton } from "../../components/auth/AuthUI";
import IdentifierField from "../../components/IdentifierField";
import { COUNTRIES, parseIdentifier } from "../../utils/identifier";
import { WonPetsAlert, toast } from "../../components/WonPetsAlert";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/auth.service";
import { errorMessage, type ApiError } from "../../services/api";
import { PENDING_DELETION, askToRestore } from "../../utils/restoreAccount";
import { toApiRole } from "../../services/mappers";
import { recordLegalAcceptance } from "../../utils/legalAcceptance";
import AuthLayout from "./AuthLayout";

type Role = "user" | "store_manager" | "doctor";

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
  // set when the user came from "Continue with Google" and has no account yet
  const google = route?.params?.google as { email: string; name: string; picture?: string; googleId: string } | undefined;
  const [name, setName] = useState(google?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(google?.email ?? "");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [role, setRole] = useState<Role | null>(null);
  const [agree, setAgree] = useState(false);

  const parsed = parseIdentifier(value, country);
  const valid =
    name.trim().length > 1 && (!!google || parsed.valid) && !!role && agree;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (google) {
        // Google already verified the e-mail - no OTP step
        const session = await authService.register({
          name: name.trim(),
          identifier: google.email,
          googleId: google.googleId,
          role: toApiRole(role!),
          profileImage: google.picture,
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

  return (
    <AuthLayout
      lead="Create"
      accent="your account"
      subtitle="Sign up to get started with Won Pet Pro"
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
      {google ? (
        <AuthField label="Email" icon="mail-outline" value={google.email} editable={false} />
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
        title={busy ? "Please wait…" : google ? "Create account" : "Sign Up"}
        disabled={!valid || busy}
        onPress={submit}
      />
    </AuthLayout>
  );
}