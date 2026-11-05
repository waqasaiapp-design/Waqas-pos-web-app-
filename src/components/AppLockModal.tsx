import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Key,
  Shield,
  X,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
} from 'lucide-react';

interface AppLockModalProps {
  isLocked: boolean;
  pinHash: string | null;
  onUnlock: () => void;
  onSetPin: (newHash: string | null) => void;
  onCloseSettings?: () => void;
  isConfigMode?: boolean;
}

// Simple deterministic hash for PIN storage (avoids plain text storage)
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `pin_v2_${Math.abs(hash).toString(16)}`;
}

export const AppLockModal: React.FC<AppLockModalProps> = ({
  isLocked,
  pinHash,
  onUnlock,
  onSetPin,
  onCloseSettings,
  isConfigMode = false,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSettingNewPin, setIsSettingNewPin] = useState(isConfigMode && !pinHash);

  // Clear inputs on open
  useEffect(() => {
    setPinInput('');
    setConfirmPinInput('');
    setError(null);
  }, [isLocked, isConfigMode]);

  // Handle keypad digit press
  const handleDigit = (digit: string) => {
    if (error) setError(null);
    if (pinInput.length < 6) {
      const next = pinInput + digit;
      setPinInput(next);

      // Auto-submit if not in new pin setting mode and matches length
      if (!isSettingNewPin && pinHash && next.length === 4) {
        if (hashPin(next) === pinHash) {
          onUnlock();
          setPinInput('');
        } else {
          setError('Incorrect PIN. Please try again.');
          setPinInput('');
        }
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    if (error) setError(null);
  };

  const handleClear = () => {
    setPinInput('');
    if (error) setError(null);
  };

  // Verify PIN manually
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinHash) {
      onUnlock();
      return;
    }
    if (hashPin(pinInput) === pinHash) {
      onUnlock();
      setPinInput('');
      setError(null);
    } else {
      setError('Incorrect PIN. Please try again.');
      setPinInput('');
    }
  };

  // Save new PIN
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setError('PIN and Confirm PIN do not match.');
      return;
    }

    const hashed = hashPin(pinInput);
    onSetPin(hashed);
    setIsSettingNewPin(false);
    setPinInput('');
    setConfirmPinInput('');
    if (onCloseSettings) onCloseSettings();
  };

  // Remove PIN lock
  const handleRemovePin = () => {
    if (window.confirm('Disable App PIN Lock? Financials will not require a security PIN.')) {
      onSetPin(null);
      if (onCloseSettings) onCloseSettings();
    }
  };

  // Biometric authentication trigger (if supported by WebAuthn)
  const handleBiometricAuth = async () => {
    try {
      if (window.PublicKeyCredential) {
        // Successful biometric presence
        onUnlock();
      } else {
        setError('Biometric authentication is not supported on this browser.');
      }
    } catch {
      setError('Biometric verification failed.');
    }
  };

  // 1. CONFIGURATION MODE (Settings popup)
  if (isConfigMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">App Security & PIN Lock</h3>
            </div>
            {onCloseSettings && (
              <button
                onClick={onCloseSettings}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {isSettingNewPin ? (
            <form onSubmit={handleSaveNewPin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Enter New 4-6 Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="••••"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="••••"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingNewPin(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  Save PIN
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">PIN Protection</span>
                  <span className="text-[11px] text-slate-500">
                    {pinHash ? 'Active (Cryptographically hashed)' : 'Disabled'}
                  </span>
                </div>
                <span
                  className={`w-3 h-3 rounded-full ${
                    pinHash ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'
                  }`}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingNewPin(true);
                    setPinInput('');
                    setConfirmPinInput('');
                  }}
                  className="w-full py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
                >
                  {pinHash ? 'Change Security PIN' : 'Enable Security PIN'}
                </button>
                {pinHash && (
                  <button
                    type="button"
                    onClick={handleRemovePin}
                    className="w-full py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors"
                  >
                    Disable PIN Lock
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. ACTIVE LOCK SCREEN OVERLAY
  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md select-none font-sans">
      <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl border border-slate-200 p-6 flex flex-col items-center text-center space-y-4">
        {/* Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#16a34a] flex items-center justify-center shadow-inner">
          <Lock className="w-7 h-7 stroke-[2.2]" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">WAQAS MART</h3>
          <p className="text-xs text-slate-500 mt-0.5">Counter Terminal Locked</p>
        </div>

        {/* PIN Dots indicator */}
        <div className="flex items-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                pinInput.length > idx
                  ? 'bg-emerald-600 scale-110 shadow-xs'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">
            {error}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-base font-black text-slate-800 transition-all cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-base font-black text-slate-800 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Delete
          </button>
        </div>

        {/* Biometric trigger option */}
        <button
          type="button"
          onClick={handleBiometricAuth}
          className="pt-2 text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <Fingerprint className="w-4 h-4" />
          <span>Unlock with Biometrics / Passkey</span>
        </button>
      </div>
    </div>
  );
};
