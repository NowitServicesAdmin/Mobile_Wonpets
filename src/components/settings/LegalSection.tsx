import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { LEGAL_DOCS, LEGAL_ORDER } from '../../data/legal';
import { APP_NAME, APP_VERSION, BUILD_NUMBER, RUNTIME_LABEL, platformLabel } from '../../config/version';
import { getLegalAcceptance, type LegalAcceptance } from '../../utils/legalAcceptance';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-2.5 ${first ? '' : 'border-t border-line'}`}>
      <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-muted">{label}</Text>
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[13px] font-bold text-ink max-w-[60%]">{value}</Text>
    </View>
  );
}

/** Settings > Terms & Policies: the three documents with their version and last-updated date, whether the version the user
 *  accepted is still current, and the app's own version details. Shared by the owner, doctor and store-manager settings. */
export default function LegalSection() {
  const nav = useNavigation<any>();
  const [accepted, setAccepted] = useState<LegalAcceptance | null>(null);
  useFocusEffect(useCallback(() => { let live = true; getLegalAcceptance().then((a) => { if (live) setAccepted(a); }); return () => { live = false; }; }, []));

  const outdated = accepted ? LEGAL_ORDER.filter((id) => accepted.versions[id] !== LEGAL_DOCS[id].version) : [];

  return (
    <View className="gap-4">
      <View>
        <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-extrabold text-muted uppercase tracking-wider mb-1.5">Terms & policies</Text>
        <View className="rounded-2xl border border-line overflow-hidden">
          {LEGAL_ORDER.map((id, i) => {
            const d = LEGAL_DOCS[id];
            const acc = accepted?.versions[id];
            const changed = !!acc && acc !== d.version;
            return (
              <Pressable
                key={id}
                onPress={() => nav.navigate('Legal', { doc: id })}
                accessibilityRole="button"
                accessibilityLabel={`${d.title}, version ${d.version}`}
                className={`flex-row items-center gap-3 px-3.5 py-3 bg-white active:bg-cream ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name={d.icon} size={19} color={colors.primary} /></View>
                <View className="flex-1">
                  <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[14.5px] font-extrabold text-ink">{d.title}</Text>
                  <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[12px] text-muted">Version {d.version} · Updated {d.updated}</Text>
                  {!!acc && (
                    <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className={`text-[11.5px] font-semibold mt-0.5 ${changed ? 'text-primary' : 'text-green'}`}>
                      {changed ? `You accepted version ${acc} - updated since` : `You accepted version ${acc}`}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
        </View>
        {accepted ? (
          <Text className="text-[12px] leading-[18px] text-muted mt-2 ml-1">
            {`Accepted at sign-up on ${fmtDate(accepted.at)}.`}{outdated.length ? ' Some documents have been updated since - please read the latest version. Continuing to use the app means you accept the updated terms.' : ' You are on the latest versions.'}
          </Text>
        ) : (
          <Text className="text-[12px] leading-[18px] text-muted mt-2 ml-1">The version you accepted is not recorded on this device. The documents above are the latest versions; continuing to use the app means you accept them.</Text>
        )}
      </View>

      <View>
        <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-extrabold text-muted uppercase tracking-wider mb-1.5">App version</Text>
        <View className="rounded-2xl border border-line bg-white px-3.5">
          <InfoRow first label="App" value={APP_NAME} />
          <InfoRow label="Version" value={APP_VERSION} />
          {!!BUILD_NUMBER && <InfoRow label="Build" value={BUILD_NUMBER} />}
          <InfoRow label="Running as" value={RUNTIME_LABEL} />
          <InfoRow label="Device" value={platformLabel()} />
          {LEGAL_ORDER.map((id) => <InfoRow key={id} label={LEGAL_DOCS[id].short} value={`v${LEGAL_DOCS[id].version} · ${LEGAL_DOCS[id].updated}`} />)}
        </View>
      </View>
    </View>
  );
}
