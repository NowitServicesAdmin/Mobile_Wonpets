import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme';
import { Button, Chip, T } from '../ui';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { DOCUMENT_TYPES } from '../../data/settings';
import { useSettings } from '../../context/SettingsContext';
import { errorMessage } from '../../services/api';

const MAX = 5 * 1024 * 1024;
const fmtSize = (b?: number) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Upload an identity proof (PDF or image) to the backend. */
export default function DocumentsSection() {
  const { documents, uploadDocument, removeDocument } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (type: string) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX) return WonPetsAlert.error('File too large', 'Please choose a file up to 5 MB.');
    setBusy(type);
    try {
      await uploadDocument(type, { uri: a.uri, name: a.name, mime: a.mimeType || (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'), size: fmtSize(a.size) });
      toast.success('Documents uploaded successfully.');
    } catch (e) {
      WonPetsAlert.error('Upload failed', errorMessage(e));
    } finally { setBusy(null); }
  };
  const remove = async (type: string) => {
    const r = await WonPetsAlert.delete('Delete document?', 'You can upload it again any time.', { confirmText: 'Delete' });
    if (!r.isConfirmed) return;
    setBusy(type);
    try { await removeDocument(type); toast.success('Document deleted'); } catch (e) { WonPetsAlert.error('Could not delete', errorMessage(e)); } finally { setBusy(null); }
  };

  return (
    <View className="gap-3">
      {DOCUMENT_TYPES.map((d) => {
        const doc = documents[d.key];
        return (
          <View key={d.key} className="rounded-2xl border border-line bg-cream p-3.5 gap-2.5">
            <View className="flex-row items-center gap-2.5"><View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name="shield-checkmark" size={18} color={colors.primary} /></View><View className="flex-1"><Text className={T.h3}>{d.title}</Text><Text className={T.small}>{d.hint}</Text></View>{doc ? <Chip label="Uploaded" tone="green" /> : <Chip label="Required" tone="yellow" />}</View>
            {doc ? (
              <View className="flex-row items-center gap-3 bg-white rounded-xl p-3">
                <Ionicons name={doc.name.toLowerCase().endsWith('.pdf') ? 'document-text' : 'image'} size={22} color={colors.primary} />
                <View className="flex-1"><Text className={T.h3} numberOfLines={1}>{doc.name}</Text><Text className={T.small}>{busy === d.key ? 'Working…' : doc.size || 'Uploaded'}</Text></View>
                <Pressable disabled={busy === d.key} onPress={() => pick(d.key)} hitSlop={8}><Ionicons name="swap-horizontal" size={18} color={colors.muted} /></Pressable>
                <Pressable disabled={busy === d.key} onPress={() => remove(d.key)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable>
              </View>
            ) : <Button variant="outline" disabled={busy === d.key} title={busy === d.key ? 'Uploading…' : 'Upload document'} icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />} onPress={() => pick(d.key)} />}
          </View>
        );
      })}
    </View>
  );
}
