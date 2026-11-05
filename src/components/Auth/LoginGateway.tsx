import React, { useState } from 'react';
import {
  Shield,
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Crown,
  ChevronRight,
  RefreshCw,
  X,
  Server,
  Wrench,
  Globe,
} from 'lucide-react';
import { AuthUser, ShopAccount, UserRole } from '../../types/pos';
import {
  getApiBaseUrl,
  safeFetchJson,
  ApiConnectionError,
} from '../../utils/apiClient';
import { ServerConnectionModal } from '../ServerConnectionModal';
import confetti from 'canvas-confetti';

interface LoginGatewayProps {
  onSuperAdminSuccess: (user: AuthUser, token: string) => void;
  onShopOwnerSuccess: (user: AuthUser, shop: ShopAccount, token: string) => void;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  onSuperAdminSuccess,
  onShopOwnerSuccess,
}) => {
  // Tab: 'SUPER_ADMIN' | 'SHOP_OWNER'
  const [activeTab, setActiveTab] = useState<'SUPER_ADMIN' | 'SHOP_OWNER'>('SUPER_ADMIN');

  // Super Admin form state
  const [adminEmail, setAdminEmail] = useState('waqaspos.admin@gmail.com');
  const [adminPassword, setAdminPassword] = useState('WaqasAdmin@2026');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<{ text: string; isHtml: boolean } | null>(null);

  // Shop Owner form state
  const [shopEmail, setShopEmail] = useState('waqasmart.pos@gmail.com');
  const [shopPassword, setShopPassword] = useState('ShopOwner@123');
  const [showShopPassword, setShowShopPassword] = useState(false);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<{ text: string; isHtml: boolean } | null>(null);

  // Server Settings Modal State
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState(() => getApiBaseUrl());

  // Forgot Password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotRole, setForgotRole] = useState<'SUPER_ADMIN' | 'SHOP_OWNER'>('SUPER_ADMIN');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [generatedResetCode, setGeneratedResetCode] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Handle Super Admin Login
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      const res = await safeFetchJson('/api/auth/super-admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: adminEmail.trim(),
          password: adminPassword.trim(),
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Super Admin authentication failed. Invalid credentials.');
      }

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onSuperAdminSuccess(data.user, data.token);
    } catch (err: any) {
      const isHtml = err?.isHtmlResponse || false;
      const msg = err?.message || 'Error signing in. Please verify Super Admin credentials.';
      setAdminError({ text: msg, isHtml });
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Shop Owner Login
  const handleShopOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShopError(null);
    setShopLoading(true);

    try {
      const res = await safeFetchJson('/api/auth/shop-owner/login', {
        method: 'POST',
        body: JSON.stringify({
          email: shopEmail.trim(),
          password: shopPassword.trim(),
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Shop Owner authentication failed. Invalid credentials or expired account.');
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onShopOwnerSuccess(data.user, data.shop, data.token);
    } catch (err: any) {
      const isHtml = err?.isHtmlResponse || false;
      const msg = err?.message || 'Error signing in. Ensure account is registered by Super Admin.';
      setShopError({ text: msg, isHtml });
    } finally {
      setShopLoading(false);
    }
  };

  // Handle Request Password Reset Code
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    setForgotLoading(true);

    try {
      const res = await safeFetchJson('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotEmail.trim(),
          role: forgotRole,
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to request reset code.');
      }

      setGeneratedResetCode(data.resetCode);
      setResetCodeInput(data.resetCode || '');
      setForgotStep('reset');
      setForgotMessage({
        text: `Security code generated! Valid for ${data.expiresMinutes || 30} minutes.`,
        isError: false,
      });
    } catch (err: any) {
      setForgotMessage({ text: err.message || 'Error requesting reset code.', isError: true });
    } finally {
      setForgotLoading(false);
    }
  };

  // Handle Confirm Reset Password
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    setForgotLoading(true);

    try {
      const res = await safeFetchJson('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotEmail.trim(),
          resetCode: resetCodeInput.trim(),
          newPassword: newPasswordInput.trim(),
        }),
      });

      const data = res.data;
      if (!data || !data.success) {
        throw new Error(data?.message || 'Failed to reset password.');
      }

      setForgotMessage({ text: 'Password reset successfully! You can now log in.', isError: false });
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotStep('request');
        if (forgotRole === 'SUPER_ADMIN') {
          setAdminPassword(newPasswordInput);
        } else {
          setShopPassword(newPasswordInput);
        }
      }, 1500);
    } catch (err: any) {
      setForgotMessage({ text: err.message || 'Error resetting password.', isError: true });
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotModal = (role: 'SUPER_ADMIN' | 'SHOP_OWNER', defaultEmail: string) => {
    setForgotRole(role);
    setForgotEmail(defaultEmail);
    setForgotStep('request');
    setGeneratedResetCode(null);
    setResetCodeInput('');
    setNewPasswordInput('');
    setForgotMessage(null);
    setForgotModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background radial luxury lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_top,rgba(5,122,68,0.22),transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Brand Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
            <Store className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-white">
                WAQAS POS SOFTWARE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                v2.6 Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Supermarket & Retail Multi-Tenant Management System
            </p>
          </div>
        </div>

        {/* Software Owner Badge */}
        <div className="flex items-center gap-2 text-right">
          <div className="hidden md:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Software Owner & Developer
            </span>
            <span className="text-xs font-black text-emerald-400">Muhammad Waqas</span>
          </div>
          <a
            href="https://wa.me/923228570782"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
            title="Chat with Muhammad Waqas on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-400" />
            <span className="hidden sm:inline">03228570782</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 z-10 max-w-4xl mx-auto w-full">
        {/* Title & Gateway Switcher */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Your Authentication Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome to WAQAS POS Gateway
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Choose either Super Admin Software Owner access or Authorized Shop Owner login.
          </p>

          {/* TWO SEPARATE PORTAL SWITCHER BUTTONS */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-md mx-auto mt-4 shadow-xl">
            <button
              type="button"
              onClick={() => setActiveTab('SUPER_ADMIN')}
              className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'SUPER_ADMIN'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-950/60 ring-1 ring-amber-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>SUPER ADMIN</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SHOP_OWNER')}
              className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'SHOP_OWNER'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>SHOP OWNER</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 1. SUPER ADMIN LOGIN PANEL                                     */}
        {/* ============================================================== */}
        {activeTab === 'SUPER_ADMIN' && (
          <div className="w-full max-w-md bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header info */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/50">
                <Crown className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-lg text-white">Super Admin Portal</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    MASTER
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 font-medium">Software Owner Master Control</p>
              </div>
            </div>

            {/* Error banner */}
            {adminError && (
              <div className="mb-4 p-3.5 bg-red-950/70 border border-red-500/50 text-red-200 text-xs rounded-2xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{adminError.text}</span>
                </div>
                {adminError.isHtml && (
                  <div className="pt-2 border-t border-red-500/30 flex items-center justify-between">
                    <span className="text-[11px] text-amber-300 font-urdu" dir="rtl">
                      سرور سے رابطہ نہیں ہو سکا۔ API ایڈریس درست کریں:
                    </span>
                    <button
                      type="button"
                      onClick={() => setServerModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Configure Server URL</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSuperAdminLogin} className="space-y-4">
              {/* Field 1: Super Admin Gmail */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Super Admin Gmail</span>
                  <span className="text-[10px] text-amber-400/90 font-medium">Authorized Account</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="waqaspos.admin@gmail.com"
                    required
                    className="w-full pl-10 pr-3 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Field 2: Password with Show/Hide */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Master Password
                  </label>
                  <button
                    type="button"
                    onClick={() => openForgotModal('SUPER_ADMIN', adminEmail)}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline cursor-pointer font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter Master Password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                    title={showAdminPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 hover:brightness-110 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {adminLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Authenticating Master Session...</span>
                  </span>
                ) : (
                  <>
                    <span>Login to Super Admin Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Software Owner Information Box */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Software Name:</span>
                <span className="text-amber-300 font-extrabold">WAQAS POS SOFTWARE</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Software Owner:</span>
                <span className="text-white font-extrabold">Muhammad Waqas</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Support WhatsApp:</span>
                <a
                  href="https://wa.me/923228570782"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline font-bold"
                >
                  03228570782
                </a>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Support Mobile:</span>
                <span className="text-slate-200 font-bold">03429634133</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. SHOP OWNER LOGIN PANEL                                      */}
        {/* ============================================================== */}
        {activeTab === 'SHOP_OWNER' && (
          <div className="w-full max-w-md bg-slate-900/95 border border-emerald-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header info */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
                <Store className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-lg text-white">Shop Owner Login</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    POS
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 font-medium">Store Terminal Workstation Access</p>
              </div>
            </div>

            {/* Error banner */}
            {shopError && (
              <div className="mb-4 p-3.5 bg-red-950/70 border border-red-500/50 text-red-200 text-xs rounded-2xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{shopError.text}</span>
                </div>
                {shopError.isHtml && (
                  <div className="pt-2 border-t border-red-500/30 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-300 font-urdu" dir="rtl">
                      سرور سے رابطہ نہیں ہو سکا۔ API ایڈریس درست کریں:
                    </span>
                    <button
                      type="button"
                      onClick={() => setServerModalOpen(true)}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Configure Server URL</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleShopOwnerLogin} className="space-y-4">
              {/* Field 1: Registered Gmail */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
                  <span>Registered Shop Gmail</span>
                  <span className="text-[10px] text-emerald-400/90 font-medium">Assigned by Super Admin</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    placeholder="e.g. yourshop.pos@gmail.com"
                    required
                    className="w-full pl-10 pr-3 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Field 2: Password with Show/Hide */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Shop Password
                  </label>
                  <button
                    type="button"
                    onClick={() => openForgotModal('SHOP_OWNER', shopEmail)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showShopPassword ? 'text' : 'password'}
                    value={shopPassword}
                    onChange={(e) => setShopPassword(e.target.value)}
                    placeholder="Enter Shop Password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowShopPassword(!showShopPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                    title={showShopPassword ? 'Hide password' : 'Show password'}
                  >
                    {showShopPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={shopLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:brightness-110 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {shopLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Store Account...</span>
                  </span>
                ) : (
                  <>
                    <span>Login to POS Workstation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Shop Activation Notice */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Only accounts provisioned by Super Admin can access the system. No public self-registration. For new mart activation, contact{' '}
                  <span className="text-emerald-300 font-bold">Muhammad Waqas</span>: 03228570782.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Support Bar & Server Connection Pill */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-4 py-3 text-center text-xs text-slate-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 text-slate-400">
          <span>WAQAS POS SOFTWARE</span>
          <span>•</span>
          <span>Owner: <strong className="text-slate-300">Muhammad Waqas</strong> (03228570782)</span>
        </div>

        <button
          type="button"
          onClick={() => setServerModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          title="Configure live Backend Server URL if deploying across different domains"
        >
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Server: {currentServerUrl ? currentServerUrl.replace(/^https?:\/\//, '') : 'Same-Origin (/api)'}</span>
          <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-amber-300 font-mono">Settings</span>
        </button>
      </footer>

      {/* Backend Server Connection Modal */}
      <ServerConnectionModal
        isOpen={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
        onSaved={(newUrl) => {
          setCurrentServerUrl(newUrl);
          setAdminError(null);
          setShopError(null);
        }}
      />

      {/* ============================================================== */}
      {/* FORGOT PASSWORD MODAL (2-STEP VERIFICATION)                    */}
      {/* ============================================================== */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Reset Account Password</h3>
                  <p className="text-xs text-slate-400">
                    {forgotRole === 'SUPER_ADMIN' ? 'Super Admin Portal' : 'Shop Owner Portal'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {forgotMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    forgotMessage.isError
                      ? 'bg-red-950/60 border border-red-500/40 text-red-200'
                      : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  {forgotMessage.isError ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              {forgotStep === 'request' ? (
                <form onSubmit={handleRequestResetCode} className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Enter your registered email address to receive a secure 6-digit verification code.
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Registered Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. waqaspos.admin@gmail.com"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? 'Generating...' : 'Get Verification Code'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                  {generatedResetCode && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
                      <span className="text-[10px] text-amber-300 uppercase tracking-widest font-black">
                        Self-Hosted Verification Code
                      </span>
                      <div className="text-2xl font-black text-amber-400 tracking-widest font-mono">
                        {generatedResetCode}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        In production, this code is sent to your registered WhatsApp / Email.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      value={resetCodeInput}
                      onChange={(e) => setResetCodeInput(e.target.value)}
                      placeholder="e.g. 123456"
                      required
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-center text-white tracking-widest focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">New Password</label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter at least 6 characters"
                      required
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? 'Updating...' : 'Set New Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
