import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { LEGAL_DOCS, LEGAL_ORDER, isLegalDocId, type LegalDocId } from '../../data/legal';
import LegalDocument from '../../components/legal/LegalDocument';

/** Terms & Conditions / Privacy Policy / Refund Policy. Open with navigation.navigate('Legal', { doc: 'terms' | 'privacy' | 'refund' }).
 *  Registered in the sign-in stack too, so it can be read before an account exists (sign-up screen). */
export default function LegalScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState<LegalDocId>(isLegalDocId(route?.params?.doc) ? route.params.doc : 'terms');
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => { if (isLegalDocId(route?.params?.doc)) setDoc(route.params.doc); }, [route?.params?.doc]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [doc]);

  return (
    <View className="flex-1 bg-cream">
      <View className="flex-row gap-2 px-4 pt-3 pb-2.5 border-b border-line bg-cream">
        {LEGAL_ORDER.map((id) => {
          const on = id === doc;
          return (
            <Pressable
              key={id}
              onPress={() => setDoc(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 border ${on ? 'bg-primary border-primary' : 'bg-white border-line'} active:opacity-80`}
            >
              <Ionicons name={LEGAL_DOCS[id].icon} size={14} color={on ? '#fff' : colors.muted} />
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className={`text-[12.5px] font-bold ${on ? 'text-white' : 'text-muted'}`}>{LEGAL_DOCS[id].short}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView ref={scroll} className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }}>
        <LegalDocument doc={LEGAL_DOCS[doc]} />
      </ScrollView>
    </View>
  );
}
