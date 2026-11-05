import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { Card, SectionHeader, cn } from "../ui";

const quick = [
  {
    label: "Book Appointment",
    icon: "calendar-outline",
    box: "bg-orange-200",
    fg: colors.primaryDark,
    text: "text-primary-dark",
    go: "BookAppointment",
  },
  {
    label: "Buy Products",
    icon: "bag-handle-outline",
    box: "bg-purple-soft",
    fg: colors.purple,
    text: "text-purple",
    go: "Store",
  },
  {
    label: "Resell Items",
    icon: "pricetag-outline",
    box: "bg-pink-soft",
    fg: colors.pink,
    text: "text-pink",
    go: "Resell",
  },
  {
    label: "Chat with Vet",
    icon: "chatbubble-outline",
    box: "bg-green-soft",
    fg: colors.green,
    text: "text-green",
    go: "Chat",
  },
] as const;

type Props = { onGo: (screen: string) => void; onSupport: () => void };

/** One row of four app-style shortcuts (tinted icon tile + short label) with a slim support link underneath. */
export default function QuickActions({ onGo, onSupport }: Props) {
  return (
    <Card className="border-amber-200">
      <SectionHeader
        title="Quick Actions"
        icon={
          <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
            <Ionicons name="paw" size={18} color={colors.primary} />
          </View>
        }
      />
      <View className="flex-row gap-2">
        {quick.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => onGo(q.go)}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            className="flex-1 items-center gap-1.5 active:opacity-70"
          >
            <View
              className={cn(
                "w-full aspect-square max-w-[72px] rounded-2xl items-center justify-center",
                q.box,
              )}
            >
              <Ionicons name={q.icon} size={26} color={q.fg} />
            </View>
            <Text
              maxFontSizeMultiplier={1.1}
              className={cn(
                "font-bold text-[11.5px] text-center leading-[15px]",
                q.text,
              )}
              numberOfLines={2}
            >
              {q.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={onSupport}
        className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-line active:opacity-70"
      >
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="headset-outline" size={16} color={colors.muted} />
          <Text
            maxFontSizeMultiplier={1.1}
            className="text-muted font-medium text-sm"
          >
            Need help?
          </Text>
        </View>
        <Text
          maxFontSizeMultiplier={1.1}
          className="text-primary font-bold text-sm"
        >
          Contact Support
        </Text>
      </Pressable>
    </Card>
  );
}
