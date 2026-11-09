import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePets } from '../../context/PetsContext';
import { useAuth } from '../../context/AuthContext';
import { JITSI_DOMAIN, jitsiRoomFor } from '../../config/env';
import { hasCallPermissions, requestCallPermissions } from '../../utils/permissions';

type Phase = 'permissions' | 'connecting' | 'ready' | 'error';

const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const TOOLBAR = ['microphone', 'camera', 'toggle-camera', 'chat', 'tileview', 'hangup'];

/** Jitsi reads its settings from the URL hash, so the room opens exactly like in a mobile browser (no iframe / wrapper page). */
function roomUrl(room: string, displayName: string) {
  const opts: Record<string, unknown> = {
    'config.prejoinConfig.enabled': false,
    'config.prejoinPageEnabled': false,
    'config.disableDeepLinking': true,
    'config.enableClosePage': false,
    'config.disableFeedback': true,
    'config.startWithAudioMuted': false,
    'config.startWithVideoMuted': false,
    'config.toolbarButtons': TOOLBAR,
    'interfaceConfig.MOBILE_APP_PROMO': false,
    'interfaceConfig.SHOW_JITSI_WATERMARK': false,
    'userInfo.displayName': displayName,
  };
  const hash = Object.entries(opts).map(([k, v]) => `${k}=${encodeURIComponent(JSON.stringify(v))}`).join('&');
  return `https://${JITSI_DOMAIN}/${encodeURIComponent(room)}#${hash}`;
}

/**
 * Runs before Jitsi loads. It (1) asks the page itself for camera + mic right away, so the WebView grants access before Jitsi
 * needs it, and (2) reports every getUserMedia result / device count back to the app so a failure is visible, not silent.
 */
const MEDIA_PROBE = `
(function () {
  function post(m) { try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }
  function errStr(e) { return (e && e.name ? e.name : 'Error') + (e && e.message ? ': ' + e.message : ''); }
  var md = navigator.mediaDevices;
  post({ type: 'env', secure: !!window.isSecureContext, hasMedia: !!(md && md.getUserMedia) });
  if (!md || !md.getUserMedia) return;
  var orig = md.getUserMedia.bind(md);
  md.getUserMedia = function (c) {
    post({ type: 'gum', state: 'asked' });
    return orig(c).then(function (s) { post({ type: 'gum', state: 'ok' }); return s; },
      function (e) { post({ type: 'gum', state: 'fail', err: errStr(e) }); throw e; });
  };
  window.__wonpetTest = function () {
    var done = false;
    setTimeout(function () { if (!done) post({ type: 'test', ok: false, err: 'TIMEOUT' }); }, 6000);
    orig({ audio: true, video: true }).then(function (s) {
      done = true;
      s.getTracks().forEach(function (t) { t.stop(); });
      post({ type: 'test', ok: true });
      return md.enumerateDevices();
    }).then(function (d) {
      if (d) post({ type: 'devices', audio: d.filter(function (x) { return x.kind === 'audioinput'; }).length, video: d.filter(function (x) { return x.kind === 'videoinput'; }).length });
    }).catch(function (e) { done = true; post({ type: 'test', ok: false, err: errStr(e) }); });
  };
  window.__wonpetTest();
})();
true;
`;

// Some Android WebViews announce themselves as "wv"; a plain mobile-Chrome identity avoids any web-view special-casing.
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

