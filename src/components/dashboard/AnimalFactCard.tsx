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

/** Compact tip card: icon + "Animal Fact" label + counter, the fact, and two small pill actions. */
export default function AnimalFactCard({
  facts,
  index,
  onNext,
  learnMoreUrl = "https://www.aspca.org/pet-care",
}: Props) {
  if (!facts.length) return null;

  return (
    <View className="bg-purple-soft rounded-3xl px-4 py-4 border border-purple/10">
      {/* header */}
      <View className="flex-row items-center gap-2.5">
        <View className="w-9 h-9 rounded-full bg-white items-center justify-center">
          <Ionicons name="paw" size={17} color={colors.purple} />
        </View>
        <Text
          maxFontSizeMultiplier={1.1}
          className="flex-1 text-[15px] font-extrabold text-ink"
        >
          Animal Fact
        </Text>
        <View className="bg-white rounded-full px-2.5 py-1">
          <Text
            maxFontSizeMultiplier={1.1}
            className="text-[11px] font-bold text-purple"
          >
            {index + 1} / {facts.length}
          </Text>
        </View>
      </View>

      {/* fact (min height stops the card jumping between short/long facts) */}
      <Text
        maxFontSizeMultiplier={1.2}
        className="text-[14px] text-ink/80 leading-[21px] mt-3 min-h-[63px]"
      >
        {facts[index]}
      </Text>

      {/* actions */}
      <View className="flex-row items-center gap-2 mt-3">
        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel="Show next animal fact"
          className="flex-row items-center gap-1.5 bg-purple rounded-full px-3.5 py-2 active:opacity-80"
        >
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text
            maxFontSizeMultiplier={1.1}
            className="text-white font-bold text-[13px]"
          >
            Next fact
          </Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(learnMoreUrl)}
          accessibilityRole="link"
          accessibilityLabel="Learn more about pet care"
          className="flex-row items-center gap-1.5 bg-white rounded-full px-3.5 py-2 active:opacity-80"
        >
          <Text
            maxFontSizeMultiplier={1.1}
            className="text-purple font-bold text-[13px]"
          >
            Learn more
          </Text>
          <Ionicons name="open-outline" size={13} color={colors.purple} />
        </Pressable>
      </View>
    </View>
  );
}