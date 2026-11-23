import React, { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { BackgroundPaws, BottomHills, Paw, WaveHeader } from "../../components/auth/AuthArt";
import { AUTH } from "../../components/auth/AuthUI";

/**
 * Artwork. The header wave and the bottom hills are SVG (see AuthArt.tsx); only the
 * illustrations below are bitmaps. They are cropped tight, so height follows the aspect ratio.
 */
const IMG = {
  cat: require("../../assets/auth/auth-cat.png"),
  house: require("../../assets/auth/auth-house.png"),
  pets: require("../../assets/auth/auth-pets.png"),
};
const ratio = (src: number) => {
  const a = Image.resolveAssetSource(src);
  return a && a.width && a.height ? a.width / a.height : 2;
};

/** Height of the logo + wordmark + tagline block. */
const BRAND_H = 118;

type Props = {
  /** First (dark) part of the heading, e.g. "Create" */
  lead: string;
  /** Orange part of the heading, e.g. "your account" */
  accent: string;
  subtitle: React.ReactNode;
  /** Bottom illustration */
  art?: "house" | "pets";
  /** Kitten waving in the header (verify screen) */
  cat?: boolean;
  /** Smaller subtitle text (verify screen: the e-mail must fit on one line) */
  smallSubtitle?: boolean;
  /** Bigger heading (welcome back) */
  large?: boolean;
  /** Text row pinned under the illustration, e.g. "Don't have an account? Sign Up" */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export default function AuthLayout({
  lead,
  accent,
  subtitle,
  art,
  cat,
  large,
  smallSubtitle,
  footer,
  children,
}: Props) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // illustration: ~78% of the width, but never taller than a fifth of the screen
  const artW = art ? Math.min(width * 0.78, height * 0.2 * ratio(IMG[art])) : 0;
  const artH = art ? Math.round(artW / ratio(IMG[art])) : 0;

  const catW = Math.round(width * 0.4);
  const catH = Math.round(catW / ratio(IMG.cat));
  const waveH = cat ? 112 : 66;
  const headerH = cat ? BRAND_H + catH - 4 : BRAND_H + 48;

  // hide the bottom illustration while the keyboard is open so it never covers the inputs
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setKb(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF6EE" }}>
      <LinearGradient colors={["#FFF1E4", "#FFF9F3", "#FFF3E8"]} style={StyleSheet.absoluteFill} />
      <BackgroundPaws />

      {/* peach hills along the bottom edge */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, bottom: 0 }}>
        <BottomHills width={width} height={Math.round(width * 0.26)} />
      </View>

      <SafeAreaView edges={["top"]}>
        <View style={{ height: headerH }}>
          {/* orange swoosh, tucked behind the tagline */}
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: BRAND_H - 20 }}>
            <WaveHeader width={width} height={waveH} />
          </View>

          <View style={{ alignItems: "center", paddingTop: 10 }}>
            {/* logo tile */}
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#FF6B00",
                shadowOpacity: 0.18,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 3,
              }}
            >
              <Image
                source={require("../../assets/logo.png")}
                style={{ width: 44, height: 44, borderRadius: 11 }}
                resizeMode="contain"
              />
            </View>

            {/* wordmark */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 26, fontWeight: "800", color: AUTH.ink }}>
                Won Pet
              </Text>
              <View
                style={{
                  marginLeft: 6,
                  backgroundColor: AUTH.orange,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>
                  Pro
                </Text>
              </View>
            </View>
            <Text maxFontSizeMultiplier={1.1} style={{ fontSize: 12, color: AUTH.ink, marginTop: 1 }}>
              Care · Health · Happiness
            </Text>
          </View>

          {/* waving kitten sits on the wave, right side (verify screen) */}
          {cat && (
            <Image
              source={IMG.cat}
              resizeMode="contain"
              style={{ position: "absolute", right: 10, top: BRAND_H - 6, width: catW, height: catH }}
            />
          )}

          {/* back arrow + paw */}
          {/* {navigation.canGoBack() && (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={{ position: "absolute", left: 20, top: 40 }}
            >
              <Ionicons name="arrow-back" size={26} color={AUTH.ink} />
            </Pressable>
          )} */}
          <View pointerEvents="none" style={{ position: "absolute", right: 20, top: 22 }}>
            <Paw size={38} color="#F9A25B" opacity={0.85} rotate={12} />
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingTop: 2,
            paddingBottom: Math.max(insets.bottom, 10) + 6,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              textAlign: "center",
              fontSize: large ? 36 : 30,
              fontWeight: "900",
              color: AUTH.ink,
            }}
          >
            {lead} <Text style={{ color: AUTH.orange }}>{accent}</Text>
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontSize: smallSubtitle ? 13 : 15,
              color: AUTH.ink,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>

          <View style={{ marginTop: 18, gap: 14 }}>{children}</View>

          {/* pushes the illustration + footer to the bottom on tall screens */}
          <View style={{ flex: 1, minHeight: 12 }} />

          {art && !kb && (
            <View pointerEvents="none" style={{ alignItems: "center", marginTop: 8 }}>
              <Image source={IMG[art]} resizeMode="contain" style={{ width: artW, height: artH }} />
            </View>
          )}
          {footer ? <View style={{ alignItems: "center", marginTop: art && !kb ? 6 : 14 }}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
