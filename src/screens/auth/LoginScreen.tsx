import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui";
import IdentifierField from "../../components/IdentifierField";
import GoogleSignInButton, { googleConfigured } from "../../components/GoogleSignInButton";
import { WonPetsAlert, toast } from "../../components/WonPetsAlert";
import { useAuth } from "../../context/AuthContext";
import { COUNTRIES, parseIdentifier } from "../../utils/identifier";
import { authService } from "../../services/auth.service";
import { errorMessage } from "../../services/api";
import AuthLayout from "./AuthLayout";

export default function LoginScreen({ navigation }: any) {
  const { startSession } = useAuth();
  const [value, setValue] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [busy, setBusy] = useState(false);
  const parsed = parseIdentifier(value, country);

  const sendOtp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authService.sendOtp(parsed.value, "login");
      navigation.navigate("Otp", { identifier: parsed.value, kind: parsed.kind, mode: "login" });
    } catch (e) {
      // "User not found. Please signup." etc. come straight from the server
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (accessToken: string) => {
    setBusy(true);
    try {
      const res = await authService.googleLogin(accessToken);
      if (res.isNewUser) {
        // no account yet -> continue to sign-up with the Google details filled in
        navigation.navigate("Register", { google: res.googleProfile });
        return;
      }
      const r = await startSession({ token: res.token, user: res.user });
      if (!r.ok) WonPetsAlert.error("Can't sign in", r.message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back!" subtitle="Sign in to continue">
      <IdentifierField value={value} onChangeText={setValue} country={country} onCountryChange={setCountry} />
      <Button title={busy ? "Sending…" : "Send OTP"} disabled={!parsed.valid || busy} onPress={sendOtp} />
      {googleConfigured ? (
        <GoogleSignInButton onToken={onGoogle} disabled={busy} />
      ) : (
        <Button
          title="Continue with Google"
          variant="neutral"
          icon={<Ionicons name="logo-google" size={18} color="#EA4335" />}
          onPress={() => toast.info("Google sign-in isn't configured yet. Add the EXPO_PUBLIC_GOOGLE_* ids in .env.")}
        />
      )}
      <View className="flex-row justify-center">
        <Text className="text-muted">Don't have an account? </Text>
        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text className="text-primary font-extrabold">Sign Up</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
