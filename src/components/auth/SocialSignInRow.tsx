import React, { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { googleConfigured } from "../GoogleSignInButton";
import { getGoogleAccessToken } from "../../utils/googleBrowserAuth";
import { toast } from "../WonPetsAlert";

const SQUARE = 76; // size of each square button (iOS)
const ICON = 38; // big icon (iOS)

/**
 * Google / Apple buttons, shared by the Login and Register screens.
 *  - iOS:     two icon-only square buttons side by side (Google, Apple).
 *  - Android: a single full-width pill "Continue with Google" with the
 *             multicolor Google logo (Apple sign-in is iOS-only).
 *
 * Visuals live on an inner <View> with static styles (Pressable only handles
 * touches), so styling is applied reliably even when Pressable is wrapped by
 * style interop libraries.
 *
 * `onGoogleToken` receives the Google access token; `onApple` starts the Apple flow.
 */

// Official multicolor Google "G"
function GoogleG({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const cardBase = {
  borderWidth: 1.5,
  borderColor: "#F1E4D8",
  backgroundColor: "#FFFFFF",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: "#C2692A",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

// iOS: icon-only square button
function IconButton({
  icon,
  color,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          ...cardBase,
          width: SQUARE,
          height: SQUARE,
          borderRadius: 20,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        }}
      >
        <Ionicons name={icon} size={ICON} color={color} />
      </View>
    </Pressable>
  );
}

// Android: full-width pill with multicolor G + label
function GooglePillButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      style={{ width: "100%" }}
    >
      <View
        style={{
          ...cardBase,
          width: "100%",
          height: 56,
          borderRadius: 28,
          flexDirection: "row",
          gap: 12,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        }}
      >
        <GoogleG size={24} />
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#0F1B3D" }}>
          Continue with Google
        </Text>
      </View>
    </Pressable>
  );
}

export default function SocialSignInRow({
  onGoogleToken,
  onApple,
  disabled,
}: {
  onGoogleToken: (accessToken: string) => void | Promise<void>;
  onApple: () => void;
  disabled?: boolean;
}) {
  const [opening, setOpening] = useState(false);

  const startGoogle = async () => {
    if (disabled || opening) return;
    if (!googleConfigured) {
      toast.info("Google sign-in isn't configured yet. Add the EXPO_PUBLIC_GOOGLE_* ids in .env.");
      return;
    }
    setOpening(true);
    try {
      const token = await getGoogleAccessToken(); // null = the person closed the browser
      if (token) await onGoogleToken(token);
    } catch (e: any) {
      if (__DEV__) console.log("[GOOGLE] Sign-in error:", e);
      toast.error(e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setOpening(false);
    }
  };

  // Android: Google only, full-width pill with logo + text.
  if (Platform.OS !== "ios") {
    return (
      <View style={{ width: "100%" }}>
        <GooglePillButton onPress={startGoogle} disabled={disabled || opening} />
      </View>
    );
  }

  // iOS: two icon-only squares side by side.
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 18 }}>
      <IconButton
        icon="logo-google"
        color="#EA4335"
        label="Continue with Google"
        onPress={startGoogle}
        disabled={disabled || opening}
      />
      <IconButton
        icon="logo-apple"
        color="#000000"
        label="Continue with Apple"
        onPress={onApple}
        disabled={disabled}
      />
    </View>
  );
}