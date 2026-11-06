import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  UserCheck,
  ArrowRight,
  HardDrive,
  Printer,
  Sparkles,
} from 'lucide-react';
import { generateRecoveryKey, normalizeRecoveryKey, hashPasswordClient, generateSalt } from '../../utils/cryptoSecurity';
import { safeFetchJson } from '../../utils/apiClient';
import { AuthUser } from '../../types/pos';
import confetti from 'canvas-confetti';

interface MasterAdminSetupModalProps {
  isOpen: boolean;
  onSuccess: (user: AuthUser, token: string) => void;
}

export const MasterAdminSetupModal: React.FC<MasterAdminSetupModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('Muhammad Waqas');
  const [phone, setPhone] = useState('03429634133');
  const [whatsapp, setWhatsapp] = useState('03228570782');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Generated Recovery Key
  const [recoveryKey, setRecoveryKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate cryptographic recovery key when modal opens
  useEffect(() => {
    if (isOpen && !recoveryKey) {
      setRecoveryKey(generateRecoveryKey());
    }
  }, [isOpen, recoveryKey]);

  if (!isOpen) return null;

  // Password strength check
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-200', score: 0 };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', score };
    if (score <= 4) return { label: 'Good', color: 'bg-amber-500', score };
    return { label: 'Strong', color: 'bg-emerald-500', score };
  };

  const strength = getPasswordStrength();

  const handleCopyKey = () => {
    if (!recoveryKey) return;
    navigator.clipboard.writeText(recoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handlePrintKey = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>WAQAS POS - Master Admin Emergency Recovery Key</title>
          <style>
            body { font-family: monospace; padding: 40px; color: #1e293b; }
            .box { border: 2px dashed #0f172a; padding: 24px; border-radius: 12px; margin-top: 20px; }
            .key { font-size: 26px; font-weight: bold; letter-spacing: 2px; color: #0f766e; }
            .warning { color: #b91c1c; font-weight: bold; margin-top: 16px; }
          </style>
        </head>
        <body>
          <h2>WAQAS POS SOFTWARE - PRIVATE MASTER ADMIN RECOVERY KEY</h2>
          <p><strong>Device:</strong> Local Dedicated Terminal</p>
          <p><strong>Master Admin Username:</strong> ${username || 'admin'}</p>
          <p><strong>Date Generated:</strong> ${new Date().toLocaleString()}</p>
          <div class="box">
            <div>CONFIDENTIAL RECOVERY KEY:</div>
            <div class="key">${recoveryKey}</div>
          </div>
          <p class="warning">IMPORTANT: Store this key in a physical safe. Never share or upload this key. If lost without backup, Master Admin access is permanently irrecoverable.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setErrorMsg('Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (!confirmedSaved) {
      setErrorMsg('You must check the confirmation box acknowledging that you have safely stored the Recovery Key.');
      return;
    }

    setLoading(true);

    try {
      // 1. Try sending to backend
      const res = await safeFetchJson('/api/auth/master-admin/setup', {
        method: 'POST',
        body: JSON.stringify({
          username: cleanUser,
          fullName: fullName.trim() || 'Master Admin',
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          password: password,
          recoveryKey: recoveryKey,
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to complete Master Admin setup.');
      }

      // Also persist to local encrypted offline storage so app functions offline
      const salt = generateSalt(16);
      const passHash = await hashPasswordClient(password, salt);
      const recSalt = generateSalt(16);
      const recHash = await hashPasswordClient(normalizeRecoveryKey(recoveryKey), recSalt);

      const localMasterData = {
        isConfigured: true,
        user: {
          id: data.user?.id || 'USR-MASTER-ADMIN-01',
          username: cleanUser,
          fullName: fullName.trim() || 'Master Admin',
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          role: 'MASTER_ADMIN',
          createdAt: new Date().toISOString(),
        },
        passwordSalt: salt,
        passwordHash: passHash,
        recoveryKeySalt: recSalt,
        recoveryKeyHash: recHash,
      };

      localStorage.setItem('waqas_pos_master_admin_configured', 'true');
      localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(localMasterData));

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      onSuccess(data.user, data.token);
    } catch (err: any) {
      // If backend was unreachable but client is offline, complete offline local setup
      if (err?.status === 0 || err?.name === 'ApiConnectionError') {
        const salt = generateSalt(16);
        const passHash = await hashPasswordClient(password, salt);
        const recSalt = generateSalt(16);
        const recHash = await hashPasswordClient(normalizeRecoveryKey(recoveryKey), recSalt);

        const localUser: AuthUser = {
          id: 'USR-MASTER-ADMIN-01',
          username: cleanUser,
          fullName: fullName.trim() || 'Master Admin',
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          role: 'MASTER_ADMIN',
          createdAt: new Date().toISOString(),
        };

        const localMasterData = {
          isConfigured: true,
          user: localUser,
          passwordSalt: salt,
          passwordHash: passHash,
          recoveryKeySalt: recSalt,
          recoveryKeyHash: recHash,
        };

        const offlineToken = `TOKEN-OFFLINE-MASTER-${Date.now()}`;
        localStorage.setItem('waqas_pos_master_admin_configured', 'true');
        localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(localMasterData));
        localStorage.setItem(
          'waqas_mart_auth_session',
          JSON.stringify({ token: offlineToken, user: localUser })
        );

        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        onSuccess(localUser, offlineToken);
      } else {
        setErrorMsg(err?.message || 'Error configuring Master Admin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 text-slate-100">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 border-b border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold tracking-wider uppercase text-emerald-300 mb-1.5">
                <Sparkles className="w-3 h-3" /> One-Time Device Master Admin Setup
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Create Private Master Administrator
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Configure the sole owner and administrative authority for this device.
                Once completed, registration will be <strong>permanently locked</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Credentials Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Master Admin Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. admin or waqas"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Lowercase alphanumeric or underscore only.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Owner Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Muhammad Waqas"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03429634133"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="03228570782"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Password Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Master Password <span className="text-red-400">*</span>
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${strength.color} text-slate-950`}>
                  {strength.label}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
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
                Confirm Master Password <span className="text-red-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Recovery Key Section */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Generated Master Admin Recovery Key</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintKey}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 text-[11px] font-medium transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 text-[11px] font-medium transition cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/50 text-center">
              <div className="font-mono text-lg md:text-xl font-black text-emerald-400 tracking-wider select-all">
                {recoveryKey}
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              This recovery key is your <strong>only offline safety net</strong>. If you ever forget your Master Admin password, you will need this key to regain access. It is hashed before storage and cannot be viewed again once setup is complete.
            </p>

            <label className="flex items-start gap-2.5 pt-1 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedSaved}
                onChange={(e) => setConfirmedSaved(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-semibold text-emerald-300">
                I have written down and saved this Recovery Key in a secure offline physical location. I understand that if I lose my password and this key, access cannot be recovered.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading || !confirmedSaved}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-lg cursor-pointer ${
                confirmedSaved && !loading
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{loading ? 'Initializing Device Master Admin...' : 'Complete Master Admin Setup & Lock Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
