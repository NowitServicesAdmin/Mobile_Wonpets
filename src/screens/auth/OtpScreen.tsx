import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Button, cn } from '../../components/ui';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { errorMessage } from '../../services/api';
import { toApiGender, toApiRole } from '../../services/mappers';
import AuthLayout from './AuthLayout';

const OTP_LENGTH = 6;

export default function OtpScreen({ route, navigation }: any) {
  const { identifier, kind, mode, profile } = route.params;
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
        const r = await startSession(await authService.verifyOtp(identifier, code));
        if (!r.ok) {
          WonPetsAlert.error("Can't sign in", r.message);
          navigation.goBack();
        }
        return; // success -> the navigator switches to the app
      }

      // sign-up: the backend checks the OTP and creates the account in one call
      const session = await authService.register({
        name: profile.name,
        identifier,
        otp: code,
        role: toApiRole(profile.role),
        gender: toApiGender(profile.gender) as any,
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
      await authService.sendOtp(identifier, mode === 'login' ? 'login' : 'signup');
      setSeconds(30);
      toast.success('A new code has been sent');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AuthLayout title="Verify your account" subtitle={`Enter the ${OTP_LENGTH}-digit code sent to ${identifier}.`}>
      <Pressable onPress={() => input.current?.focus()} className="flex-row gap-2">
        {Array.from({ length: OTP_LENGTH }, (_, i) => (
          <View key={i} className={cn('flex-1 h-14 rounded-2xl bg-white border-[1.5px] items-center justify-center', code.length === i ? 'border-primary' : 'border-line')}>
            <Text className="text-2xl font-extrabold text-ink">{code[i] ?? ''}</Text>
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
        className="h-px opacity-0"
      />
      <Button title={busy ? 'Verifying…' : 'Verify & continue'} disabled={code.length < OTP_LENGTH || busy} onPress={verify} />
      <Text className="text-center text-muted">
        {seconds > 0 ? `Resend code in ${seconds}s` : <Text className="text-primary font-extrabold" onPress={resend}>Resend code</Text>}
      </Text>
      <Pressable onPress={() => navigation.goBack()}><Text className="text-center text-primary font-bold">Change {kind === 'email' ? 'email' : 'number'}</Text></Pressable>
    </AuthLayout>
  );
}