/** Real video consultation screen: joins the same Jitsi room the vet opens on the web (room = wonpet-<appointment id>). */
export default function VideoCallScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { appointments } = usePets();
  const { user } = useAuth();
  const appointmentId: string = route.params.id;
  const a = appointments.find((x) => x.id === appointmentId);
  const room = jitsiRoomFor(appointmentId);

  const webRef = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const leftRef = useRef(false);
  const inRoomRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('permissions');
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaIssue, setMediaIssue] = useState<string | null>(null);
  const [dbg, setDbg] = useState<Record<string, string>>({});
  const note = (k: string, v: string) => setDbg((d) => ({ ...d, [k]: v }));

  // Permissions are normally asked at app start (next to location). This only prompts if they were skipped or denied.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = (await hasCallPermissions()) || (await requestCallPermissions());
      if (cancelled) return;
      if (ok) setPhase('connecting');
      else { setBlocked(true); setError('Camera and microphone access is needed for the video consultation. Please allow it in Settings and try again.'); setPhase('error'); }
    })();
    return () => { cancelled = true; };
  }, []);

  const uri = useMemo(() => roomUrl(room, user?.name || 'Pet owner'), [room, user?.name]);

  const leave = () => {
    if (leftRef.current) return;
    leftRef.current = true;
    navigation.goBack();
  };

  const endCall = () => {
    // hang up inside Jitsi first so the vet sees us leave; closing the screen tears the page down either way
    webRef.current?.injectJavaScript('try{APP.conference.hangup()}catch(e){} true;');
    setTimeout(leave, 600);
  };

  // after Jitsi's own hangup it navigates away from the room (to the welcome page) - treat that as the call ending
  const onNav = (n: WebViewNavigation) => {
    if (n.url.includes(room)) inRoomRef.current = true;
    else if (inRoomRef.current && !n.loading && n.url.includes(JITSI_DOMAIN)) leave();
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'env') {
        note('page', m.secure && m.hasMedia ? 'secure, WebRTC ok' : 'NO secure context / WebRTC');
        if (!m.secure || !m.hasMedia) setMediaIssue('This WebView cannot use the camera / microphone (insecure context or WebRTC unavailable).');
      } else if (m.type === 'test') {
        note('test', m.ok ? 'camera+mic OK' : `FAILED ${m.err}`);
        setMediaIssue(m.ok ? null : m.err === 'TIMEOUT'
          ? (IN_EXPO_GO
            ? "Expo Go can't give the in-app call access to the camera / mic. Use \"Open call in browser\" below, or run a development build."
            : 'Android did not answer the camera/mic request. The installed build may lack the camera / mic permissions - rebuild the app (a reload is not enough).')
          : m.err || 'Camera / microphone unavailable');
      } else if (m.type === 'devices') note('devices', `${m.audio} mic, ${m.video} camera`);
      else if (m.type === 'gum') {
        note('jitsi', m.state === 'fail' ? `FAILED ${m.err}` : m.state === 'ok' ? 'got camera/mic' : 'asking for camera/mic');
        if (m.state === 'fail') setMediaIssue(m.err || 'Camera / microphone unavailable');
      }
    } catch { /* ignore */ }
  };

  const title = a?.doctor ?? 'Video consultation';
  const sub = phase === 'error' ? 'Unable to connect' : `${a?.pet ?? 'Your pet'}${a?.time ? ` · ${a.time}` : ''}`;

  return (
    <View className="flex-1 bg-[#14110F]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-2.5">
        <View className="flex-1 pr-3">
          <Text className="text-white font-bold" numberOfLines={1}>{title}</Text>
          <Text className="text-white/60 text-xs" numberOfLines={1}>{sub}</Text>
        </View>
        <Pressable onPress={endCall} className="h-9 px-4 rounded-full items-center justify-center bg-red active:opacity-80">
          <Text className="text-white font-bold text-xs">Leave call</Text>
        </Pressable>
      </View>

      {!!mediaIssue && (
        <View className="mx-4 mb-2 rounded-xl bg-red/90 px-3 py-2">
          <Text className="text-white text-xs font-semibold">Camera / mic problem: {mediaIssue}</Text>
          <View className="flex-row gap-2 mt-2">
            <Pressable onPress={() => Linking.openURL(uri)} className="rounded-full bg-white px-3 py-1.5 active:opacity-80">
              <Text className="text-red text-[11px] font-bold">Open call in browser</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openSettings()} className="rounded-full border border-white/70 px-3 py-1.5 active:opacity-80">
              <Text className="text-white text-[11px] font-bold">App settings</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* temporary debug strip - tap to re-run the camera / mic test */}
      <Pressable onPress={() => webRef.current?.injectJavaScript('window.__wonpetTest&&window.__wonpetTest();true;')} className="mx-4 mb-2 rounded-lg bg-white/10 px-3 py-1.5">
        <Text className="text-white/80 text-[10px]">
          {['page', 'test', 'devices', 'jitsi'].filter((k) => dbg[k]).map((k) => `${k}: ${dbg[k]}`).join('  |  ') || 'checking camera & mic…'}
        </Text>
        <Text className="text-white/50 text-[10px]">tap here to re-test</Text>
      </Pressable>

      <View className="flex-1">
        {phase !== 'permissions' && phase !== 'error' && (
          <WebView
            {...({ ref: webRef } as object)}
            style={{ flex: 1, backgroundColor: '#000' }}
            originWhitelist={['*']}
            source={{ uri }}
            userAgent={Platform.OS === 'android' ? ANDROID_UA : undefined}
            injectedJavaScriptBeforeContentLoaded={MEDIA_PROBE}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            allowsFullscreenVideo
            setSupportMultipleWindows={false}
            onMessage={onMessage}
            onNavigationStateChange={onNav}
            onLoadEnd={() => setPhase((p) => (p === 'connecting' ? 'ready' : p))}
            onError={() => { setError('Could not reach the video service. Check your connection and try again.'); setPhase('error'); }}
            onHttpError={() => { setError('The video service is unavailable right now. Please try again shortly.'); setPhase('error'); }}
          />
        )}

        {(phase === 'permissions' || phase === 'connecting') && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-[#14110F]">
            <ActivityIndicator color="#fff" />
            <Text className="text-white/70 text-sm mt-3">{phase === 'permissions' ? 'Checking camera & microphone access…' : 'Connecting…'}</Text>
          </View>
        )}

        {phase === 'error' && (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-white text-lg font-bold text-center">Couldn't start the call</Text>
            <Text className="text-white/70 text-sm text-center mt-2">{error}</Text>
            <Pressable onPress={() => (blocked ? Linking.openSettings() : navigation.replace('VideoCall', { id: appointmentId }))} className="mt-5 h-11 px-6 rounded-full bg-primary items-center justify-center">
              <Text className="text-white font-bold">{blocked ? 'Open Settings' : 'Try again'}</Text>
            </Pressable>
          </View>
        )}
      </View>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}