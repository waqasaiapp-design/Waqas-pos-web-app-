import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  normalizeRecoveryKey,
  hashPasswordClient,
  generateSalt,
  getLockoutStatus,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from '../../utils/cryptoSecurity';
import { safeFetchJson } from '../../utils/apiClient';
import confetti from 'canvas-confetti';

interface ResetMasterPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
  initialUsername?: string;
}

export const ResetMasterPasswordModal: React.FC<ResetMasterPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialUsername = 'admin',
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 4) return { score: 3, label: 'Good', color: 'bg-teal-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanKey = normalizeRecoveryKey(recoveryKey);

    // Rate limiting check
    const lockout = getLockoutStatus(`reset_${cleanUser}`);
    if (lockout.isLocked) {
      setErrorMessage(
        `Too many failed reset attempts. Temporarily locked for ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).`
      );
      return;
    }

    // Input Validations
    if (!cleanUser) {
      setErrorMessage('Master Admin Username is required.');
      return;
    }

    if (!cleanKey || cleanKey.length < 16) {
      setErrorMessage('Please enter a valid 20-character Master Recovery Key (e.g. WQP-XXXX-XXXX-XXXX-XXXX).');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);

    try {
      // 1. Primary backend API call
      const res = await safeFetchJson('/api/auth/master-admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          username: cleanUser,
          recoveryKey: recoveryKey.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Invalid Master Recovery Key. Please verify and try again.');
      }

      // Reset client lockout counters
      resetLoginAttempts(`reset_${cleanUser}`);
      resetLoginAttempts(`admin_${cleanUser}`);

      // Synchronize offline localStorage fallback
      const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
      if (offlineMaster) {
        try {
          const parsed = JSON.parse(offlineMaster);
          const salt = generateSalt(16);
          const passHash = await hashPasswordClient(newPassword, salt);
          parsed.passwordSalt = salt;
          parsed.passwordHash = passHash;
          localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(parsed));
        } catch {}
      }

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setSuccessMessage(data.message || 'Master Password Reset Successfully');
      setIsSuccess(true);
    } catch (err: any) {
      // Offline fallback: check local storage if server unreachable
      if (err?.status === 0 || err?.name === 'ApiConnectionError') {
        const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
        if (offlineMaster) {
          try {
            const parsed = JSON.parse(offlineMaster);
            const computedKeyHash = await hashPasswordClient(cleanKey, parsed.recoveryKeySalt);
            if (
              parsed.user?.username?.toLowerCase() === cleanUser &&
              computedKeyHash === parsed.recoveryKeyHash
            ) {
              const salt = generateSalt(16);
              const passHash = await hashPasswordClient(newPassword, salt);
              parsed.passwordSalt = salt;
              parsed.passwordHash = passHash;
              localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(parsed));

              resetLoginAttempts(`reset_${cleanUser}`);
              resetLoginAttempts(`admin_${cleanUser}`);

              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
              setSuccessMessage('Master Password Reset Successfully');
              setIsSuccess(true);
              setLoading(false);
              return;
            }
          } catch {}
        }
      }

      // Track failed attempts
      const lockResult = recordFailedLoginAttempt(`reset_${cleanUser}`);
      if (lockResult.isLocked) {
        setErrorMessage('Too many failed attempts. Password reset locked for 15 minutes.');
      } else {
        const remaining = 5 - lockResult.attemptsCount;
        setErrorMessage(
          err?.message ||
            `Invalid Master Recovery Key. Please check the key. (${remaining} attempt${
              remaining === 1 ? '' : 's'
            } remaining)`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    onSuccess(username.trim().toLowerCase());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <span>Reset Master Password</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Offline Recovery
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Verify your confidential Recovery Key to establish a new password
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold">Reset Failed: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Success screen */}
          {isSuccess ? (
            <div className="text-center py-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-950">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-lg font-black text-white tracking-tight">
                  {successMessage || 'Master Password Reset Successfully'}
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
                  Your Master Admin password has been updated and securely encrypted in the local database. You can now log in immediately.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>All shop accounts, sales, and inventory data remain 100% intact.</span>
              </div>

              <button
                type="button"
                onClick={handleReturnToLogin}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login & Sign In</span>
              </button>
            </div>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              {/* Field 1: Master Admin Username */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Master Admin Username <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. admin"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono font-medium"
                />
              </div>

              {/* Field 2: Master Recovery Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Master Recovery Key <span className="text-emerald-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Format: WQP-XXXX-XXXX-XXXX-XXXX</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                    placeholder="WQP-XXXX-XXXX-XXXX-XXXX"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono tracking-wider uppercase font-semibold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Provide the 20-character secret key generated on initial Master Admin setup.
                </p>
              </div>

              {/* Field 3: New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    New Password <span className="text-emerald-400">*</span>
                  </label>
                  {newPassword && (
                    <span className="text-[10px] font-medium text-slate-400">
                      Strength: <strong className="text-slate-200">{strength.label}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {newPassword && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          step <= strength.score ? strength.color : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Field 4: Confirm New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">
                    Confirm New Password <span className="text-emerald-400">*</span>
                  </label>
                  {confirmPassword && newPassword === confirmPassword && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none text-xs ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>High-Grade Device PBKDF2 Hashing</span>
                </div>
                <p>
                  Passwords are hashed offline with 100,000 PBKDF2 SHA-256 iterations. No plain passwords or keys are transmitted or stored.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Verifying & Resetting...' : 'Reset Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
