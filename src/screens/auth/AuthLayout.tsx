import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  title: string;
  subtitle: string;
  accent?: boolean;
  children: React.ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  accent,
  children,
}: Props) {
  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView edges={["top"]} className="items-center py-6">
        <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
          <Image source={require("../../assets/logo.png")} style={{ width: 72, height: 72, borderRadius: 18 }}/>
        </View>
        <Text className="text-white font-black text-xl mt-2 tracking-widest">
          WON PET PRO
        </Text>
      </SafeAreaView>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="bg-cream rounded-t-[32px]"
          contentContainerClassName="p-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className={
              accent
                ? "text-[30px] font-black text-primary"
                : "text-[26px] font-extrabold text-ink"
            }
          >
            {title}
          </Text>
          <Text className="text-base text-muted mt-1">{subtitle}</Text>
          <View className="mt-6 gap-4">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
