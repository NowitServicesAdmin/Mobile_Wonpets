import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";

type Props = {
  facts: string[];
  index: number;
  onNext: () => void;
  learnMoreUrl?: string;
};

/** Compact tip card: the two actions (next fact / learn more) are small round buttons in the header, so the card has no footer row. */
export default function AnimalFactCard({
  facts,
  index,
  onNext,
  learnMoreUrl = "https://www.aspca.org/pet-care",
}: Props) {
  if (!facts.length) return null;

  return (
    <View className="bg-purple-soft rounded-3xl px-3.5 py-3 border border-purple/10">
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 rounded-full bg-white items-center justify-center">
          <Ionicons name="paw" size={15} color={colors.purple} />
        </View>
        <Text maxFontSizeMultiplier={1.1} className="flex-1 text-[14px] font-extrabold text-ink">
          Animal Fact
        </Text>
        {/* <View className="bg-white rounded-full px-2.5 py-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold text-purple">
            {index + 1} / {facts.length}
          </Text>
        </View>
        <Pressable
          onPress={() => Linking.openURL(learnMoreUrl)}
          accessibilityRole="link"
          accessibilityLabel="Learn more about pet care"
          className="w-8 h-8 rounded-full bg-white items-center justify-center active:opacity-80"
        >
          <Ionicons name="open-outline" size={15} color={colors.purple} />
        </Pressable> */}
        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Show next animal fact"
          className="w-8 h-8 rounded-full bg-purple items-center justify-center active:opacity-80"
        >
          <Ionicons name="refresh" size={15} color="#fff" />
        </Pressable>
      </View>

      {/* min height keeps the card from jumping between short and long facts */}
      <Text maxFontSizeMultiplier={1.2} className="text-[12.5px] text-ink/80 leading-[18px] mt-2 min-h-[54px]">
        {facts[index]}
      </Text>
    </View>
  );
}