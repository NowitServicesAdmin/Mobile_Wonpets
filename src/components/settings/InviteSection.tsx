import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Field, T } from '../ui';
import { WonPetsAlert } from '../WonPetsAlert';
import { settingsService } from '../../services/settings.service';
import { errorMessage } from '../../services/api';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteSection() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const to = email.trim();
    if (!EMAIL.test(to)) return WonPetsAlert.warning('Invalid Email', 'Please enter a valid email address.');
    setSending(true);
    try {
      await settingsService.sendInvite(to);
      WonPetsAlert.success('Invite Sent', `An invitation was sent to ${to}.`);
      setEmail('');
    } catch (e) {
      WonPetsAlert.error('Could not send invite', errorMessage(e));
    } finally { setSending(false); }
  };

  return (
    <View className="gap-3">
      <Text className={T.body}>Invite friends to WONPET and share the love for pets.</Text>
      <Field label="Email address" value={email} onChangeText={setEmail} placeholder="Enter email address" keyboardType="email-address" autoCapitalize="none" />
      <Button disabled={sending} title={sending ? 'Sending…' : 'Send invite'} icon={<Ionicons name="paper-plane" size={16} color="#fff" />} onPress={send} />
      <Button variant="outline" title="Share invite link" icon={<Ionicons name="share-social-outline" size={18} color={colors.primary} />} onPress={() => Share.share({ message: 'Join me on WONPET - the best app for pet parents! https://wonpet.app/invite' })} />
    </View>
  );
}
