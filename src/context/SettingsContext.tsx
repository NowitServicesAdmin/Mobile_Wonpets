import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AdditionalInfo, Collaborator, EndedPlan, Invitation, NotificationPrefs, Plan, PlanLimits, SettingsDoc, Subscription, DEFAULT_YEARLY_SAVING, defaultPrefs, emptyInfo } from '../data/settings';
import { plans as fallbackPlans } from '../data/mock';
import { settingsService } from '../services/settings.service';
import { useAuth } from './AuthContext';
import { payWithRazorpay } from '../utils/razorpay';

type Doc = SettingsDoc & { id?: string };
type Ctx = {
  loading: boolean;
  /** True once the first load of every settings area has finished. */
  ready: boolean;
  reload: () => Promise<void>;
  plans: Plan[];
  yearlySaving: number;
  /** The paid plan that is still running; null when there is none. */
  subscription: Subscription | null;
  /** A paid plan whose end date has passed (grace period or paused - never moved to the free plan); null otherwise.
   *  subscription and expiredPlan both null = never bought a paid plan, so the account is on the free plan. */
  expiredPlan: EndedPlan | null;
  /** Current plan limits + usage (null until loaded). */
  limits: PlanLimits | null;
  refreshSubscription: () => Promise<void>;
  cancelPlan: () => Promise<void>;
  restorePlan: () => Promise<void>;
  /** Paid plan purchase: server creates the Razorpay order -> checkout sheet -> server verifies the signature and activates. Throws PaymentCancelled if the sheet is closed. */
  buyPlan: (plan: Plan, billing: 'monthly' | 'yearly') => Promise<void>;
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
export function SettingsProvider({ children, scope = 'owner' }: { children: React.ReactNode; /** 'doctor' loads only what a doctor's Profile needs (clinic info, documents, notification prefs) - no plans / collaborators of their own (they only receive invitations). */ scope?: 'owner' | 'doctor' | 'store' }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(localPlans);
  const [yearlySaving, setYearlySaving] = useState(DEFAULT_YEARLY_SAVING);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [expiredPlan, setExpiredPlan] = useState<Ctx['expiredPlan']>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
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
    // only pet owners have collaborators / plans of their own; the server answers 403 to doctors & store managers
    // (guards the brief moment the owner tree is mounted while a doctor's session is still being restored)
    const owner = scope === 'owner' && user?.role === 'user';
    // plans + subscription apply to every role (the server keeps a separate plan list per role)
    const role = user?.role ?? 'user';
    await Promise.all([
      settingsService.getPlans(role).then((r) => { if (r.plans.length) setPlans(r.plans); else if (!owner) setPlans([]); if (r.yearlySaving != null) setYearlySaving(r.yearlySaving); })
        .catch(() => { if (!owner) setPlans([]); }), // never show the owner's fallback plans to a doctor / store manager
      settingsService.getMySubscriptionState().then((s) => { setSubscription(s.current); setExpiredPlan(s.expired); }).catch(() => {}),
      settingsService.getMyLimits().then(setLimits).catch(() => {}),
      settingsService.getInfo().then(setInfo).catch(() => {}).finally(() => setInfoLoaded(true)),
      settingsService.getPrefs().then(setPrefs).catch(() => {}),
      settingsService.getDocuments().then(setDocuments).catch(() => {}),
      owner && settingsService.listCollaborators().then(setCollaborators).catch(() => {}),
      // invitations ("Shared With Me") apply to every role - a doctor can be invited to look after someone's pets too
      settingsService.listInvitations().then(setInvitations).catch(() => {}),
    ]);
    setLoading(false);
    setReady(true);
  }, [scope, user?.role]);

  useEffect(() => {
    if (user?.id) reload();
    else { setSubscription(null); setExpiredPlan(null); setLimits(null); setInfo(emptyInfo); setInfoLoaded(false); setReady(false); setDocuments({}); setPrefs(defaultPrefs()); setCollaborators([]); setInvitations([]); }
  }, [user?.id, reload]);

  const refreshCollabs = async () => {
    if (scope !== 'owner' || user?.role !== 'user') return;
    setCollaborators(await settingsService.listCollaborators());
  };
  const refreshInvites = async () => setInvitations(await settingsService.listInvitations());
  const refreshSub = async () => {
    const [s, l] = await Promise.all([settingsService.getMySubscriptionState(), settingsService.getMyLimits().catch(() => null)]);
    setSubscription(s.current); setExpiredPlan(s.expired); if (l) setLimits(l);
  };

  return (
    <SettingsContext.Provider value={{
      loading, ready, reload, plans, yearlySaving, subscription, expiredPlan, limits, refreshSubscription: refreshSub,
      cancelPlan: async () => { await settingsService.cancelSubscription(); await refreshSub(); },
      restorePlan: async () => { await settingsService.restoreSubscription(); await refreshSub(); },
      buyPlan: async (plan, billing) => {
        const init = await settingsService.initiateSubscription(plan.id, billing);
        if (init.requiresPayment) {
          if (!init.order || !init.keyId) throw new Error('Could not start the payment. Please try again.');
          const paid = await payWithRazorpay({
            keyId: init.keyId,
            orderId: init.order.id,
            amountPaise: init.order.amount,
            title: 'WON PET PRO',
            description: `${plan.name} - ${billing} plan`,
            prefill: { name: user?.name, email: user?.email, contact: user?.phone },
          });
          await settingsService.activateSubscription(paid);
        }
        await refreshSub();
      },
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