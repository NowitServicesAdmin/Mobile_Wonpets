import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { COUNTRIES, Country, isEmailInput } from "../utils/identifier";
import { cn } from "./ui";

type Props = {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  country: Country;
  onCountryChange: (c: Country) => void;
  placeholder?: string;
};

/**
 * One input that accepts an email OR a phone number.
 * Phone mode shows the country flag dropdown + dial code; typing a letter or "@" switches to email mode.
 */
export default function IdentifierField({
  label = "Email or Phone Number",
  value,
  onChangeText,
  country,
  onCountryChange,
  placeholder = "Enter email or phone number",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        c.dial.slice(1).startsWith(q),
    );
  }, [query]);
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const email = isEmailInput(value);

  return (
    <View>
      <Text className="font-bold text-ink mb-1.5">{label}</Text>
      <View className="flex-row items-center bg-white border border-line rounded-2xl px-3.5">
        {email ? (
          <Ionicons
            name="mail-outline"
            size={20}
            color={colors.muted}
            style={{ marginRight: 10 }}
          />
        ) : (
          <Pressable
            onPress={() => setOpen(true)}
            hitSlop={8}
            className="flex-row items-center mr-2.5"
          >
            <Text className="text-xl mr-1">{country.flag}</Text>
            <Ionicons name="caret-down" size={10} color={colors.muted} />
            <Text className="font-semibold text-ink ml-2">{country.dial}</Text>
          </Pressable>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8AEA5"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={email ? 80 : 15}
          className="flex-1 py-3.5 text-base text-ink"
        />
      </View>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={close}
        >
          <Pressable className="bg-white rounded-t-[28px] pt-4 pb-8 h-[80%]">
            <Text className="text-lg font-extrabold text-ink px-6 mb-2">
              Select country
            </Text>
            <View className="flex-row items-center bg-cream border border-line rounded-2xl mx-6 mb-2 px-3.5">
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search country or code"
                placeholderTextColor="#B8AEA5"
                autoCorrect={false}
                className="flex-1 py-3 ml-2 text-base text-ink"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              ListEmptyComponent={
                <Text className="text-muted text-center py-6">No country found</Text>
              }
              renderItem={({ item: c }) => {
                const active = c.code === country.code;
                return (
                  <Pressable
                    onPress={() => {
                      onCountryChange(c);
                      close();
                    }}
                    className={cn(
                      "flex-row items-center px-6 py-3.5",
                      active && "bg-primary-soft",
                    )}
                  >
                    <Text className="text-2xl mr-3">{c.flag}</Text>
                    <Text className="flex-1 text-base text-ink font-semibold">
                      {c.name}
                    </Text>
                    <Text className="text-muted font-semibold">{c.dial}</Text>
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                        style={{ marginLeft: 10 }}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}