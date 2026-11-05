import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Crown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  ArrowLeft,
  Phone,
  MessageCircle,
  FileText,
  UserCheck,
  Ban,
  DollarSign,
  Printer,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Store,
  Receipt,
  Download,
  AlertCircle,
  Edit2,
  Check,
  Users,
  Layers,
  Settings,
  LogOut,
  History,
  FileSpreadsheet,
  X,
  Lock,
  Eye,
  EyeOff,
  Building,
  Activity,
  Copy,
  ChevronDown,
  Menu,
} from 'lucide-react';
import {
  ShopAccount,
  SubscriptionPaymentRecord,
  SubscriptionRenewalRecord,
  ShopCustomPricing,
  SubscriptionPlanType,
  AccountStatus,
  PaymentMethodType,
  AuthUser,
  AuditLogEntry,
  DefaultSubscriptionPricing,
} from '../types/pos';
import { getApiBaseUrl, safeFetchJson } from '../utils/apiClient';
import confetti from 'canvas-confetti';

interface SuperAdminPortalProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenStorePos?: () => void;
}

export type SuperAdminNavPage =
  | 'dashboard'
  | 'create_shop'
  | 'all_shops'
  | 'active_shops'
  | 'expiring_subscriptions'
  | 'expired_subscriptions'
  | 'suspended_blocked'
  | 'subscription_management'
  | 'subscription_pricing'
  | 'payment_history'
  | 'outstanding_balances'
  | 'renewal_history'
  | 'audit_logs'
  | 'admin_settings';

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  currentUser,
  onLogout,
  onOpenStorePos,
}) => {
  const [activeNav, setActiveNav] = useState<SuperAdminNavPage>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states
  const [shops, setShops] = useState<ShopAccount[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [renewals, setRenewals] = useState<SubscriptionRenewalRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [defaultPricing, setDefaultPricing] = useState<DefaultSubscriptionPricing>({
    oneMonth: 1500,
    threeMonths: 4000,
    sixMonths: 7500,
    twelveMonths: 14000,
  });

  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    amountReceived: 0,
    outstandingBalance: 0,
    thisMonthIncome: 0,
    thisYearIncome: 0,
    totalRenewals: 0,
    totalShops: 0,
    activeShops: 0,
    expiringSoon: 0,
    expiredShops: 0,
    suspendedShops: 0,
    blockedShops: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedShopId, setCopiedShopId] = useState<string | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedShopForPayment, setSelectedShopForPayment] = useState<ShopAccount | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(1500);
  const [paymentMethodInput, setPaymentMethodInput] = useState<PaymentMethodType>('JazzCash');
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');
  const [paymentTxRefInput, setPaymentTxRefInput] = useState<string>('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Renewal Modal
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedShopForRenew, setSelectedShopForRenew] = useState<ShopAccount | null>(null);
  const [renewPlan, setRenewPlan] = useState<SubscriptionPlanType>('1_month');
  const [renewAmount, setRenewAmount] = useState<number>(1500);
  const [renewDays, setRenewDays] = useState<number>(30);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [renewingShop, setRenewingShop] = useState(false);

  // Print Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<SubscriptionPaymentRecord | null>(null);

  // Edit Pricing Modal
  const [editingPricingShop, setEditingPricingShop] = useState<ShopAccount | null>(null);
  const [editPriceRate, setEditPriceRate] = useState<number>(1500);

  // Create New Shop Form State
  const [newShopForm, setNewShopForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: 'Commercial Market, Pakistan',
    plan: '1_month' as SubscriptionPlanType,
    initialPayment: 1500,
    customTemporaryPassword: '',
  });
  const [createdShopResult, setCreatedShopResult] = useState<{
    shop: ShopAccount;
    temporaryPassword: string;
    loginEmail: string;
  } | null>(null);
  const [creatingShop, setCreatingShop] = useState(false);
  const [createShopError, setCreateShopError] = useState<string | null>(null);

  // Admin Settings Password Change State
  const [adminOldPass, setAdminOldPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminPassMsg, setAdminPassMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [changingPass, setChangingPass] = useState(false);

  // Fetch all subscription overview & audit logs
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/overview`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShops(data.shops || []);
          setPayments(data.payments || []);
          setRenewals(data.renewals || []);
          if (data.metrics) setMetrics(data.metrics);
        }
      }

      // Fetch audit logs
      const auditRes = await fetch(`${base}/api/super-admin/audit-logs`);
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        if (auditData.success) {
          setAuditLogs(auditData.logs || []);
        }
      }

      // Fetch settings
      const settingsRes = await fetch(`${base}/api/super-admin/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.defaultPricing) {
          setDefaultPricing(settingsData.defaultPricing);
        }
      }
    } catch (e) {
      console.warn('Failed to load super admin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedShopId(id);
    setTimeout(() => setCopiedShopId(null), 2000);
  };

  // Change Shop Status
  const handleUpdateStatus = async (shopId: string, newStatus: AccountStatus) => {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/shops/${shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update Custom Pricing
  const handleSaveCustomPricing = async () => {
    if (!editingPricingShop) return;
    try {
      const base = getApiBaseUrl();
      await fetch(`${base}/api/subscriptions/shops/${editingPricingShop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: {
            ...editingPricingShop.pricing,
            customPricePerMonth: editPriceRate,
            oneMonth: editPriceRate,
          },
        }),
      });
      setEditingPricingShop(null);
      fetchOverview();
    } catch (e) {
      console.error(e);
    }
  };

  // Record Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForPayment) return;
    setRecordingPayment(true);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShopForPayment.id,
          totalAmount: paymentAmountInput,
          amountPaid: paymentAmountInput,
          paymentMethod: paymentMethodInput,
          transactionReference: paymentTxRefInput,
          notes: paymentNotesInput,
        }),
      });

      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setShowPaymentModal(false);
        setActiveReceipt(data.payment);
        setShowReceiptModal(true);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecordingPayment(false);
    }
  };

  // Renew Subscription Submit
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForRenew) return;
    setRenewingShop(true);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShopForRenew.id,
          plan: renewPlan,
          additionalDays: renewDays,
          amount: renewAmount,
          paymentMethod: renewPaymentMethod,
          notes: `Subscription renewed by Super Admin Muhammad Waqas`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setShowRenewModal(false);
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRenewingShop(false);
    }
  };

  // Create New Shop Submit
  const handleCreateShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingShop(true);
    setCreateShopError(null);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShopForm),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create shop account.');
      }

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      setCreatedShopResult({
        shop: data.shop,
        temporaryPassword: data.temporaryPassword,
        loginEmail: data.loginEmail,
      });
      fetchOverview();
    } catch (err: any) {
      setCreateShopError(err.message || 'Error creating shop account.');
    } finally {
      setCreatingShop(false);
    }
  };

  // Save Default Global Pricing
  const handleSaveDefaultPricing = async () => {
    try {
      const base = getApiBaseUrl();
      await fetch(`${base}/api/super-admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPricing }),
      });
      alert('Global default subscription pricing saved successfully!');
      fetchOverview();
    } catch (e) {
      console.error(e);
    }
  };

  // Change Super Admin Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    setAdminPassMsg(null);

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ST-MASTER`,
        },
        body: JSON.stringify({
          oldPassword: adminOldPass,
          newPassword: adminNewPass,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to change password.');
      }

      setAdminPassMsg({ text: 'Master password updated successfully!', isError: false });
      setAdminOldPass('');
      setAdminNewPass('');
    } catch (err: any) {
      setAdminPassMsg({ text: err.message || 'Error changing password.', isError: true });
    } finally {
      setChangingPass(false);
    }
  };

  // Download Backup JSON
  const handleDownloadBackup = async () => {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/super-admin/backup`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WAQAS_POS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (e) {
      console.error('Backup download error', e);
    }
  };

  // Filtered Shops List helper
  const getFilteredShops = (category?: string) => {
    let list = [...shops];
    const today = new Date().toISOString().split('T')[0];

    if (category === 'active') {
      list = list.filter((s) => s.status === 'active');
    } else if (category === 'expiring') {
      list = list.filter((s) => {
        if (s.status === 'expiring_soon') return true;
        const diff = Math.ceil((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 7 && s.status === 'active';
      });
    } else if (category === 'expired') {
      list = list.filter((s) => s.status === 'expired' || s.expiryDate < today);
    } else if (category === 'suspended_blocked') {
      list = list.filter((s) => s.status === 'suspended' || s.status === 'blocked');
    } else if (category === 'outstanding') {
      list = list.filter((s) => (s.remainingBalance || 0) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.shopName.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const getDaysLeft = (expiryDate: string) => {
    const diff = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Navigation Items list (15 sub-pages as required)
  const navItems = [
    { id: 'dashboard', label: '1. Super Admin Dashboard', icon: Crown, badge: null },
    { id: 'create_shop', label: '2. Create New Shop', icon: Plus, badge: 'New' },
    { id: 'all_shops', label: '3. All Shop Owners', icon: Users, badge: shops.length },
    { id: 'active_shops', label: '4. Active Shops', icon: CheckCircle2, badge: metrics.activeShops },
    { id: 'expiring_subscriptions', label: '5. Expiring Subscriptions', icon: AlertTriangle, badge: metrics.expiringSoon, alert: true },
    { id: 'expired_subscriptions', label: '6. Expired Subscriptions', icon: Clock, badge: metrics.expiredShops, alert: true },
    { id: 'suspended_blocked', label: '7. Suspended / Blocked Shops', icon: Ban, badge: metrics.suspendedShops + metrics.blockedShops },
    { id: 'subscription_management', label: '8. Subscription & Payments', icon: Layers, badge: null },
    { id: 'subscription_pricing', label: '9. Subscription Pricing', icon: DollarSign, badge: 'PKR' },
    { id: 'payment_history', label: '10. Payment History', icon: Receipt, badge: payments.length },
    { id: 'outstanding_balances', label: '11. Outstanding Balances', icon: FileSpreadsheet, badge: `Rs. ${metrics.outstandingBalance.toLocaleString()}` },
    { id: 'renewal_history', label: '12. Renewal History', icon: History, badge: renewals.length },
    { id: 'audit_logs', label: '13. Audit Logs', icon: FileText, badge: auditLogs.length },
    { id: 'admin_settings', label: '14. Admin Settings', icon: Settings, badge: null },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 border border-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-950/50">
            <Crown className="w-6 h-6 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg text-white tracking-tight">
                WAQAS POS SOFTWARE
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-400/30">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Software Owner: <strong className="text-amber-300">Muhammad Waqas</strong> (WhatsApp: 03228570782, Mobile: 03429634133)
            </p>
          </div>
        </div>

        {/* Right Action Header controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Refresh Database Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {onOpenStorePos && (
            <button
              onClick={onOpenStorePos}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Launch Store POS</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Secure Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-35 lg:hidden"
          />
        )}

        {/* ============================================================== */}
        {/* SIDEBAR NAVIGATION (15 PAGES)                                  */}
        {/* ============================================================== */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Top user badge in sidebar */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md">
                MW
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Muhammad Waqas</p>
                <p className="text-[10px] text-amber-400 font-medium">Software Owner Master</p>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id as SuperAdminNavPage);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-md shadow-amber-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : item.alert
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {onOpenStorePos && (
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  onOpenStorePos();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors text-left cursor-pointer mt-2 border-t border-slate-800/80 pt-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Launch Store POS</span>
                </div>
              </button>
            )}

            {/* 15. SECURE LOGOUT (AS REQUIRED ITEM 15 IN SIDEBAR) */}
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors text-left cursor-pointer mt-1 border-t border-slate-800/80 pt-2.5"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-red-400" />
                <span>15. Secure Logout</span>
              </div>
            </button>
          </nav>

          {/* Software Owner Information Footer in Sidebar */}
          <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2 bg-slate-950/40">
            <div className="font-extrabold text-amber-400 uppercase tracking-wider text-[10px]">
              Software Owner Credentials
            </div>
            <div>
              <span className="text-slate-300 font-bold">Muhammad Waqas</span>
              <p className="text-slate-400">Owner & Chief Engineer</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <a
                href="https://wa.me/923228570782"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline font-bold flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" /> 03228570782
              </a>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* MAIN CONTENT AREA                                              */}
        {/* ============================================================== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ============================================================ */}
          {/* PAGE 1: SUPER ADMIN DASHBOARD (OVERVIEW)                      */}
          {/* ============================================================ */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome banner */}
              <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-emerald-950/40 border border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                      Master Control Dashboard
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                      WAQAS POS SOFTWARE Management Portal
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Real-time Pakistani Rupee (PKR) financial intelligence, client shop subscription monitoring, automated renewal enforcement, and security controls.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => setActiveNav('create_shop')}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Shop</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('subscription_pricing')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Pricing Matrix</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 9 REAL METRICS CARDS (CALCULATED FROM DATABASE IN PKR) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Total Revenue in PKR */}
                <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Total Revenue (PKR)</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2">
                    Rs. {metrics.totalIncome.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Confirmed Subscription Income</p>
                </div>

                {/* 2. Total Received */}
                <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Amount Received</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                    Rs. {metrics.amountReceived.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Paid in Cash / Bank / JazzCash</p>
                </div>

                {/* 3. Outstanding Balances */}
                <div className="bg-slate-900/90 border border-red-500/30 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Outstanding Balances</span>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-red-400 mt-2">
                    Rs. {metrics.outstandingBalance.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Pending from Shop Owners</p>
                </div>

                {/* 4. This Month's Income */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">This Month's Income</span>
                    <Calendar className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-2">
                    Rs. {metrics.thisMonthIncome.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Current Billing Cycle</p>
                </div>

                {/* 5. Total Shops */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Total Shop Accounts</span>
                    <Store className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-2">
                    {metrics.totalShops}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Registered Supermarket Clients</p>
                </div>

                {/* 6. Active Shops */}
                <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Active Subscriptions</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2">
                    {metrics.activeShops}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Unrestricted POS Access</p>
                </div>

                {/* 7. Expiring Subscriptions (<= 7 Days) */}
                <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Expiring in &le; 7 Days</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2">
                    {metrics.expiringSoon}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Need Renewal Warning</p>
                </div>

                {/* 8. Expired Subscriptions */}
                <div className="bg-slate-900/90 border border-red-500/30 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="font-bold">Expired Shops</span>
                    <Clock className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-red-400 mt-2">
                    {metrics.expiredShops}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Locked at Terminal Screen</p>
                </div>
              </div>

              {/* Recent Shop Accounts List Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-black text-lg text-white">Registered Shop Accounts</h3>
                    <p className="text-xs text-slate-400">Latest active and monitored mart terminals</p>
                  </div>
                  <button
                    onClick={() => setActiveNav('all_shops')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Shops ({shops.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Shop ID</th>
                        <th className="py-3 px-4">Shop & Owner</th>
                        <th className="py-3 px-4">Plan & Expiry</th>
                        <th className="py-3 px-4">Remaining Days</th>
                        <th className="py-3 px-4">Financials (PKR)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {shops.slice(0, 5).map((shop) => {
                        const daysLeft = getDaysLeft(shop.expiryDate);
                        return (
                          <tr key={shop.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                              {shop.id}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-white text-sm">{shop.shopName}</p>
                              <p className="text-slate-400 text-[11px]">
                                {shop.ownerName} • {shop.phone || shop.whatsapp}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-200 uppercase">
                                {shop.plan.replace('_', ' ')}
                              </span>
                              <p className="text-slate-400 text-[11px] flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {shop.expiryDate}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-1 rounded-full font-bold text-[10px] ${
                                  daysLeft < 0
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : daysLeft <= 7
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {daysLeft < 0 ? `Expired (${Math.abs(daysLeft)}d ago)` : `${daysLeft} days remaining`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-300">
                                Paid: <strong className="text-emerald-400">Rs. {shop.totalPaid.toLocaleString()}</strong>
                              </div>
                              {shop.remainingBalance > 0 && (
                                <div className="text-red-400 text-[11px]">
                                  Due: Rs. {shop.remainingBalance.toLocaleString()}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  shop.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : shop.status === 'expiring_soon'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : shop.status === 'expired'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {shop.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedShopForPayment(shop);
                                    setPaymentAmountInput(shop.remainingBalance || 1500);
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                                  title="Record Subscription Payment"
                                >
                                  Payment
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedShopForRenew(shop);
                                    setRenewPlan(shop.plan);
                                    setRenewAmount(shop.pricing?.oneMonth || 1500);
                                    setShowRenewModal(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                                  title="Renew Subscription"
                                >
                                  Renew
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 2: CREATE NEW SHOP                                      */}
          {/* ============================================================ */}
          {activeNav === 'create_shop' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Create New Shop Account</h2>
                    <p className="text-xs text-slate-400">
                      Provision a new store client with custom PKR rates and temporary credentials.
                    </p>
                  </div>
                </div>

                {createShopError && (
                  <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{createShopError}</span>
                  </div>
                )}

                {/* Success Card when Shop is created */}
                {createdShopResult && (
                  <div className="mb-6 p-6 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl space-y-4 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Shop Account Provisioned Successfully!</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Generated Shop ID</span>
                        <span className="text-base font-black text-amber-400 font-mono">
                          {createdShopResult.shop.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Login Email</span>
                        <span className="text-sm font-bold text-white select-all">
                          {createdShopResult.loginEmail}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Temporary Password</span>
                        <span className="text-sm font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 select-all">
                          {createdShopResult.temporaryPassword}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <a
                        href={`https://wa.me/${createdShopResult.shop.whatsapp || '923228570782'}?text=${encodeURIComponent(
                          `Assalam-o-Alaikum ${createdShopResult.shop.ownerName},\nYour WAQAS POS SOFTWARE account has been created!\n\n• Shop: ${createdShopResult.shop.shopName}\n• Shop ID: ${createdShopResult.shop.id}\n• Email: ${createdShopResult.loginEmail}\n• Temporary Password: ${createdShopResult.temporaryPassword}\n\nPlease log in and create your permanent password.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Send Details to Owner WhatsApp</span>
                      </a>
                      <button
                        onClick={() => {
                          setCreatedShopResult(null);
                          setNewShopForm({
                            shopName: '',
                            ownerName: '',
                            email: '',
                            phone: '',
                            whatsapp: '',
                            address: '',
                            plan: '1_month',
                            initialPayment: 1500,
                            customTemporaryPassword: '',
                          });
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold cursor-pointer"
                      >
                        Create Another Shop
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateShopSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Shop / Supermarket Name *</label>
                      <input
                        type="text"
                        value={newShopForm.shopName}
                        onChange={(e) => setNewShopForm({ ...newShopForm, shopName: e.target.value })}
                        placeholder="e.g. Al-Madina Superstore"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Owner Full Name *</label>
                      <input
                        type="text"
                        value={newShopForm.ownerName}
                        onChange={(e) => setNewShopForm({ ...newShopForm, ownerName: e.target.value })}
                        placeholder="e.g. Tariq Mehmood"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Registered Shop Email *</label>
                      <input
                        type="email"
                        value={newShopForm.email}
                        onChange={(e) => setNewShopForm({ ...newShopForm, email: e.target.value })}
                        placeholder="e.g. almadina.pos@gmail.com"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Mobile Phone</label>
                      <input
                        type="text"
                        value={newShopForm.phone}
                        onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                        placeholder="e.g. 03001234567"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">WhatsApp Number</label>
                      <input
                        type="text"
                        value={newShopForm.whatsapp}
                        onChange={(e) => setNewShopForm({ ...newShopForm, whatsapp: e.target.value })}
                        placeholder="e.g. 03228570782"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Mart Address / City</label>
                    <input
                      type="text"
                      value={newShopForm.address}
                      onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })}
                      placeholder="e.g. Shop #12, Commercial Market, Multan"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Subscription Plan Duration</label>
                      <select
                        value={newShopForm.plan}
                        onChange={(e) => {
                          const p = e.target.value as SubscriptionPlanType;
                          const prices: Record<string, number> = {
                            '1_month': defaultPricing.oneMonth,
                            '3_months': defaultPricing.threeMonths,
                            '6_months': defaultPricing.sixMonths,
                            '12_months': defaultPricing.twelveMonths,
                            custom: 1500,
                          };
                          setNewShopForm({
                            ...newShopForm,
                            plan: p,
                            initialPayment: prices[p] || 1500,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="1_month">1 Month (Rs. {defaultPricing.oneMonth.toLocaleString()})</option>
                        <option value="3_months">3 Months (Rs. {defaultPricing.threeMonths.toLocaleString()})</option>
                        <option value="6_months">6 Months (Rs. {defaultPricing.sixMonths.toLocaleString()})</option>
                        <option value="12_months">12 Months (Rs. {defaultPricing.twelveMonths.toLocaleString()})</option>
                        <option value="custom">Custom Duration / Rate</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Initial Payment Received (PKR)</label>
                      <input
                        type="number"
                        value={newShopForm.initialPayment}
                        onChange={(e) =>
                          setNewShopForm({ ...newShopForm, initialPayment: Number(e.target.value) || 0 })
                        }
                        placeholder="1500"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-300">Custom Temporary Password (Optional)</label>
                      <input
                        type="text"
                        value={newShopForm.customTemporaryPassword}
                        onChange={(e) =>
                          setNewShopForm({ ...newShopForm, customTemporaryPassword: e.target.value })
                        }
                        placeholder="Leave blank for auto-generate"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button
                      type="submit"
                      disabled={creatingShop}
                      className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {creatingShop ? (
                        <span>Provisioning Shop...</span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Save & Activate Shop Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGES 3-7: SHOP LISTS (ALL, ACTIVE, EXPIRING, EXPIRED, ETC.)  */}
          {/* ============================================================ */}
          {(activeNav === 'all_shops' ||
            activeNav === 'active_shops' ||
            activeNav === 'expiring_subscriptions' ||
            activeNav === 'expired_subscriptions' ||
            activeNav === 'suspended_blocked' ||
            activeNav === 'outstanding_balances') && (
            <div className="space-y-5">
              {/* Header and Search */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {activeNav === 'all_shops' && 'All Shop Owners & Client Accounts'}
                    {activeNav === 'active_shops' && 'Active Subscriptions (Unrestricted Terminals)'}
                    {activeNav === 'expiring_subscriptions' && 'Expiring Subscriptions (Warning Notice)'}
                    {activeNav === 'expired_subscriptions' && 'Expired Subscriptions (POS Locked)'}
                    {activeNav === 'suspended_blocked' && 'Suspended & Blocked Mart Accounts'}
                    {activeNav === 'outstanding_balances' && 'Outstanding Subscription Balances'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pakistani Rupee subscription management & verified payment ledger
                  </p>
                </div>

                {/* Search Bar */}
                <div className="w-full sm:w-72 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search shop name, owner, phone..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Table of Filtered Shops */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Shop ID</th>
                        <th className="py-3 px-4">Shop Name & City</th>
                        <th className="py-3 px-4">Owner Name & Phone</th>
                        <th className="py-3 px-4">Plan Duration</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 px-4">Days Left</th>
                        <th className="py-3 px-4">Financials (PKR)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {getFilteredShops(
                        activeNav === 'active_shops'
                          ? 'active'
                          : activeNav === 'expiring_subscriptions'
                          ? 'expiring'
                          : activeNav === 'expired_subscriptions'
                          ? 'expired'
                          : activeNav === 'suspended_blocked'
                          ? 'suspended_blocked'
                          : activeNav === 'outstanding_balances'
                          ? 'outstanding'
                          : undefined
                      ).map((shop) => {
                        const daysLeft = getDaysLeft(shop.expiryDate);
                        const isExp = daysLeft < 0;
                        return (
                          <tr key={shop.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                              <button
                                onClick={() => handleCopy(shop.id, shop.id)}
                                className="flex items-center gap-1 hover:underline cursor-pointer"
                                title="Click to copy ID"
                              >
                                <span>{shop.id}</span>
                                {copiedShopId === shop.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500" />
                                )}
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-white text-sm">{shop.shopName}</p>
                              <p className="text-slate-400 text-[11px] truncate max-w-xs">{shop.address}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-200">{shop.ownerName}</p>
                              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                                <span>{shop.phone || shop.whatsapp}</span>
                                {shop.whatsapp && (
                                  <a
                                    href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                      `Assalam-o-Alaikum ${shop.ownerName}, Muhammad Waqas here from WAQAS POS regarding your store ${shop.shopName} (Shop ID: ${shop.id}).`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300"
                                    title="Message via WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-200 uppercase">
                                {shop.plan.replace('_', ' ')}
                              </span>
                              <p className="text-slate-400 text-[11px]">
                                Rs. {(shop.pricing?.customPricePerMonth || shop.pricing?.oneMonth || 1500).toLocaleString()}/mo
                              </p>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {shop.expiryDate}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isExp
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : daysLeft <= 7
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {isExp ? `Expired (${Math.abs(daysLeft)}d ago)` : `${daysLeft} days`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-300">
                                Paid: <strong className="text-emerald-400">Rs. {shop.totalPaid.toLocaleString()}</strong>
                              </div>
                              {shop.remainingBalance > 0 ? (
                                <div className="text-red-400 text-[11px] font-bold">
                                  Due: Rs. {shop.remainingBalance.toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-emerald-500 text-[10px] font-bold">Paid in Full</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={shop.status}
                                onChange={(e) => handleUpdateStatus(shop.id, e.target.value as AccountStatus)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-950 border ${
                                  shop.status === 'active'
                                    ? 'text-emerald-400 border-emerald-500/40'
                                    : shop.status === 'expiring_soon'
                                    ? 'text-amber-400 border-amber-500/40'
                                    : shop.status === 'expired'
                                    ? 'text-red-400 border-red-500/40'
                                    : 'text-slate-400 border-slate-700'
                                }`}
                              >
                                <option value="active">Active</option>
                                <option value="expiring_soon">Expiring Soon</option>
                                <option value="expired">Expired</option>
                                <option value="suspended">Suspended</option>
                                <option value="blocked">Blocked</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedShopForPayment(shop);
                                    setPaymentAmountInput(shop.remainingBalance || 1500);
                                    setShowPaymentModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                                  title="Record Cash/Online Payment"
                                >
                                  Payment
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedShopForRenew(shop);
                                    setRenewPlan(shop.plan);
                                    setRenewAmount(shop.pricing?.oneMonth || 1500);
                                    setShowRenewModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                                  title="Extend Duration"
                                >
                                  Renew
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingPricingShop(shop);
                                    setEditPriceRate(shop.pricing?.customPricePerMonth || 1500);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                                  title="Edit Custom Pricing"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 8: SUBSCRIPTION & PAYMENT MANAGEMENT                    */}
          {/* ============================================================ */}
          {activeNav === 'subscription_management' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <h2 className="text-xl font-black text-white">Subscription & Payment Management Center</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Financial health, cycle tracking, and revenue reconciliation in Pakistani Rupees.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-bold">Total Confirmed Collections</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      Rs. {metrics.amountReceived.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-bold">Pending Accounts Receivable</span>
                    <div className="text-2xl font-black text-red-400 mt-1">
                      Rs. {metrics.outstandingBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-bold">Completed Renewals</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      {metrics.totalRenewals} cycles
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions panel */}
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveNav('create_shop')}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision New Mart</span>
                </button>
                <button
                  onClick={() => setActiveNav('payment_history')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>View All Payment Receipts</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 9: SUBSCRIPTION PRICING MATRIX                           */}
          {/* ============================================================ */}
          {activeNav === 'subscription_pricing' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
                <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white">
                    <DollarSign className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Pakistani Rupee (PKR) Pricing Matrix</h2>
                    <p className="text-xs text-slate-400">
                      Configure standard global subscription tiers and custom rates per shop.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-400">1 Month Plan</span>
                      <span className="text-[10px] text-slate-400">30 Days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400">Rs.</span>
                      <input
                        type="number"
                        value={defaultPricing.oneMonth}
                        onChange={(e) =>
                          setDefaultPricing({ ...defaultPricing, oneMonth: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base font-black text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-400">3 Months Plan</span>
                      <span className="text-[10px] text-slate-400">Quarterly (90 Days)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400">Rs.</span>
                      <input
                        type="number"
                        value={defaultPricing.threeMonths}
                        onChange={(e) =>
                          setDefaultPricing({ ...defaultPricing, threeMonths: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base font-black text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-400">6 Months Plan</span>
                      <span className="text-[10px] text-slate-400">Half Yearly (180 Days)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400">Rs.</span>
                      <input
                        type="number"
                        value={defaultPricing.sixMonths}
                        onChange={(e) =>
                          setDefaultPricing({ ...defaultPricing, sixMonths: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base font-black text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-400">12 Months (1 Year) Plan</span>
                      <span className="text-[10px] text-slate-400">Annual (365 Days)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-400">Rs.</span>
                      <input
                        type="number"
                        value={defaultPricing.twelveMonths}
                        onChange={(e) =>
                          setDefaultPricing({ ...defaultPricing, twelveMonths: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base font-black text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleSaveDefaultPricing}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Global Pricing Matrix</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 10: PAYMENT HISTORY                                      */}
          {/* ============================================================ */}
          {activeNav === 'payment_history' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-slate-900 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-white">Subscription Payment Records</h2>
                  <p className="text-xs text-slate-400">
                    Official financial receipts issued & confirmed by Muhammad Waqas
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
                  {payments.length} Payments
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Shop Details</th>
                        <th className="py-3 px-4">Duration & Plan</th>
                        <th className="py-3 px-4">Amount Paid (PKR)</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Payment Date</th>
                        <th className="py-3 px-4">Confirmed By</th>
                        <th className="py-3 px-4 text-right">Receipt Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {p.receiptNumber}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-white">{p.shopName}</p>
                            <p className="text-slate-400 text-[11px]">{p.ownerName}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200">{p.durationLabel}</span>
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-400 text-sm">
                            Rs. {p.amountPaid.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">{p.paymentDate}</td>
                          <td className="py-3 px-4 text-slate-300">{p.confirmedBy}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setActiveReceipt(p);
                                setShowReceiptModal(true);
                              }}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 12: RENEWAL HISTORY                                     */}
          {/* ============================================================ */}
          {activeNav === 'renewal_history' && (
            <div className="space-y-5">
              <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Subscription Renewal History</h2>
                  <p className="text-xs text-slate-400">
                    Chronological audit trail of extended subscription cycles
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30">
                  {renewals.length} Renewals
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Renewal ID</th>
                        <th className="py-3 px-4">Shop Name</th>
                        <th className="py-3 px-4">Plan / Duration</th>
                        <th className="py-3 px-4">Previous Expiry</th>
                        <th className="py-3 px-4">Extended Expiry</th>
                        <th className="py-3 px-4">Fee Paid</th>
                        <th className="py-3 px-4">Receipt #</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {renewals.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">{r.id}</td>
                          <td className="py-3 px-4 font-bold text-white">{r.shopName}</td>
                          <td className="py-3 px-4 text-slate-200">
                            {r.durationDays} Days ({r.plan})
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{r.previousExpiry}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {r.newExpiry}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            Rs. {r.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-300">
                            {r.paymentReceiptNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(r.renewedAt).toLocaleString('en-PK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 13: AUDIT LOGS                                          */}
          {/* ============================================================ */}
          {activeNav === 'audit_logs' && (
            <div className="space-y-5">
              <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">System Security & Audit Trail</h2>
                  <p className="text-xs text-slate-400">
                    Tamper-evident logs of logins, renewals, shop creations, and payment events
                  </p>
                </div>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-bold border border-slate-700">
                  {auditLogs.length} Events Logged
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Event ID</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Actor Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4">Shop ID</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/50">
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.id}</td>
                          <td className="py-3 px-4 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                log.action.includes('SUCCESS') || log.action.includes('CREATED') || log.action.includes('RENEWED')
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : log.action.includes('FAILED') || log.action.includes('EXPIRED')
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200">{log.actorEmail}</td>
                          <td className="py-3 px-4 text-slate-400">{log.actorRole}</td>
                          <td className="py-3 px-4 text-slate-300 max-w-sm">{log.details}</td>
                          <td className="py-3 px-4 font-mono text-amber-400">{log.shopId || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {new Date(log.timestamp).toLocaleString('en-PK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PAGE 14: ADMIN SETTINGS                                      */}
          {/* ============================================================ */}
          {activeNav === 'admin_settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Software Owner Information */}
              <div className="bg-slate-900 border border-amber-500/30 p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black">
                    <Crown className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Software Owner Official Profile</h2>
                    <p className="text-xs text-amber-200/80">Authorized Master Licensee & Developer</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block font-bold">Software Name</span>
                    <span className="text-base font-black text-white mt-1 block">WAQAS POS SOFTWARE</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block font-bold">Software Owner</span>
                    <span className="text-base font-black text-amber-400 mt-1 block">Muhammad Waqas</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block font-bold">Support WhatsApp</span>
                    <a
                      href="https://wa.me/923228570782"
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-black text-emerald-400 mt-1 block hover:underline"
                    >
                      03228570782
                    </a>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block font-bold">Support Mobile</span>
                    <span className="text-base font-black text-white mt-1 block">03429634133</span>
                  </div>
                </div>
              </div>

              {/* Change Super Admin Password */}
              <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">Change Master Super Admin Password</h3>
                    <p className="text-xs text-slate-400">Update your private Software Owner login key</p>
                  </div>
                </div>

                {adminPassMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      adminPassMsg.isError
                        ? 'bg-red-950/60 border border-red-500/40 text-red-200'
                        : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    {adminPassMsg.isError ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <span>{adminPassMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangeAdminPassword} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">Current Password</label>
                    <input
                      type="password"
                      value={adminOldPass}
                      onChange={(e) => setAdminOldPass(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-300">New Master Password</label>
                    <input
                      type="password"
                      value={adminNewPass}
                      onChange={(e) => setAdminNewPass(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={changingPass}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs cursor-pointer disabled:opacity-50"
                    >
                      {changingPass ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Database Backup Export */}
              <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-white">System Data Backup & Export</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Download full JSON backup of shops, payments, audit logs, and POS databases.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: RECORD PAYMENT                                        */}
      {/* ============================================================== */}
      {showPaymentModal && selectedShopForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Record Subscription Payment</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white text-sm">{selectedShopForPayment.shopName}</p>
                <p className="text-slate-400">
                  Shop ID: <span className="text-amber-400 font-mono">{selectedShopForPayment.id}</span> • Owner:{' '}
                  {selectedShopForPayment.ownerName}
                </p>
                <p className="text-red-400 font-bold">
                  Remaining Due: Rs. {selectedShopForPayment.remainingBalance.toLocaleString()}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Payment Amount (PKR) *</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Payment Method</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value as PaymentMethodType)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Transaction Reference / TID (Optional)</label>
                <input
                  type="text"
                  value={paymentTxRefInput}
                  onChange={(e) => setPaymentTxRefInput(e.target.value)}
                  placeholder="e.g. TRX-98214"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Remarks / Notes</label>
                <input
                  type="text"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  placeholder="e.g. Month renewal payment"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black disabled:opacity-50"
                >
                  {recordingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: RENEW SUBSCRIPTION                                    */}
      {/* ============================================================== */}
      {showRenewModal && selectedShopForRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Renew Shop Subscription</h3>
              </div>
              <button
                onClick={() => setShowRenewModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white text-sm">{selectedShopForRenew.shopName}</p>
                <p className="text-slate-400">
                  Current Expiry:{' '}
                  <span className="text-amber-400 font-mono font-bold">
                    {selectedShopForRenew.expiryDate}
                  </span>
                </p>
                <p className="text-emerald-400 text-[11px]">
                  Extension preserves all remaining days if renewed prior to expiry date.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Renewal Plan Extension</label>
                <select
                  value={renewPlan}
                  onChange={(e) => {
                    const p = e.target.value as SubscriptionPlanType;
                    const daysMap: Record<string, number> = {
                      '1_month': 30,
                      '3_months': 90,
                      '6_months': 180,
                      '12_months': 365,
                      custom: 30,
                    };
                    const feeMap: Record<string, number> = {
                      '1_month': defaultPricing.oneMonth,
                      '3_months': defaultPricing.threeMonths,
                      '6_months': defaultPricing.sixMonths,
                      '12_months': defaultPricing.twelveMonths,
                      custom: 1500,
                    };
                    setRenewPlan(p);
                    setRenewDays(daysMap[p] || 30);
                    setRenewAmount(feeMap[p] || 1500);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white"
                >
                  <option value="1_month">1 Month (+30 Days) - Rs. {defaultPricing.oneMonth}</option>
                  <option value="3_months">3 Months (+90 Days) - Rs. {defaultPricing.threeMonths}</option>
                  <option value="6_months">6 Months (+180 Days) - Rs. {defaultPricing.sixMonths}</option>
                  <option value="12_months">12 Months (+365 Days) - Rs. {defaultPricing.twelveMonths}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Renewal Fee Amount (PKR)</label>
                <input
                  type="number"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Payment Method</label>
                <select
                  value={renewPaymentMethod}
                  onChange={(e) => setRenewPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewingShop}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl font-black disabled:opacity-50"
                >
                  {renewingShop ? 'Extending...' : 'Confirm & Renew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: PRINT OFFICIAL PAYMENT RECEIPT                        */}
      {/* ============================================================== */}
      {showReceiptModal && activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="text-center border-b pb-4 border-slate-200">
              <h3 className="text-lg font-black tracking-tight text-emerald-800">WAQAS POS SOFTWARE</h3>
              <p className="text-xs text-slate-500 font-bold">OFFICIAL SUBSCRIPTION RECEIPT</p>
              <p className="text-[11px] text-slate-400">Software Owner: Muhammad Waqas (03228570782)</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono font-bold">{activeReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shop Name:</span>
                <span className="font-bold">{activeReceipt.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Owner Name:</span>
                <span className="font-bold">{activeReceipt.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration / Plan:</span>
                <span className="font-bold uppercase">{activeReceipt.durationLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-mono">{activeReceipt.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-bold">{activeReceipt.paymentMethod}</span>
              </div>

              <div className="border-t border-b border-dashed py-2 my-2 flex justify-between text-sm font-black text-emerald-800">
                <span>Amount Paid:</span>
                <span>Rs. {activeReceipt.amountPaid.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Confirmed By:</span>
                <span className="font-bold">{activeReceipt.confirmedBy}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: EDIT CUSTOM PRICING                                   */}
      {/* ============================================================== */}
      {editingPricingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white">Custom Pricing Rate (PKR)</h3>
            <p className="text-xs text-slate-400">
              Set customized monthly rate for <strong>{editingPricingShop.shopName}</strong>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Custom Monthly Rate (Rs.)</label>
              <input
                type="number"
                value={editPriceRate}
                onChange={(e) => setEditPriceRate(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPricingShop(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomPricing}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Save Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
