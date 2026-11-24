import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { cn } from "../ui";
import { Panel, PanelHeader } from "../doctor/DoctorUI";

const quick = [
  { label: "Appointments", icon: "calendar-outline", box: "bg-orange-100", fg: "#F97316", go: "BookAppointment" },
  { label: "Products", icon: "bag-handle-outline", box: "bg-purple-soft", fg: colors.purple, go: "Store" },
  { label: "Resell", icon: "pricetag-outline", box: "bg-pink-soft", fg: colors.pink, go: "Resell" },
  { label: "Chat", icon: "chatbubble-outline", box: "bg-green-soft", fg: colors.green, go: "Chat" },
] as const;

type Props = { onGo: (screen: string) => void; onSupport: () => void };

/** Four fixed-height tiles in one row (same size as the doctor dashboard's quick actions). Support moved into the header, so there is no extra footer row. */
export default function QuickActions({ onGo, onSupport }: Props) {
  return (
    <Panel compact className="border-orange-100">
      <PanelHeader compact icon="flash" title="Quick Actions" action="Support" onAction={onSupport} />
      <View className="flex-row gap-2">
        {quick.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => onGo(q.go)}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            className={cn("flex-1 h-[78px] items-center justify-center gap-1 rounded-2xl px-1 active:opacity-70", q.box)}
          >
            <View className="w-9 h-9 rounded-xl bg-white items-center justify-center">
              <Ionicons name={q.icon} size={18} color={q.fg} />
            </View>
            <Text maxFontSizeMultiplier={1.1} className="font-bold text-[10px] text-center leading-[12px] text-[#a15d03]" numberOfLines={2}>
              {q.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}