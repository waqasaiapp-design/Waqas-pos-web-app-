import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  generateRecoveryKey,
  normalizeRecoveryKey,
  hashPasswordClient,
  generateSalt,
} from '../../utils/cryptoSecurity';
import { safeFetchJson } from '../../utils/apiClient';
import confetti from 'canvas-confetti';

interface MasterAdminRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}

export const MasterAdminRecoveryModal: React.FC<MasterAdminRecoveryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'verify' | 'new_password' | 'done'>('verify');
  const [username, setUsername] = useState('admin');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New Replacement Recovery Key
  const [newReplacementKey, setNewReplacementKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanKey = normalizeRecoveryKey(recoveryKeyInput);

    if (!cleanUser) {
      setErrorMsg('Please enter your Master Admin username.');
      return;
    }

    if (!cleanKey || cleanKey.length < 16) {
      setErrorMsg('Please enter a valid 16-20 character Master Admin Recovery Key.');
      return;
    }

    setLoading(true);

    try {
      // Generate replacement key ready for next step
      const replacement = generateRecoveryKey();
      setNewReplacementKey(replacement);

      // Check online/local server verification
      const res = await safeFetchJson('/api/auth/master-admin/verify-recovery', {
        method: 'POST',
        body: JSON.stringify({
          username: cleanUser,
          recoveryKey: recoveryKeyInput.trim(),
        }),
      });

      if (res.data?.success) {
        setStep('new_password');
      } else {
        throw new Error(res.data?.message || 'Invalid Master Admin username or Recovery Key.');
      }
    } catch (err: any) {
      // Check offline local storage verification if backend not running
      const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
      if (offlineMaster) {
        try {
          const parsed = JSON.parse(offlineMaster);
          const computedHash = await hashPasswordClient(cleanKey, parsed.recoveryKeySalt);
          if (
            parsed.user?.username?.toLowerCase() === cleanUser &&
            computedHash === parsed.recoveryKeyHash
          ) {
            setStep('new_password');
            setLoading(false);
            return;
          }
        } catch {}
      }

      setErrorMsg(
        err?.message ||
          'Invalid Recovery Key or username. Please check and try again. (If lost, access cannot be recovered without a valid backup).'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!confirmedSaved) {
      setErrorMsg('Please confirm that you have saved your replacement Recovery Key.');
      return;
    }

    setLoading(true);

    try {
      // 1. Submit reset to backend
      const res = await safeFetchJson('/api/auth/master-admin/recover', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          recoveryKey: recoveryKeyInput.trim(),
          newPassword: newPassword,
          newRecoveryKey: newReplacementKey,
        }),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Password reset failed.');
      }

      // Update offline local storage
      const salt = generateSalt(16);
      const passHash = await hashPasswordClient(newPassword, salt);
      const recSalt = generateSalt(16);
      const recHash = await hashPasswordClient(normalizeRecoveryKey(newReplacementKey), recSalt);

      const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
      if (offlineMaster) {
        const parsed = JSON.parse(offlineMaster);
        parsed.passwordSalt = salt;
        parsed.passwordHash = passHash;
        parsed.recoveryKeySalt = recSalt;
        parsed.recoveryKeyHash = recHash;
        localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(parsed));
      }

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setStep('done');
    } catch (err: any) {
      // Offline fallback
      if (err?.status === 0 || err?.name === 'ApiConnectionError') {
        const salt = generateSalt(16);
        const passHash = await hashPasswordClient(newPassword, salt);
        const recSalt = generateSalt(16);
        const recHash = await hashPasswordClient(normalizeRecoveryKey(newReplacementKey), recSalt);

        const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
        if (offlineMaster) {
          const parsed = JSON.parse(offlineMaster);
          parsed.passwordSalt = salt;
          parsed.passwordHash = passHash;
          parsed.recoveryKeySalt = recSalt;
          parsed.recoveryKeyHash = recHash;
          localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(parsed));
        }

        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        setStep('done');
      } else {
        setErrorMsg(err?.message || 'Failed to update Master Admin password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNewKey = () => {
    navigator.clipboard.writeText(newReplacementKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-900 to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Master Admin Offline Recovery</h3>
              <p className="text-[11px] text-slate-400">
                Recover access using your confidential Recovery Key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Master Admin Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. admin or waqas"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Master Admin Recovery Key
                </label>
                <input
                  type="text"
                  required
                  value={recoveryKeyInput}
                  onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                  placeholder="WQP-XXXX-XXXX-XXXX-XXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs font-mono tracking-wider uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enter the exact 20-character key generated during initial setup.
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-[11px] text-slate-300 leading-relaxed">
                <p className="font-semibold text-amber-400 mb-1">Notice on Offline Access:</p>
                If this Recovery Key was lost or not saved, Master Admin access cannot be recovered without restoring an encrypted database backup.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  {loading ? 'Verifying Key...' : 'Verify Recovery Key'}
                </button>
              </div>
            </form>
          )}

          {step === 'new_password' && (
            <form onSubmit={handleSetNewPassword} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Recovery key successfully validated. Create your new password below.</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    New Master Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              </div>

              {/* Mandatory Replacement Recovery Key */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400">
                    New Replacement Recovery Key (Old key invalidated):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyNewKey}
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-center text-sm font-bold text-emerald-300 tracking-wider">
                  {newReplacementKey}
                </div>
                <label className="flex items-start gap-2 pt-1 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedSaved}
                    onChange={(e) => setConfirmedSaved(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-300">
                    I have saved this new replacement Recovery Key in a secure place.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="submit"
                  disabled={loading || !confirmedSaved}
                  className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition cursor-pointer ${
                    confirmedSaved && !loading
                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loading ? 'Updating Password...' : 'Save New Password & Invalidate Old Key'}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-white">Password Successfully Reset</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Your Master Admin password has been updated and the previous recovery key has been invalidated. You can now log in.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSuccess(username);
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
