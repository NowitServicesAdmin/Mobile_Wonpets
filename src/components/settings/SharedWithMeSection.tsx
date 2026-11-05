import React from 'react';
import { Avatar } from '../Avatar';
import PetChips from './PetChips';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, T } from '../ui';
import { toast } from '../WonPetsAlert';
import { errorMessage } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { daysFromNow } from '../../data/petRecords';
import { formatIsoDate } from '../../utils/petAge';

/** Other owners sharing their pets with you: accept / decline invitations, and see your active shared access. */
export default function SharedWithMeSection() {
  const { invitations, respondInvitation } = useSettings();
  const pending = invitations.filter((i) => i.status === 'pending');
  const accepted = invitations.filter((i) => i.status === 'accepted');
  const today = daysFromNow(0);
  const respond = async (id: string, accept: boolean) => {
    try { await respondInvitation(id, accept); toast.success(accept ? 'Invitation accepted' : 'Invitation declined'); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <View className="gap-4">
      <View className="gap-2.5">
        <Text className={T.h3}>Pending Invitations</Text>
        {pending.length === 0 && <Text className={T.small}>No pending invitations.</Text>}
        {pending.map((i) => (
          <View key={i.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 gap-2.5">
            <View className="flex-row items-center gap-3"><Avatar image={i.photo} emoji={i.emoji} size={44} /><View className="flex-1"><Text className={T.h3}>{i.ownerName}</Text><Text className={T.small}>wants to share their pets with you</Text></View><Chip label="Pending" tone="yellow" /></View>
            <PetChips pets={i.pets} />
            <Text className={T.small}>Access: {formatIsoDate(i.startDate)} – {formatIsoDate(i.endDate)}</Text>
            <View className="flex-row gap-2.5">
              <Button className="flex-1 py-2.5" variant="neutral" title="Decline" onPress={() => respond(i.id, false)} />
              <Button className="flex-1 py-2.5" title="Accept" onPress={() => respond(i.id, true)} />
            </View>
          </View>
        ))}
      </View>

      <View className="gap-2.5">
        <View><Text className={T.h3}>Shared With You</Text><Text className={T.small}>Pets other owners have shared with you appear together in your shared space.</Text></View>
        {accepted.length === 0 && <Text className={T.small}>Nothing shared with you yet.</Text>}
        {accepted.map((i) => {
          const expired = i.endDate < today; const notStarted = i.startDate > today;
          return (
            <View key={i.id} className="rounded-2xl border border-line bg-white p-3.5 gap-2.5">
              <View className="flex-row items-center gap-3"><Avatar image={i.photo} emoji={i.emoji} size={44} /><View className="flex-1"><Text className={T.h3}>{i.ownerName}</Text><Text className={T.small}>{expired ? `Access expired ${formatIsoDate(i.endDate)}` : notStarted ? `Starts ${formatIsoDate(i.startDate)}` : `Access until ${formatIsoDate(i.endDate)}`}</Text></View><Chip label={expired ? 'Expired' : notStarted ? 'Upcoming' : 'Active'} tone={expired ? 'white' : notStarted ? 'blue' : 'green'} /></View>
              <PetChips pets={i.pets} />
              <View className="flex-row items-center gap-1.5"><Ionicons name="calendar-outline" size={13} color={colors.muted} /><Text className={T.small}>{formatIsoDate(i.startDate)} – {formatIsoDate(i.endDate)}</Text></View>
            </View>
          );
        })}
      </View>
    </View>
  );
}