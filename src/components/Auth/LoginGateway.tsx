import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Store,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  HardDrive,
  Info,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { AuthUser, ShopAccount } from '../../types/pos';
import { safeFetchJson } from '../../utils/apiClient';
import {
  getLockoutStatus,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  hashPasswordClient,
} from '../../utils/cryptoSecurity';
import { MasterAdminSetupModal } from './MasterAdminSetupModal';
import { MasterAdminRecoveryModal } from './MasterAdminRecoveryModal';
import { ResetMasterPasswordModal } from './ResetMasterPasswordModal';
import confetti from 'canvas-confetti';

interface LoginGatewayProps {
  onMasterAdminSuccess: (user: AuthUser, token: string) => void;
  onShopOwnerSuccess: (user: AuthUser, shop: ShopAccount, token: string) => void;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  onMasterAdminSuccess,
  onShopOwnerSuccess,
}) => {
  // Tab: 'SHOP_LOGIN' | 'MASTER_ADMIN'
  const [activeTab, setActiveTab] = useState<'SHOP_LOGIN' | 'MASTER_ADMIN'>('SHOP_LOGIN');

  // Master Admin state
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Shop Owner state
  const [shopUsername, setShopUsername] = useState('waqasmart');
  const [shopPassword, setShopPassword] = useState('');
  const [showShopPassword, setShowShopPassword] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  // Setup & Recovery Modals
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);

  // Lockout Timers
  const [adminLockout, setAdminLockout] = useState<{ isLocked: boolean; remainingSeconds: number }>({
    isLocked: false,
    remainingSeconds: 0,
  });
  const [shopLockout, setShopLockout] = useState<{ isLocked: boolean; remainingSeconds: number }>({
    isLocked: false,
    remainingSeconds: 0,
  });

  // Check Master Admin configuration status on mount
  useEffect(() => {
    const checkMasterAdminStatus = async () => {
      try {
        const res = await safeFetchJson('/api/auth/master-admin/status');
        if (res.data) {
          setIsConfigured(res.data.isConfigured);
          if (!res.data.isConfigured) {
            setShowSetupModal(true);
          }
        }
      } catch {
        // Fallback to local offline check
        const offlineFlag = localStorage.getItem('waqas_pos_master_admin_configured');
        const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
        if (offlineFlag === 'true' && offlineMaster) {
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
          setShowSetupModal(true);
        }
      }
    };

    checkMasterAdminStatus();
  }, []);

  // Update Lockout countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      const aLock = getLockoutStatus(`admin_${adminUsername}`);
      setAdminLockout({ isLocked: aLock.isLocked, remainingSeconds: aLock.remainingSeconds });

      const sLock = getLockoutStatus(`shop_${shopUsername}`);
      setShopLockout({ isLocked: sLock.isLocked, remainingSeconds: sLock.remainingSeconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [adminUsername, shopUsername]);

  const formatLockoutTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle Master Admin Login
  const handleMasterAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const lock = getLockoutStatus(`admin_${adminUsername}`);
    if (lock.isLocked) {
      setAdminError(`Account temporarily locked due to failed attempts. Try again in ${formatLockoutTime(lock.remainingSeconds)}.`);
      return;
    }

    setAdminLoading(true);

    try {
      const res = await safeFetchJson('/api/auth/master-admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: adminUsername.trim().toLowerCase(),
          password: adminPassword,
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Invalid Master Admin username or password.');
      }

      resetLoginAttempts(`admin_${adminUsername}`);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onMasterAdminSuccess(data.user, data.token);
    } catch (err: any) {
      // Check offline local verification if backend unreachable
      if (err?.status === 0 || err?.name === 'ApiConnectionError') {
        const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
        if (offlineMaster) {
          try {
            const parsed = JSON.parse(offlineMaster);
            const computed = await hashPasswordClient(adminPassword, parsed.passwordSalt);
            if (
              parsed.user?.username?.toLowerCase() === adminUsername.trim().toLowerCase() &&
              computed === parsed.passwordHash
            ) {
              resetLoginAttempts(`admin_${adminUsername}`);
              const offlineToken = `TOKEN-OFFLINE-MASTER-${Date.now()}`;
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
              onMasterAdminSuccess(parsed.user, offlineToken);
              setAdminLoading(false);
              return;
            }
          } catch {}
        }
      }

      const lockResult = recordFailedLoginAttempt(`admin_${adminUsername}`);
      if (lockResult.isLocked) {
        setAdminError(`Account locked for 15 minutes due to 5 failed attempts.`);
      } else {
        const remaining = 5 - lockResult.attemptsCount;
        setAdminError(
          err?.message || `Incorrect username or password. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        );
      }
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Shop POS Login
  const handleShopLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShopError(null);

    const lock = getLockoutStatus(`shop_${shopUsername}`);
    if (lock.isLocked) {
      setShopError(`Account temporarily locked. Try again in ${formatLockoutTime(lock.remainingSeconds)}.`);
      return;
    }

    setShopLoading(true);

    try {
      const res = await safeFetchJson('/api/auth/shop-owner/login', {
        method: 'POST',
        body: JSON.stringify({
          username: shopUsername.trim().toLowerCase(),
          email: shopUsername.trim().toLowerCase(),
          password: shopPassword,
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Invalid shop credentials or shop deactivated.');
      }

      resetLoginAttempts(`shop_${shopUsername}`);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      onShopOwnerSuccess(data.user, data.shop, data.token);
    } catch (err: any) {
      // Offline fallback for shop
      if (err?.status === 0 || err?.name === 'ApiConnectionError') {
        const offlineShops = localStorage.getItem('waqas_pos_offline_shops');
        if (offlineShops) {
          try {
            const list: any[] = JSON.parse(offlineShops);
            const found = list.find(
              (s) =>
                s.username?.toLowerCase() === shopUsername.trim().toLowerCase() ||
                s.email?.toLowerCase() === shopUsername.trim().toLowerCase()
            );
            if (found) {
              if (found.status === 'inactive') {
                setShopError('This shop account has been deactivated by Master Admin.');
                setShopLoading(false);
                return;
              }
              const computed = await hashPasswordClient(shopPassword, found.passwordSalt);
              if (computed === found.passwordHash) {
                resetLoginAttempts(`shop_${shopUsername}`);
                const offlineToken = `TOKEN-OFFLINE-SHOP-${Date.now()}`;
                const userObj: AuthUser = {
                  id: found.userId || `USR-${found.id}`,
                  username: found.username,
                  email: found.email,
                  fullName: found.ownerName || found.shopName,
                  role: 'SHOP_OWNER',
                  shopId: found.id,
                  shopName: found.shopName,
                  createdAt: found.createdAt,
                };
                confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
                onShopOwnerSuccess(userObj, found, offlineToken);
                setShopLoading(false);
                return;
              }
            }
          } catch {}
        }
      }

      const lockResult = recordFailedLoginAttempt(`shop_${shopUsername}`);
      if (lockResult.isLocked) {
        setShopError(`Account locked for 15 minutes due to 5 failed attempts.`);
      } else {
        const remaining = 5 - lockResult.attemptsCount;
        setShopError(
          err?.message || `Incorrect credentials. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        );
      }
    } finally {
      setShopLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative selection:bg-emerald-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-slate-950 to-slate-950 -z-10" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Unconfigured Notice Banner */}
        {!isConfigured && (
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-3 text-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>One-Time Master Admin Setup Required</span>
            </div>
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white text-amber-900 font-bold hover:bg-amber-100 transition cursor-pointer"
            >
              Configure Now
            </button>
          </div>
        )}

        {/* Card Header */}
        <div className="p-6 text-center border-b border-slate-800/80 bg-slate-900/50">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white mb-3 shadow-lg shadow-emerald-900/40">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">WAQAS POS SOFTWARE</h1>
          <p className="text-xs text-slate-400 mt-1">
            Private, Encrypted & 100% Offline Device POS System
          </p>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 rounded-2xl border border-slate-800 mt-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('SHOP_LOGIN');
                setShopError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'SHOP_LOGIN'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Shop POS Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('MASTER_ADMIN');
                setAdminError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'MASTER_ADMIN'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Master Admin</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Shop POS Login */}
        {activeTab === 'SHOP_LOGIN' && (
          <form onSubmit={handleShopLogin} className="p-6 space-y-4 text-xs">
            {shopError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{shopError}</span>
              </div>
            )}

            {shopLockout.isLocked && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Account locked. Try again in {formatLockoutTime(shopLockout.remainingSeconds)}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Shop Username / Email
              </label>
              <input
                type="text"
                required
                disabled={shopLockout.isLocked}
                value={shopUsername}
                onChange={(e) => setShopUsername(e.target.value)}
                placeholder="e.g. waqasmart"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Shop Password
              </label>
              <div className="relative">
                <input
                  type={showShopPassword ? 'text' : 'password'}
                  required
                  disabled={shopLockout.isLocked}
                  value={shopPassword}
                  onChange={(e) => setShopPassword(e.target.value)}
                  placeholder="Enter shop password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowShopPassword(!showShopPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showShopPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={shopLoading || shopLockout.isLocked}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Store className="w-4 h-4" />
              <span>{shopLoading ? 'Authenticating...' : 'Sign In to Shop POS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-2">
              Only authorized shop accounts created by the Master Admin can access store operations.
            </p>
          </form>
        )}

        {/* Tab 2: Master Admin Login */}
        {activeTab === 'MASTER_ADMIN' && (
          <form onSubmit={handleMasterAdminLogin} className="p-6 space-y-4 text-xs">
            {adminError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            {adminLockout.isLocked && (
              <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-200 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Locked due to failed attempts. Try again in {formatLockoutTime(adminLockout.remainingSeconds)}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Master Admin Username
              </label>
              <input
                type="text"
                required
                disabled={adminLockout.isLocked}
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                placeholder="e.g. admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Master Password
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(true)}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer transition"
                    title="Open Reset Master Password screen"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-400" />
                    <span>Reset Master Password</span>
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(true)}
                    className="text-[11px] text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  disabled={adminLockout.isLocked}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter Master Admin password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={adminLoading || adminLockout.isLocked}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>{adminLoading ? 'Verifying...' : 'Access Master Admin Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(true)}
                className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reset Master Password</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRecoveryModal(true)}
                className="w-full sm:w-auto py-2 px-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                <span>Recovery Wizard</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-emerald-400" />
            100% Offline Local Device Storage
          </span>
          <span className="font-mono text-slate-400">v2.0-private</span>
        </div>
      </div>

      {/* Modals */}
      <MasterAdminSetupModal
        isOpen={showSetupModal}
        onSuccess={(user, token) => {
          setIsConfigured(true);
          setShowSetupModal(false);
          onMasterAdminSuccess(user, token);
        }}
      />

      <MasterAdminRecoveryModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
        onSuccess={(newUser) => {
          setAdminUsername(newUser);
          setShowRecoveryModal(false);
          setActiveTab('MASTER_ADMIN');
        }}
      />

      <ResetMasterPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        initialUsername={adminUsername}
        onSuccess={(newUser) => {
          setAdminUsername(newUser);
          setShowResetPasswordModal(false);
          setAdminPassword('');
          setAdminError(null);
          setActiveTab('MASTER_ADMIN');
        }}
      />
    </div>
  );
};
