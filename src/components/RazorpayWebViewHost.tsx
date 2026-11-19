import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StatusBar, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaymentCancelled, RazorpayOptions, RazorpayResult, registerRazorpayWebHost } from '../utils/razorpay';

type Pending = { opts: RazorpayOptions; resolve: (r: RazorpayResult) => void; reject: (e: Error) => void };

const BRAND = '#FF6B00';
const CREAM = '#FFF7ED';
const INK = '#1F1308';

const rupees = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });

const buildHtml = (o: RazorpayOptions) => {
  const options = {
    key: o.keyId,
    order_id: o.orderId,
    amount: o.amountPaise,
    currency: 'INR',
    name: 'WON PET PRO',
    description: o.description,
    prefill: o.prefill || {},
    theme: { color: BRAND, backdrop_color: CREAM },
  };
  // JSON inside <script>: escape "<" so a description can never close the tag
  const json = JSON.stringify(options).replace(/</g, '\\u003c');
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>html,body{margin:0;height:100%;background:${CREAM};font-family:sans-serif}</style>
</head><body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  function post(m){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  window.onerror = function(msg){ post({type:'error', message:String(msg)}); };
  function start(){
    if (!window.Razorpay) { post({type:'error', message:'Could not load Razorpay. Check your internet connection.'}); return; }
    var o = ${json};
    o.handler = function(r){ post({type:'success', data:r}); };
    o.modal = { ondismiss: function(){ post({type:'dismiss'}); }, escape:false, backdropclose:false };
    var rzp = new Razorpay(o);
    rzp.on('payment.failed', function(resp){ post({type:'error', message:(resp && resp.error && resp.error.description) || 'Payment failed'}); });
    rzp.open();
    setTimeout(function(){ post({type:'ready'}); }, 600);
  }
  window.addEventListener('load', start);
</script></body></html>`;
};

export default function RazorpayWebViewHost() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [ready, setReady] = useState(false);
  const ref = useRef<Pending | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    registerRazorpayWebHost((req) => {
      ref.current = req;
      setReady(false);
      setPending(req);
    });
    return () => registerRazorpayWebHost(null);
  }, []);

  // never leave the user staring at the loader if the "ready" ping is missed
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setReady(true), 8000);
    return () => clearTimeout(t);
  }, [pending]);

  const finish = useCallback((fn: (p: Pending) => void) => {
    const p = ref.current;
    ref.current = null; // guard against double-settle
    setPending(null);
    if (p) fn(p);
  }, []);

  const askCancel = () =>
    Alert.alert('Cancel payment?', 'Your booking will not be confirmed until the payment is completed.', [
      { text: 'Keep paying', style: 'cancel' },
      { text: 'Cancel payment', style: 'destructive', onPress: () => finish((p) => p.reject(new PaymentCancelled())) },
    ]);

  const onMessage = (e: any) => {
    let msg: any;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'success') finish((p) => p.resolve(msg.data));
    else if (msg.type === 'dismiss') finish((p) => p.reject(new PaymentCancelled()));
    else if (msg.type === 'error') finish((p) => p.reject(new Error(msg.message || 'Payment failed')));
  };

  // UPI / wallet apps are opened through deep links (upi://, phonepe://, intent://...) - hand them to the OS.
  const onShouldStart = (req: { url: string }) => {
    const url = req.url || '';
    if (/^(https?:|about:|data:|blob:)/i.test(url)) return true;
    if (url.startsWith('intent://')) {
      const m = url.match(/scheme=([^;]+);/);
      const rest = url.replace(/^intent:\/\//, '').split('#Intent')[0];
      Linking.openURL(`${m ? m[1] : 'upi'}://${rest}`).catch(() => {});
    } else {
      Linking.openURL(url).catch(() => {});
    }
    return false;
  };

  return (
    <Modal visible={!!pending} animationType="slide" statusBarTranslucent onRequestClose={askCancel}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: CREAM }}>
        {/* Header */}
        <LinearGradient colors={['#FF8A1F', BRAND]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 10, paddingBottom: 18, paddingHorizontal: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name="lock-closed" size={17} color="#fff" />
              </View>
              <View>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Secure payment</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 1 }}>Encrypted by Razorpay</Text>
              </View>
            </View>
            <Pressable onPress={askCancel} hitSlop={12}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          {pending && (
            <View style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#8A6A4F', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }}>YOU ARE PAYING FOR</Text>
                <Text numberOfLines={1} style={{ color: INK, fontSize: 14, fontWeight: '600', marginTop: 2 }}>{pending.opts.description}</Text>
              </View>
              <Text style={{ color: BRAND, fontSize: 24, fontWeight: '900' }}>{rupees(pending.opts.amountPaise)}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Checkout */}
        <View style={{ flex: 1 }}>
          {pending && (
            <WebView
              key={pending.opts.orderId}
              originWhitelist={['*']}
              source={{ html: buildHtml(pending.opts), baseUrl: 'https://checkout.razorpay.com' }}
              onMessage={onMessage}
              onShouldStartLoadWithRequest={onShouldStart}
              onError={() => finish((p) => p.reject(new Error('Could not open the payment page. Check your internet connection.')))}
              javaScriptEnabled
              domStorageEnabled
              javaScriptCanOpenWindowsAutomatically
              setSupportMultipleWindows={false}
              mixedContentMode="always"
              overScrollMode="never"
              style={{ flex: 1, backgroundColor: CREAM }}
            />
          )}
          {!ready && pending && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFE8CC', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={BRAND} />
              </View>
              <Text style={{ color: INK, fontSize: 16, fontWeight: '700', marginTop: 16 }}>Opening secure checkout…</Text>
              <Text style={{ color: '#8A6A4F', fontSize: 13, marginTop: 4 }}>Please don't close the app</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{ paddingBottom: insets.bottom + 8, paddingTop: 8, alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3E6D6' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
            <Text style={{ color: '#6B5440', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>100% secure · UPI, cards, netbanking & wallets</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}