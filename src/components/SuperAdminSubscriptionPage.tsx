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
  Check
} from 'lucide-react';
import {
  ShopAccount,
  SubscriptionPaymentRecord,
  ShopCustomPricing,
  SubscriptionPlanType,
  AccountStatus,
  PaymentMethodType
} from '../types/pos';
import { getApiBaseUrl, safeFetchJson } from '../utils/apiClient';

interface SuperAdminSubscriptionPageProps {
  onBackToDashboard: () => void;
  currentShopName?: string;
}

export const SuperAdminSubscriptionPage: React.FC<SuperAdminSubscriptionPageProps> = ({
  onBackToDashboard,
  currentShopName = 'Waqas Mart',
}) => {
  const [shops, setShops] = useState<ShopAccount[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [defaultPricing, setDefaultPricing] = useState<Record<string, number>>({
    '1_month': 3500,
    '3_months': 9500,
    '6_months': 18000,
    '12_months': 32000,
  });
  const [summary, setSummary] = useState({
    totalShops: 1,
    activeShops: 1,
    expiredShops: 0,
    totalRevenuePKR: 35000,
    pendingReceivablesPKR: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedShopForPayment, setSelectedShopForPayment] = useState<ShopAccount | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(3500);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('JazzCash');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentMonths, setPaymentMonths] = useState<number>(1);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<SubscriptionPaymentRecord | null>(null);

  // New Shop Modal
  const [showNewShopModal, setShowNewShopModal] = useState(false);
  const [newShopData, setNewShopData] = useState({
    shopName: '',
    ownerName: '',
    ownerPhone: '',
    ownerWhatsApp: '',
    city: 'Multan',
    planType: '1_month' as SubscriptionPlanType,
    monthlyRatePKR: 3500,
  });

  // Edit Pricing Modal
  const [editingPricingShop, setEditingPricingShop] = useState<ShopAccount | null>(null);
  const [customRateInput, setCustomRateInput] = useState<number>(3500);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/overview`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShops(data.shops || []);
          setPayments(data.payments || []);
          setDefaultPricing(data.defaultPricing || defaultPricing);
          setSummary(data.summary || summary);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch subscriptions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleStatusChange = async (shopId: string, newStatus: AccountStatus) => {
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/shops/${shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchSubscriptions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCustomPricing = async () => {
    if (!editingPricingShop) return;
    try {
      const base = getApiBaseUrl();
      await fetch(`${base}/api/subscriptions/shops/${editingPricingShop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: {
            ...editingPricingShop.pricing,
            customPricePerMonth: customRateInput,
          },
        }),
      });
      setEditingPricingShop(null);
      fetchSubscriptions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForPayment) return;

    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShopForPayment.id,
          amountPKR: paymentAmount,
          method: paymentMethod,
          monthsGranted: paymentMonths,
          referenceId: paymentRef,
          notes: paymentNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastPaymentReceipt(data.payment);
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        fetchSubscriptions();
      }
    } catch (e) {
      alert('Error recording payment');
    }
  };

  const handleCreateNewShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/subscriptions/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShopData),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewShopModal(false);
        fetchSubscriptions();
      } else {
        alert(data.message || 'Failed to create shop');
      }
    } catch (e) {
      alert('Error creating shop account');
    }
  };

  const filteredShops = shops.filter((s) => {
    const matchesSearch =
      s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery)) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-slate-800 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#034424] text-white border-b border-emerald-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-colors border border-white/10"
              title="Return to POS Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to POS</span>
            </button>
            <div className="h-6 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Muhammad Waqas Super Admin
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                    Master Portal
                  </span>
                </h1>
                <p className="text-xs text-emerald-200">
                  WAQAS MART POS Software Subscriptions & Multi-Shop Licensing
                </p>
              </div>
            </div>
          </div>

          {/* Software Owner Contacts */}
          <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs text-emerald-100">
            <span className="font-semibold text-amber-300">Software Owner:</span>
            <span>Muhammad Waqas</span>
            <span className="text-emerald-400">|</span>
            <a
              href="https://wa.me/923228570782"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-emerald-300 hover:text-white underline font-mono"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              0322-8570782
            </a>
            <span className="text-emerald-400">|</span>
            <a
              href="tel:03429634133"
              className="flex items-center gap-1 text-emerald-300 hover:text-white font-mono"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              0342-9634133
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Active Licenses</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{summary.activeShops}</p>
              <span className="text-[11px] text-slate-400">Total registered: {summary.totalShops}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Expired / Due</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{summary.expiredShops}</p>
              <span className="text-[11px] text-rose-500 font-medium">Needs renewal action</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Total Subscription Revenue</p>
              <p className="text-2xl font-black text-slate-800 mt-1">
                Rs. {summary.totalRevenuePKR.toLocaleString()}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">All time collected</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Pending Receivables</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                Rs. {summary.pendingReceivablesPKR.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">Udhar / Overdue</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Pricing Tier Plans Guide */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Standard POS Licensing Rates (Pakistani Rupee - PKR)
              </h2>
              <p className="text-xs text-slate-500">
                Official licensing packages configured by Muhammad Waqas for Pakistani retail marts
              </p>
            </div>
            <button
              onClick={() => setShowNewShopModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#057a44] hover:bg-[#034424] text-white font-medium text-sm transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Shop Client</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-emerald-300 transition-all">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly</span>
              <p className="text-2xl font-black text-slate-800 mt-1">
                Rs. {defaultPricing['1_month']?.toLocaleString() || '3,500'}
                <span className="text-xs font-normal text-slate-400"> / mo</span>
              </p>
              <ul className="text-xs text-slate-600 mt-3 space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Full POS + Barcode
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Customer & Supplier Udhar
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 hover:border-emerald-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Quarterly (3 Mos)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">10% OFF</span>
              </div>
              <p className="text-2xl font-black text-emerald-800 mt-1">
                Rs. {defaultPricing['3_months']?.toLocaleString() || '9,500'}
              </p>
              <ul className="text-xs text-slate-600 mt-3 space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Multi-device Sync
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Priority WhatsApp Support
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Half-Yearly (6 Mos)</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">POPULAR</span>
              </div>
              <p className="text-2xl font-black text-slate-800 mt-1">
                Rs. {defaultPricing['6_months']?.toLocaleString() || '18,000'}
              </p>
              <ul className="text-xs text-slate-600 mt-3 space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Database Cloud Backup
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Free Thermal Receipt Setup
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50/30 relative">
              <div className="absolute -top-2.5 right-3 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                BEST VALUE
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">Annual (12 Mos)</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                Rs. {defaultPricing['12_months']?.toLocaleString() || '32,000'}
              </p>
              <ul className="text-xs text-slate-700 mt-3 space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Complete Year Licensing
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> VIP 24/7 Phone Support
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Multi-Shop Client Table & Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">Registered Mart Clients</h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                {filteredShops.length} shops
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search shop, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 w-48 sm:w-64"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 focus:outline-none focus:border-emerald-600"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                onClick={fetchSubscriptions}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Shop / Business</th>
                  <th className="px-4 py-3">Owner Contact</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Plan & Expiry</th>
                  <th className="px-4 py-3">Rate (PKR)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Overdue</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShops.map((shop) => {
                  const expiryTimestamp = new Date(shop.expiryDate).getTime() || Date.now();
                  const daysLeft = Math.ceil((expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = daysLeft <= 5 && daysLeft > 0;
                  const isExpired = daysLeft <= 0;

                  return (
                    <tr key={shop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            {shop.shopName.charAt(0)}
                          </div>
                          <div>
                            <div>{shop.shopName}</div>
                            <span className="text-[10px] text-slate-400 font-normal">ID: {shop.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{shop.ownerName}</div>
                        <div className="text-[11px] flex items-center gap-1.5 mt-0.5">
                          <span className="text-slate-500">{shop.phone}</span>
                          {shop.whatsapp && (
                            <a
                              href={`https://wa.me/92${shop.whatsapp.replace(/^0+/, '')}?text=Dear%20${encodeURIComponent(shop.ownerName)},%20your%20Waqas%20Mart%20POS%20license%20renewal%20reminder%20from%20Software%20Owner%20Muhammad%20Waqas%20(03228570782).`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-500" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{shop.address || 'Multan'}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold capitalize text-slate-800">
                          {shop.plan.replace('_', ' ')}
                        </div>
                        <div
                          className={`text-[11px] font-medium flex items-center gap-1 mt-0.5 ${
                            isExpired
                              ? 'text-rose-600'
                              : isExpiringSoon
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            {isExpired
                              ? `Expired ${Math.abs(daysLeft)} days ago`
                              : `${daysLeft} days remaining`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1">
                          <span>Rs. {shop.pricing?.customPricePerMonth?.toLocaleString() || '3,500'}</span>
                          <button
                            onClick={() => {
                              setEditingPricingShop(shop);
                              setCustomRateInput(shop.pricing?.customPricePerMonth || 3500);
                            }}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                            title="Edit Custom Rate"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            shop.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : shop.status === 'expired'
                              ? 'bg-rose-100 text-rose-800'
                              : shop.status === 'suspended'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {shop.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-rose-600">
                        {shop.remainingBalance > 0 ? `Rs. ${shop.remainingBalance.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedShopForPayment(shop);
                              setPaymentAmount(shop.pricing?.customPricePerMonth || 3500);
                              setShowPaymentModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Record Payment</span>
                          </button>

                          {shop.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(shop.id, 'suspended')}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Suspend License"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(shop.id, 'active')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Reactivate License"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Recent Subscription Payments Log
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Shop Name</th>
                  <th className="px-4 py-2.5">Amount (PKR)</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Reference / Tx ID</th>
                  <th className="px-4 py-2.5">Months</th>
                  <th className="px-4 py-2.5">Received By</th>
                  <th className="px-4 py-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                      No payment records found yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-600">
                        {new Date(p.paymentDate).toLocaleDateString('en-PK', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{p.shopName}</td>
                      <td className="px-4 py-2.5 font-bold text-emerald-700">
                        Rs. {(p.amountPaid ?? p.totalAmount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{p.transactionReference || p.receiptNumber || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-700">{p.durationLabel || p.plan || '1 mo'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.confirmedBy || 'Muhammad Waqas'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setLastPaymentReceipt(p);
                            setShowReceiptModal(true);
                          }}
                          className="px-2 py-1 text-[11px] rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                        >
                          Print Slip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedShopForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#034424] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Record Subscription Payment</h3>
                <p className="text-xs text-emerald-200">Shop: {selectedShopForPayment.shopName}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Payment Amount (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rs.</span>
                  <input
                    type="number"
                    min={0}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Duration (Months)
                  </label>
                  <select
                    value={paymentMonths}
                    onChange={(e) => setPaymentMonths(Number(e.target.value))}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  >
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Hand-to-Hand</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Transaction / TID / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="e.g. TID-982341908 or Bank Slip #"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Notes / Remark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via WhatsApp proof"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-800 border border-emerald-200">
                <p className="font-semibold">Automatic License Extension</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Submitting will automatically extend {selectedShopForPayment.shopName}'s license by{' '}
                  {paymentMonths} month(s) and set status to Active.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#057a44] hover:bg-[#034424] rounded-xl transition-colors shadow-sm"
                >
                  Confirm & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && lastPaymentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-4">
                <div className="inline-flex p-2 bg-emerald-100 text-emerald-800 rounded-full mb-2">
                  <Crown className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase">
                  Muhammad Waqas Software Solutions
                </h3>
                <p className="text-xs text-slate-600">Official POS License Payment Receipt</p>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  WhatsApp: 0322-8570782 | Phone: 0342-9634133
                </div>
              </div>

              {/* Receipt Details */}
              <div className="text-xs space-y-2 py-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-800">{lastPaymentReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(lastPaymentReceipt.paymentDate).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shop / Client:</span>
                  <span className="font-bold text-slate-900">{lastPaymentReceipt.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-semibold text-slate-800">{lastPaymentReceipt.paymentMethod}</span>
                </div>
                {(lastPaymentReceipt.transactionReference || lastPaymentReceipt.receiptNumber) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">TID / Ref:</span>
                    <span className="font-mono text-slate-800">
                      {lastPaymentReceipt.transactionReference || lastPaymentReceipt.receiptNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">License Extension:</span>
                  <span className="font-bold text-emerald-700">
                    {lastPaymentReceipt.durationLabel || `${lastPaymentReceipt.plan}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between items-center text-sm font-black">
                  <span>Amount Paid:</span>
                  <span className="text-emerald-700">
                    Rs. {(lastPaymentReceipt.amountPaid ?? lastPaymentReceipt.totalAmount ?? 0).toLocaleString()} PKR
                  </span>
                </div>
              </div>

              {/* Verification Stamp */}
              <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  ✓ Verified & Confirmed by Muhammad Waqas
                </span>
                <span className="text-[10px] text-emerald-700">
                  WAQAS MART POS Multi-Shop Core System
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 px-3 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="py-2 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register New Shop Client Modal */}
      {showNewShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#034424] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Register New Mart Client</h3>
                <p className="text-xs text-emerald-200">Issue a new WAQAS MART POS license</p>
              </div>
              <button
                onClick={() => setShowNewShopModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewShop} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Mart / Shop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Madina Super Store"
                  value={newShopData.shopName}
                  onChange={(e) => setNewShopData({ ...newShopData, shopName: e.target.value })}
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Owner Full Name"
                    value={newShopData.ownerName}
                    onChange={(e) => setNewShopData({ ...newShopData, ownerName: e.target.value })}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Multan, Lahore"
                    value={newShopData.city}
                    onChange={(e) => setNewShopData({ ...newShopData, city: e.target.value })}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={newShopData.ownerPhone}
                    onChange={(e) => setNewShopData({ ...newShopData, ownerPhone: e.target.value })}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="03001234567"
                    value={newShopData.ownerWhatsApp}
                    onChange={(e) => setNewShopData({ ...newShopData, ownerWhatsApp: e.target.value })}
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Initial Plan
                  </label>
                  <select
                    value={newShopData.planType}
                    onChange={(e) =>
                      setNewShopData({
                        ...newShopData,
                        planType: e.target.value as SubscriptionPlanType,
                      })
                    }
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                  >
                    <option value="1_month">1 Month</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="12_months">12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Monthly Rate (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newShopData.monthlyRatePKR}
                    onChange={(e) =>
                      setNewShopData({ ...newShopData, monthlyRatePKR: Number(e.target.value) })
                    }
                    className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewShopModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#057a44] hover:bg-[#034424] rounded-xl transition-colors shadow-sm"
                >
                  Create & Activate License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Custom Pricing Modal */}
      {editingPricingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Custom Monthly Rate for {editingPricingShop.shopName}
            </h3>
            <p className="text-xs text-slate-500">
              Set special custom PKR pricing for this specific mart client.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Custom Rate (PKR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rs.</span>
                <input
                  type="number"
                  min={0}
                  value={customRateInput}
                  onChange={(e) => setCustomRateInput(Number(e.target.value))}
                  className="w-full pl-10 pr-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPricingShop(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCustomPricing}
                className="px-4 py-2 text-xs font-bold text-white bg-[#057a44] hover:bg-[#034424] rounded-xl transition-colors shadow-sm"
              >
                Save Custom Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
