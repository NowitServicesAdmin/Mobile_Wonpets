import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, cn } from "../../components/ui";
import IdentifierField from "../../components/IdentifierField";
import { colors } from "../../theme";
import { COUNTRIES, parseIdentifier } from "../../utils/identifier";
import { WonPetsAlert, toast } from "../../components/WonPetsAlert";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/auth.service";
import { errorMessage } from "../../services/api";
import { toApiGender, toApiRole } from "../../services/mappers";
import AuthLayout from "./AuthLayout";

type Gender = "male" | "female" | "other";
type Role = "user" | "store_manager" | "doctor";

const GENDERS: {
  key: Gender;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "male", label: "Male", icon: "male" },
  { key: "female", label: "Female", icon: "female" },
  { key: "other", label: "Others", icon: "transgender" },
];
const ROLES: {
  key: Role;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "user", label: "User", icon: "person" },
  { key: "store_manager", label: "Store Manager", icon: "storefront" },
  { key: "doctor", label: "Doctor", icon: "medkit" },
];

export default function RegisterScreen({ navigation, route }: any) {
  const { startSession } = useAuth();
  // set when the user came from "Continue with Google" and has no account yet
  const google = route?.params?.google as { email: string; name: string; picture?: string; googleId: string } | undefined;
  const [name, setName] = useState(google?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(google?.email ?? "");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [gender, setGender] = useState<Gender | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [agree, setAgree] = useState(false);

  const parsed = parseIdentifier(value, country);
  const valid =
    name.trim().length > 1 && (!!google || parsed.valid) && !!gender && !!role && agree;

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
          gender: toApiGender(gender!) as any,
          profileImage: google.picture,
        });
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
      navigation.navigate("Otp", {
        identifier: parsed.value,
        kind: parsed.kind,
        mode: "register",
        profile: { name: name.trim(), gender: gender!, role: role! },
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      accent
      title="Create your account"
      subtitle="Sign up to get started"
    >
      <Field
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
        autoCapitalize="words"
      />
      {google ? (
        <Field label="Email" value={google.email} editable={false} />
      ) : (
        <IdentifierField
          value={value}
          onChangeText={setValue}
          country={country}
          onCountryChange={setCountry}
        />
      )}

      <View>
        <Text className="font-bold text-ink mb-1.5">Gender</Text>
        <View className="flex-row gap-3">
          {GENDERS.map((g) => {
            const on = gender === g.key;
            return (
              <Pressable
                key={g.key}
                onPress={() => setGender(g.key)}
                className={cn(
                  "flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl border bg-white",
                  on ? "border-primary bg-primary-soft" : "border-line",
                )}
              >
                <Ionicons
                  name={g.icon}
                  size={17}
                  color={on ? colors.primary : colors.text}
                />
                <Text
                  className={cn(
                    "font-semibold",
                    on ? "text-primary-dark" : "text-ink",
                  )}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text className="font-bold text-ink mb-1.5">Select Role</Text>
        <View className="flex-row gap-3">
          {ROLES.map((r) => {
            const on = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key)}
                className={cn(
                  "flex-1 items-center gap-1.5 py-4 rounded-2xl border bg-white",
                  on ? "border-primary bg-primary-soft" : "border-line",
                )}
              >
                <Ionicons
                  name={r.icon}
                  size={22}
                  color={on ? colors.primary : colors.text}
                />
                <Text
                  className={cn(
                    "text-xs font-bold text-center",
                    on ? "text-primary-dark" : "text-ink",
                  )}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => setAgree(!agree)}
        className="flex-row items-center gap-3"
      >
        <View
          className={cn(
            "w-6 h-6 rounded-md border-[1.5px] items-center justify-center",
            agree ? "bg-primary border-primary" : "bg-white border-muted",
          )}
        >
          {agree && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text className="text-ink">
          I agree to{" "}
          <Text
            className="text-primary font-bold"
            onPress={() =>
              Alert.alert(
                "Terms & Conditions",
                "Link your Terms & Conditions page here.",
              )
            }
          >
            Terms & Conditions
          </Text>
        </Text>
      </Pressable>

      <Button title={busy ? "Please wait…" : google ? "Create account" : "Sign Up"} disabled={!valid || busy} onPress={submit} />

      <View className="flex-row justify-center">
        <Text className="text-muted">Already have an account? </Text>
        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text className="text-primary font-extrabold">Sign In</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
