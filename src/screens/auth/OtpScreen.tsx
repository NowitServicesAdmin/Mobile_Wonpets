import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AUTH, GradientButton } from '../../components/auth/AuthUI';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { errorMessage } from '../../services/api';
import { toApiRole } from '../../services/mappers';
import AuthLayout from './AuthLayout';

const OTP_LENGTH = 6;

export default function OtpScreen({ route, navigation }: any) {
  const { identifier, kind, mode, profile, restore } = route.params;
  const { startSession } = useAuth();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const input = useRef<TextInputInstance>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'login') {
        const session = await authService.verifyOtp(identifier, code);
        const r = await startSession(session);
        if (!r.ok) {
          WonPetsAlert.error("Can't sign in", r.message);
          navigation.goBack();
        } else if (session.restored) {
          toast.success("Welcome back! Your account has been restored.");
        }
        return; // success -> the navigator switches to the app
      }

      // sign-up: the backend checks the OTP and creates the account in one call
      const session = await authService.register({
        name: profile.name,
        identifier,
        otp: code,
        role: toApiRole(profile.role),
      });
      if (profile.role === 'user') {
        const r = await startSession(session);
        if (!r.ok) WonPetsAlert.error("Can't sign in", r.message);
      } else {
        WonPetsAlert.success('Account created', 'Doctor and store manager accounts need approval from WON PET before they can be used. You will be notified once approved - please use the web portal to finish your profile.');
        navigation.popToTop();
      }
    } catch (e) {
      toast.error(errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await authService.sendOtp(identifier, mode === 'login' ? 'login' : 'signup', restore === true);
      setSeconds(30);
      toast.success('A new code has been sent');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AuthLayout
      cat
      art="pets"
      smallSubtitle
      lead="Verify"
      accent="your account"
      subtitle={`Enter the ${OTP_LENGTH}-digit code sent to ${identifier}`}
    >
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 14,
              backgroundColor: '#fff',
              borderWidth: code.length === i ? 2 : 1,
              borderColor: code.length === i ? AUTH.orange : AUTH.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '800', color: AUTH.ink }}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={OTP_LENGTH}
        autoFocus
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />
      <GradientButton title={busy ? 'Verifying…' : 'Verify & Continue'} disabled={code.length < OTP_LENGTH || busy} onPress={verify} />
      <View style={{ alignItems: 'center', gap: 12 }}>
        {seconds > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="refresh" size={20} color={AUTH.ink} />
            <Text style={{ fontSize: 15, color: AUTH.ink }}>
              Resend code in <Text style={{ color: AUTH.orange, fontWeight: '800' }}>{seconds}s</Text>
            </Text>
          </View>
        ) : (
          <Pressable onPress={resend} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="refresh" size={20} color={AUTH.orange} />
            <Text style={{ fontSize: 15, color: AUTH.orange, fontWeight: '800' }}>Resend code</Text>
          </Pressable>
        )}
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pencil" size={18} color={AUTH.orange} />
          <Text style={{ fontSize: 15, color: AUTH.orange, fontWeight: '800' }}>Change {kind === 'email' ? 'email' : 'number'}</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}