import React, { useState } from 'react';
import {
  User,
  X,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  QrCode,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { syncService } from '../utils/syncService';
import { safeFetchJson } from '../utils/apiClient';
import { UserProfile, DeviceInfo } from '../types/pos';
import confetti from 'canvas-confetti';

interface AccountLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, device: DeviceInfo, storeState?: any) => void;
  onOpenPairQr: () => void;
}

export const AccountLoginModal: React.FC<AccountLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenPairQr,
}) => {
  const [identifier, setIdentifier] = useState('muhammedsaad255251@gmail.com');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter registered email or mobile number.');
      return;
    }
    if (!pin.trim()) {
      setErrorMessage('Please enter your store security PIN or password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const currentDev = syncService.getDevice();

    try {
      const res = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          pin: pin.trim(),
          deviceName: currentDev.deviceName,
          deviceType: currentDev.deviceType,
          browser: currentDev.browser,
          os: currentDev.os,
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Authentication failed. Please verify credentials.');
      }

      if (data.sessionToken) {
        syncService.setSessionToken(data.sessionToken);
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onLoginSuccess(data.user, data.device, data.storeState);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error signing in. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-[#057a44] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-emerald-200">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Store Account Login</h3>
              <p className="text-xs text-emerald-100 font-medium">WAQAS MART Multi-Device Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Secure authorization protected by store master credentials & device identity.</span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Registered Email / Mobile</label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. muhammedsaad255251@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Store Security PIN / Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter Store Security PIN (default: 1234 or your PIN)"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400">
                Authorized owners can also scan QR code from existing device without typing passwords.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#057a44] text-white font-bold rounded-2xl text-xs hover:bg-[#046337] transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Authorize & Sign In</span>
            </button>
          </form>

          {/* Quick QR Alternative */}
          <div className="pt-2 border-t border-slate-100 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPairQr();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 py-1 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Or Pair Faster via QR Code Scanner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
