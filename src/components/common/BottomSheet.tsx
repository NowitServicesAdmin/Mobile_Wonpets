import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T } from '../ui';

/** Slide-up sheet: grab handle, title + close button, scrolling body and an optional pinned footer (buttons). */
export default function BottomSheet({
  visible, onClose, title, subtitle, children, footer, scroll = true,
}: {
  visible: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode; scroll?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close" />
          <View className="bg-cream rounded-t-[28px] max-h-[90%]">
            <View className="items-center pt-2.5"><View className="w-10 h-1.5 rounded-full bg-orange-200" /></View>
            <View className="flex-row justify-between items-center px-5 pt-3 pb-3">
              <View className="flex-1 pr-3"><Text className={T.h2}>{title}</Text>{!!subtitle && <Text className={T.small}>{subtitle}</Text>}</View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" className="w-9 h-9 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="close" size={20} color={colors.text} /></Pressable>
            </View>
            {scroll
              ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-4 gap-4">{children}</ScrollView>
              : <View className="px-5 pb-4 gap-4">{children}</View>}
            {!!footer && <View className="px-5 pt-3 pb-7 bg-white border-t border-line">{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
