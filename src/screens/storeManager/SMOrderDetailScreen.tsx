import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { OrderDetailSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { Panel, PanelHeader } from '../../components/doctor/DoctorUI';
import { Badge, LoadError, OrderBadge, inr0, palette } from '../../components/storeManager/SMUI';
import { useRemote } from '../../hooks/useRemote';
import { actionsFor, useSMOrderActions } from '../../hooks/useSMOrderActions';
import { errorMessage } from '../../services/api';
import { SMOrder, SMOrderStatus, smService } from '../../services/storeManager.service';
import { useStoreManager } from '../../context/StoreManagerContext';

type Icon = keyof typeof Ionicons.glyphMap;

const SHIP_TEXT: Record<string, string> = {
  not_created: 'Not created yet', pickup_missing: 'Pickup address needed', shipment_failed: 'Shipment failed', shipment_created: 'Shipment created',
  awb_generated: 'Ready for pickup', pickup_scheduled: 'Pickup booked', picked_up: 'Picked up', in_transit: 'In transit',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', undelivered: 'Delivery attempt failed', rto: 'Returning to you',
  rto_delivered: 'Returned to you', cancelled: 'Cancelled',
};
const PROBLEM = ['pickup_missing', 'shipment_failed', 'undelivered', 'rto'];
const STEPS: SMOrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

/** One order: progress, customer, items, payment, address, courier shipment, and the next action pinned at the bottom. */
export default function SMOrderDetailScreen({ navigation, route }: any) {
  const id: string = route.params?.id;
  const insets = useSafeAreaInsets();
  const { tick } = useStoreManager();
  const q = useRemote(() => smService.order(id), [id], tick);
  const act = useSMOrderActions(q.reloadQuiet);
  const o = q.data;

  if (q.loading && !o) return <OrderDetailSkeleton />;
  if (q.error && !o) return <LoadError message={q.error} onRetry={q.reload} />;
  if (!o) return null;

  const actions = actionsFor(o);
  const call = (n?: string) => (n ? Linking.openURL(`tel:${n}`) : toast.info('No phone number on file.'));
  const mail = (e?: string) => (e ? Linking.openURL(`mailto:${e}`) : toast.info('No email on file.'));

  return (
    <View className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="p-4 gap-4 pb-8" refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={colors.primary} />}>
        {/* header + progress */}
        <Panel>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Text className="text-[18px] font-black text-ink" numberOfLines={1}>{o.orderId}</Text>
              <Text className="text-xs text-muted">{new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <OrderBadge status={o.status} />
          </View>
          {o.status === 'Cancelled' ? (
            <View className="flex-row items-center gap-2 mt-3.5 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <Ionicons name="close-circle" size={18} color={colors.red} /><Text className="flex-1 text-[13px] text-red-700">This order was cancelled.</Text>
            </View>
          ) : (
            <View className="flex-row items-center mt-4">
              {STEPS.map((st, i) => {
                const reached = STEPS.indexOf(o.status) >= i;
                return (
                  <React.Fragment key={st}>
                    <View className="items-center w-[62px]">
                      <View className={cn('w-7 h-7 rounded-full items-center justify-center', reached ? 'bg-primary' : 'bg-orange-100')}>
                        <Ionicons name={reached ? 'checkmark' : 'ellipse-outline'} size={14} color={reached ? '#fff' : '#FDBA74'} />
                      </View>
                      <Text className={cn('text-[10px] mt-1 font-semibold', reached ? 'text-ink' : 'text-muted')}>{st}</Text>
                    </View>
                    {i < STEPS.length - 1 && <View className={cn('flex-1 h-[3px] rounded-full -mt-4', STEPS.indexOf(o.status) > i ? 'bg-primary' : 'bg-orange-100')} />}
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </Panel>

        {/* customer */}
        <Panel>
          <PanelHeader icon="person" tone="blue" title="Customer" />
          <View className="flex-row items-center gap-3">
            <Avatar image={o.customer.image} emoji="🧑" size={46} />
            <View className="flex-1">
              <Text className="font-bold text-slate-800" numberOfLines={1}>{o.customer.name}</Text>
              {!!o.customer.email && <Text className="text-xs text-slate-500" numberOfLines={1}>{o.customer.email}</Text>}
              {!!o.customer.phone && <Text className="text-xs text-slate-500">{o.customer.phone}</Text>}
            </View>
            <Pressable onPress={() => call(o.customer.phone || o.address?.phone)} accessibilityLabel="Call customer" className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center active:opacity-70"><Ionicons name="call" size={17} color={colors.green} /></Pressable>
            <Pressable onPress={() => mail(o.customer.email)} accessibilityLabel="Email customer" className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center active:opacity-70"><Ionicons name="mail" size={17} color={colors.blue} /></Pressable>
          </View>
        </Panel>

        {/* items */}
        <Panel>
          <PanelHeader icon="bag-handle" title="Ordered Products" caption={`${o.items.reduce((s, i) => s + i.qty, 0)} unit(s)`} />
          <View className="gap-2.5">
            {o.items.map((i) => (
              <View key={i.id} className="flex-row gap-3 border border-orange-100 rounded-2xl p-2.5">
                <Avatar image={i.image} emoji="📦" size={58} square />
                <View className="flex-1 justify-center">
                  <Text className="font-semibold text-slate-800" numberOfLines={2}>{i.name}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">Qty {i.qty} × {inr0(i.price)}</Text>
                </View>
                <Text className="font-bold text-green-600 self-center">{inr0(i.qty * i.price)}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {/* payment */}
        <Panel>
          <PanelHeader icon="card" tone="green" title="Payment Summary" />
          <View className="gap-2">
            <Row k="Subtotal" v={inr0(o.subtotal)} />
            {o.deliveryCharge > 0 && <Row k="Delivery" v={inr0(o.deliveryCharge)} />}
            <Row k="Shipping" v={inr0(o.shippingCharge)} />
            <Row k={o.couponCode ? `Discount (${o.couponCode})` : 'Discount'} v={o.discount ? `− ${inr0(o.discount)}` : inr0(0)} />
            <View className="border-t border-orange-100 pt-2.5 flex-row justify-between">
              <Text className="text-[16px] font-extrabold text-ink">Total</Text>
              <Text className="text-[16px] font-extrabold text-green-600">{inr0(o.total)}</Text>
            </View>
            <View className="flex-row items-center gap-2 mt-1">
              <Badge label={o.paymentMethod} tone="slate" icon="wallet-outline" />
              {!!o.paymentStatus && <Badge label={o.paymentStatus} tone={/paid|success|captured/i.test(o.paymentStatus) ? 'green' : 'amber'} />}
            </View>
          </View>
        </Panel>

        {/* address */}
        {!!o.address && (
          <Panel>
            <PanelHeader icon="location" tone="red" title="Shipping Address" />
            <Text className="font-bold text-slate-800">{o.address.fullName}</Text>
            <Text className="text-[13px] text-slate-600 leading-5 mt-1">{[o.address.doorNo, o.address.formattedAddress].filter(Boolean).join(', ')}</Text>
            {!!o.address.landmark && <Text className="text-xs text-slate-500 mt-0.5">Near {o.address.landmark}</Text>}
            {!!o.address.phone && (
              <Pressable onPress={() => call(o.address?.phone)} className="flex-row items-center gap-1.5 mt-2 self-start"><Ionicons name="call-outline" size={14} color={colors.primary} /><Text className="text-primary font-bold text-[13px]">{o.address.phone}</Text></Pressable>
            )}
          </Panel>
        )}

        <ShipmentPanel o={o} onChanged={q.reloadQuiet} onFixAddress={() => navigation.navigate('SMMain', { screen: 'SMProfile', params: { open: 'pickup', at: Date.now() } })} />
      </ScrollView>

      {/* next step */}
      {actions.length > 0 && (
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="flex-row gap-2.5 px-4 pt-3 bg-white border-t border-line">
          {actions.map((a) => {
            const p = palette(a.tone);
            const solid = a.action !== 'cancel';
            const busy = act.isBusy(o, a.action);
            return (
              <Pressable key={a.action} disabled={!!act.busy} onPress={() => act.run(o, a.action)} accessibilityRole="button"
                style={solid ? { backgroundColor: p.fg } : { backgroundColor: p.soft }}
                className={cn('flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80', !!act.busy && !busy && 'opacity-50')}>
                {busy ? <ActivityIndicator color={solid ? '#fff' : p.fg} /> : <Ionicons name={a.icon as Icon} size={18} color={solid ? '#fff' : p.fg} />}
                <Text style={{ color: solid ? '#fff' : p.fg }} className="font-extrabold text-[15px]">{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <View className="flex-row justify-between"><Text className="text-slate-500">{k}</Text><Text className="text-slate-800 font-semibold">{v}</Text></View>
);

/** Courier shipment panel - the web ShipmentCard. Self-delivery (live pets / courier off) just explains what to do. */
function ShipmentPanel({ o, onChanged, onFixAddress }: { o: SMOrder; onChanged: () => void; onFixAddress: () => void }) {
  const [busy, setBusy] = useState('');
  const s = o.shipping;
  if (!s) return null;

  if (s.mode !== 'shiprocket') {
    return (
      <Panel>
        <PanelHeader icon="car" title="Delivery" caption="You deliver this order yourself" />
        <Text className="text-[13px] text-slate-600 leading-5">Mark it <Text className="font-bold">Shipped</Text> when it leaves and <Text className="font-bold">Delivered</Text> once the customer has it.</Text>
        {s.distanceKm != null && (
          <Text className="text-[13px] text-slate-600 leading-5 mt-2">Customer is about <Text className="font-bold">{s.distanceKm} km</Text> from your store and paid <Text className="font-bold">{inr0(o.shippingCharge)}</Text> delivery for this order.</Text>
        )}
      </Panel>
    );
  }

  const status = s.status || 'not_created';
  const problem = PROBLEM.includes(status);
  const canRetry = o.status === 'Processing' && !s.awbCode && ['pickup_missing', 'shipment_failed', 'shipment_created'].includes(status);
  const has = !!s.awbCode;

  const run = async (what: 'retry' | 'label' | 'refresh') => {
    setBusy(what);
    try {
      if (what === 'retry') {
        const r = await smService.retryShipment(o.id);
        r.success ? toast.success(r.message || 'Shipment created') : toast.error(r.message || 'Shipment failed');
      } else if (what === 'label') {
        const r = await smService.shipmentLabel(o.id);
        if (r.labelUrl) await Linking.openURL(r.labelUrl);
        else toast.info(r.message || 'No label available yet');
      } else {
        await smService.refreshTracking(o.id);
        toast.success('Tracking updated');
      }
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e, 'Shipment action failed.'));
    } finally { setBusy(''); }
  };

  const btn = (key: 'retry' | 'label' | 'refresh', label: string, icon: Icon, tone: 'orange' | 'cyan' | 'slate') => {
    const p = palette(tone);
    return (
      <Pressable key={key} disabled={!!busy} onPress={() => run(key)} style={{ backgroundColor: p.soft }} className={cn('flex-row items-center gap-1.5 px-3.5 h-10 rounded-xl active:opacity-70', !!busy && busy !== key && 'opacity-50')}>
        {busy === key ? <ActivityIndicator size="small" color={p.fg} /> : <Ionicons name={icon} size={14} color={p.fg} />}
        <Text style={{ color: p.fg }} className="font-bold text-[13px]">{label}</Text>
      </Pressable>
    );
  };

  return (
    <Panel>
      <PanelHeader icon="car" title="Courier Shipment" />
      {s.sandbox && <View className="-mt-2 mb-2"><Badge label="TEST MODE" tone="purple" /></View>}
      <View className="gap-2">
        <View className="flex-row justify-between gap-3"><Text className="text-slate-500">Status</Text><Text className={cn('font-bold', problem ? 'text-red-600' : 'text-slate-800')}>{SHIP_TEXT[status] || status}</Text></View>
        {!!s.courierName && <Row k="Courier" v={s.courierName} />}
        {!!s.awbCode && <Row k="AWB" v={s.awbCode} />}
        {!!s.shiprocketStatus && <Row k="Courier update" v={s.shiprocketStatus} />}
      </View>
      {s.pickupSource === 'office' && <Text className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">This parcel will be collected from the platform's office address, not yours.</Text>}
      {!!s.remarks && problem && <Text className="text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-3">{s.remarks}</Text>}
      {status === 'pickup_missing' && (
        <Pressable onPress={onFixAddress} className="flex-row items-center gap-1.5 mt-3 self-start"><Text className="text-primary font-bold text-[13px]">Add / fix pickup address</Text><Ionicons name="arrow-forward" size={13} color={colors.primary} /></Pressable>
      )}
      {o.status === 'Processing' && has && !s.pickupScheduled && (
        <Text className="text-[13px] text-slate-600 leading-5 mt-3">Pack the order, print the label and stick it on the parcel, then tap <Text className="font-bold">Request pickup</Text> below.</Text>
      )}
      <View className="flex-row flex-wrap gap-2 mt-3.5">
        {canRetry && btn('retry', 'Retry shipment', 'refresh', 'orange')}
        {has && o.status !== 'Cancelled' && btn('label', 'Print label', 'pricetag', 'cyan')}
        {has && !s.sandbox && ['Shipped', 'Processing'].includes(o.status) && btn('refresh', 'Refresh tracking', 'sync', 'slate')}
        {!!s.trackUrl && (
          <Pressable onPress={() => Linking.openURL(s.trackUrl!)} className="flex-row items-center gap-1.5 px-3.5 h-10 rounded-xl bg-slate-100 active:opacity-70">
            <Text className="text-slate-700 font-bold text-[13px]">Track</Text><Ionicons name="open-outline" size={13} color="#475569" />
          </Pressable>
        )}
      </View>
    </Panel>
  );
}
