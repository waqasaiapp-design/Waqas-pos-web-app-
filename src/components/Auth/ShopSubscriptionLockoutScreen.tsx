import React from 'react';
import {
  ShieldAlert,
  Phone,
  MessageCircle,
  LogOut,
  Calendar,
  Store,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { ShopAccount } from '../../types/pos';

interface ShopSubscriptionLockoutScreenProps {
  shop: ShopAccount;
  onLogout: () => void;
}

export const ShopSubscriptionLockoutScreen: React.FC<ShopSubscriptionLockoutScreenProps> = ({
  shop,
  onLogout,
}) => {
  const isSuspended = shop.status === 'suspended';
  const isBlocked = shop.status === 'blocked';
  const isExpired = shop.status === 'expired' || (!isSuspended && !isBlocked);

  const statusLabel = isBlocked
    ? 'Account Blocked'
    : isSuspended
    ? 'Subscription Suspended'
    : 'Subscription Expired';

  const statusColor = isBlocked
    ? 'from-red-600 to-rose-700'
    : isSuspended
    ? 'from-amber-600 to-orange-700'
    : 'from-amber-600 to-red-600';

  const whatsappMessage = encodeURIComponent(
    `Assalam-o-Alaikum Muhammad Waqas Bhai,\nI would like to renew the WAQAS POS SOFTWARE subscription for my shop:\n\n• Shop ID: ${shop.id}\n• Shop Name: ${shop.shopName}\n• Owner: ${shop.ownerName}\n• Current Expiry: ${shop.expiryDate}\n\nPlease share renewal payment details.`
  );

  const whatsappUrl = `https://wa.me/923228570782?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className={`bg-gradient-to-r ${statusColor} px-6 py-6 text-white text-center relative`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-lg border border-white/20 mb-3">
            <ShieldAlert className="w-9 h-9 text-white animate-pulse" />
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest text-white mb-1">
            {statusLabel}
          </span>
          <h1 className="text-2xl font-black tracking-tight">{shop.shopName}</h1>
          <p className="text-xs text-white/85 mt-1 font-medium">Shop Identifier: {shop.id}</p>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Reassurance Notice */}
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-extrabold text-emerald-300 uppercase tracking-wide">
                Your Business Data is 100% Safe & Intact
              </p>
              <p className="text-slate-300 leading-relaxed">
                All your product inventory, customer ledgers (Udhar khata), purchase invoices, and sales history remain securely stored in the system. To unlock the active POS workstation, please contact Software Owner Muhammad Waqas to confirm subscription renewal.
              </p>
            </div>
          </div>

          {/* Shop Details Matrix */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
            <div>
              <span className="text-slate-400 block font-medium">Registered Owner:</span>
              <span className="font-bold text-white text-sm">{shop.ownerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Active Subscription Plan:</span>
              <span className="font-bold text-emerald-400 text-sm uppercase">
                {shop.plan.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Subscription End Date:</span>
              <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {shop.expiryDate}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Monthly Renewal Rate:</span>
              <span className="font-bold text-white text-sm">
                Rs. {(shop.pricing?.customPricePerMonth || shop.pricing?.oneMonth || 1500).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Software Owner Information Card */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950/70 p-5 rounded-2xl border border-emerald-500/30 text-center space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Official Software Owner & Developer
              </span>
              <h3 className="text-lg font-black text-white mt-0.5">Muhammad Waqas</h3>
              <p className="text-xs text-slate-400">WAQAS POS SOFTWARE • Pakistan</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Renew via WhatsApp</span>
              </a>

              <a
                href="tel:03429634133"
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call: 03429634133</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-400">
              WhatsApp Support:{' '}
              <span className="text-emerald-300 font-bold select-all">03228570782</span> • Mobile:{' '}
              <span className="text-emerald-300 font-bold select-all">03429634133</span>
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Locked for renewal
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Log Out / Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
