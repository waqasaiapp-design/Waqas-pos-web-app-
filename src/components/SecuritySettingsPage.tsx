import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  KeyRound,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Save,
  RefreshCw,
} from 'lucide-react';
import { SecurityConfig, UserProfile } from '../types/pos';
import { WaqasDualProfileCards } from './WaqasDualProfileCards';

interface SecuritySettingsPageProps {
  securityConfig: SecurityConfig;
  onSaveSecurityConfig: (config: SecurityConfig) => void;
  onLockNow: () => void;
  currentUser: UserProfile;
}

export const SecuritySettingsPage: React.FC<SecuritySettingsPageProps> = ({
  securityConfig,
  onSaveSecurityConfig,
  onLockNow,
  currentUser,
}) => {
  const [appLockEnabled, setAppLockEnabled] = useState(securityConfig.appLockEnabled);
  const [biometricEnabled, setBiometricEnabled] = useState(securityConfig.biometricEnabled);
  const [pinCode, setPinCode] = useState(securityConfig.pinCode || '1234');
  const [autoLockSeconds, setAutoLockSeconds] = useState(securityConfig.autoLockSeconds || 300);
  const [lockOnBackground, setLockOnBackground] = useState(securityConfig.lockOnBackground ?? true);
  const [restrictSensitiveActions, setRestrictSensitiveActions] = useState(
    securityConfig.restrictSensitiveActions ?? true
  );

  const [showPin, setShowPin] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Check device biometric capability (WebAuthn Platform Authenticator)
  useEffect(() => {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          setBiometricSupported(available);
        })
        .catch(() => {
          setBiometricSupported(false);
        });
    } else {
      setBiometricSupported(false);
    }
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleTestBiometrics = async () => {
    if (!biometricSupported) {
      alert('Biometric hardware (Fingerprint / Face Unlock) is not detected on this browser/device.');
      return;
    }

    try {
      showToast('Please touch your fingerprint sensor or verify your face...');
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'WAQAS MART POS' },
          user: {
            id: new Uint8Array([1, 2, 3, 4]),
            name: currentUser.displayName || 'Owner',
            displayName: currentUser.displayName || 'Owner',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      if (credential) {
        showToast('Biometric authentication verified successfully! Fingerprint linked.');
        setBiometricEnabled(true);
      }
    } catch (err: any) {
      console.warn('Biometric test cancelled or unavailable:', err);
      showToast('Biometric verification cancelled or unavailable on this browser.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length < 4) {
      alert('PIN Code must be at least 4 digits.');
      return;
    }

    const updated: SecurityConfig = {
      appLockEnabled,
      biometricEnabled,
      pinCode,
      autoLockSeconds,
      lockOnBackground,
      restrictSensitiveActions,
      lastUnlockedAt: Date.now(),
    };

    onSaveSecurityConfig(updated);
    showToast('Security & App Lock settings updated successfully!');
  };

  return (
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-900 p-3 sm:p-5 pb-32 space-y-4 font-sans max-w-4xl mx-auto overflow-x-hidden">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* WAQAS MART Dual Profile Cards (Software Owner & Mart Owner) */}
      <div className="space-y-2">
        <WaqasDualProfileCards variant="sidebar" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369a1] text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Security Settings & App Lock (سیکیورٹی سیٹنگز اور ایپ لاک)
            </h2>
            <p className="text-xs text-slate-500">
              Biometric fingerprint, PIN protection, auto-lock timers, and permission guards
            </p>
          </div>
        </div>

        <button
          onClick={onLockNow}
          className="px-4 py-2 bg-slate-900 hover:bg-black active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>Lock App Now (ابھی لاک کریں)</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: Main App Lock Toggle */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Enable App Lock (ایپ لاک فعال کریں)</h3>
              <p className="text-xs text-slate-500">
                Requires PIN or Biometric authentication before accessing POS workstation
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={appLockEnabled}
                onChange={(e) => setAppLockEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0369a1]"></div>
            </label>
          </div>

          {/* Section 2: Biometric Authentication */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  Device Biometrics (فنگر پرنٹ / فیس انلاک)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {biometricSupported === true
                    ? 'Biometric hardware verified available on this device'
                    : 'WebAuthn platform biometric authentication'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestBiometrics}
                className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
              >
                Test Sensor
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => setBiometricEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0369a1]"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Master PIN Code */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Master Security PIN Code (۴ ہندسوں کا ماسٹر پن کوڈ) *
            </label>
            <div className="relative max-w-xs">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={8}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="1234"
                className="w-full text-base font-mono font-bold tracking-widest px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:border-sky-600 bg-slate-50"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Used to unlock the terminal, access sensitive settings, and perform system reset.
            </p>
          </div>

          {/* Section 4: Auto-Lock Duration */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Auto-Lock Inactivity Timer (خودکار لاک ہونے کا وقت)
            </label>
            <select
              value={autoLockSeconds}
              onChange={(e) => setAutoLockSeconds(parseInt(e.target.value, 10))}
              className="max-w-xs w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 outline-none"
            >
              <option value={60}>1 Minute of Inactivity</option>
              <option value={180}>3 Minutes of Inactivity</option>
              <option value={300}>5 Minutes of Inactivity (Recommended)</option>
              <option value={600}>10 Minutes of Inactivity</option>
              <option value={0}>Never Auto-Lock (صرف دستی لاک)</option>
            </select>
          </div>

          {/* Section 5: Lock when minimizing / switching tab */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="font-bold text-xs text-slate-900 block">
                Lock when minimizing or switching tabs
              </span>
              <span className="text-[10px] text-slate-500">
                Immediately locks if cashier switches windows
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={lockOnBackground}
                onChange={(e) => setLockOnBackground(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0369a1]"></div>
            </label>
          </div>

          {/* Section 6: Restrict Sensitive Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="font-bold text-xs text-slate-900 block">
                Restrict Sensitive Actions for Staff
              </span>
              <span className="text-[10px] text-slate-500">
                Require Master PIN to delete bills, modify prices or access ledgers
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={restrictSensitiveActions}
                onChange={(e) => setRestrictSensitiveActions(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0369a1]"></div>
            </label>
          </div>
        </div>

        {/* Security Note on Biometrics */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-950">
            <ShieldCheck className="w-4 h-4 text-sky-700" />
            <span>Privacy & Hardware Security Guarantee</span>
          </div>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            Raw fingerprint or facial biometric data is <strong>never stored</strong> or uploaded.
            Authentication uses device-native secure enclaves (WebAuthn / FIDO2) strictly verified by
            your hardware.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#0369a1] hover:bg-sky-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Security Configuration (محفوظ کریں)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
