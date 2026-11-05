import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AdditionalInfo, Collaborator, Invitation, NotificationPrefs, Plan, SettingsDoc, Subscription, DEFAULT_YEARLY_SAVING, defaultPrefs, emptyInfo } from '../data/settings';
import { plans as fallbackPlans } from '../data/mock';
import { settingsService } from '../services/settings.service';
import { useAuth } from './AuthContext';

type Doc = SettingsDoc & { id?: string };
type Ctx = {
  loading: boolean;
  /** True once the first load of every settings area has finished. */
  ready: boolean;
  reload: () => Promise<void>;
  plans: Plan[];
  yearlySaving: number;
  /** null = on the free plan */
  subscription: Subscription | null;
  cancelPlan: () => Promise<void>;
  restorePlan: () => Promise<void>;
  info: AdditionalInfo;
  /** True once the Additional Information answer (or failure) has arrived - lets the header / form show a skeleton first. */
  infoLoaded: boolean;
  saveInfo: (i: AdditionalInfo) => Promise<void>;
  documents: Record<string, Doc | undefined>;
  uploadDocument: (type: string, file: { uri: string; name: string; mime?: string; size?: string }) => Promise<void>;
  removeDocument: (type: string) => Promise<void>;
  prefs: NotificationPrefs;
  savePrefs: (p: NotificationPrefs) => Promise<void>;
  collaborators: Collaborator[];
  addCollaborator: (p: { userId: string; petIds: string[]; startDate: string; endDate: string }) => Promise<void>;
  updateCollaborator: (id: string, p: { petIds: string[]; startDate: string; endDate: string }) => Promise<void>;
  revokeCollaborator: (id: string) => Promise<void>;
  invitations: Invitation[];
  respondInvitation: (id: string, accept: boolean) => Promise<void>;
  /** Silent re-fetches used by live sync (no loading flags). */
  refreshInvitations: () => Promise<void>;
  refreshCollaborators: () => Promise<void>;
};
const SettingsContext = createContext<Ctx>({} as Ctx);
export const useSettings = () => useContext(SettingsContext);

// used until / unless the plans API answers
const localPlans: Plan[] = fallbackPlans.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, monthly: p.price === 'FREE' ? 0 : Number(p.price.replace(/\D/g, '')), features: p.features, color: p.color }));

/** Settings data, loaded from the backend once the user is signed in. Every mutation calls the API and then updates local state. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(localPlans);
  const [yearlySaving, setYearlySaving] = useState(DEFAULT_YEARLY_SAVING);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [info, setInfo] = useState<AdditionalInfo>(emptyInfo);
  const [infoLoaded, setInfoLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState<Ctx['documents']>({});
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs());
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    // each call is independent - one failing endpoint must not blank the rest of Settings
    await Promise.all([
      settingsService.getPlans().then((r) => { if (r.plans.length) setPlans(r.plans); if (r.yearlySaving != null) setYearlySaving(r.yearlySaving); }).catch(() => {}),
      settingsService.getMySubscription().then(setSubscription).catch(() => {}),
      settingsService.getInfo().then(setInfo).catch(() => {}).finally(() => setInfoLoaded(true)),
      settingsService.getPrefs().then(setPrefs).catch(() => {}),
      settingsService.getDocuments().then(setDocuments).catch(() => {}),
      settingsService.listCollaborators().then(setCollaborators).catch(() => {}),
      settingsService.listInvitations().then(setInvitations).catch(() => {}),
    ]);
    setLoading(false);
    setReady(true);
  }, []);

  useEffect(() => {
    if (user?.id) reload();
    else { setSubscription(null); setInfo(emptyInfo); setInfoLoaded(false); setReady(false); setDocuments({}); setPrefs(defaultPrefs()); setCollaborators([]); setInvitations([]); }
  }, [user?.id, reload]);

  const refreshCollabs = async () => setCollaborators(await settingsService.listCollaborators());
  const refreshInvites = async () => setInvitations(await settingsService.listInvitations());
  const refreshSub = async () => setSubscription(await settingsService.getMySubscription());

  return (
    <SettingsContext.Provider value={{
      loading, ready, reload, plans, yearlySaving, subscription,
      cancelPlan: async () => { await settingsService.cancelSubscription(); await refreshSub(); },
      restorePlan: async () => { await settingsService.restoreSubscription(); await refreshSub(); },
      info, infoLoaded, saveInfo: async (i) => setInfo(await settingsService.saveInfo(i)),
      documents,
      uploadDocument: async (type, file) => {
        const saved = await settingsService.uploadDocument(type, file, documents[type]?.id);
        setDocuments((d) => ({ ...d, [type]: { ...saved, size: file.size || '' } }));
      },
      removeDocument: async (type) => {
        const id = documents[type]?.id;
        if (id) await settingsService.deleteDocument(id);
        setDocuments((d) => ({ ...d, [type]: undefined }));
      },
      prefs, savePrefs: async (p) => setPrefs(await settingsService.savePrefs(p)),
      collaborators,
      addCollaborator: async (p) => { await settingsService.inviteCollaborator(p); await refreshCollabs(); },
      updateCollaborator: async (id, p) => { await settingsService.updateCollaborator(id, p); await refreshCollabs(); },
      revokeCollaborator: async (id) => { await settingsService.revokeCollaborator(id); await refreshCollabs(); },
      invitations,
      respondInvitation: async (id, accept) => { await settingsService.respondInvitation(id, accept); await refreshInvites(); },
      refreshInvitations: refreshInvites,
      refreshCollaborators: refreshCollabs,
    }}>{children}</SettingsContext.Provider>
  );
}
