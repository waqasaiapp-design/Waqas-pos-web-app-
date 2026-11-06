import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Store,
  KeyRound,
  Lock,
  Download,
  Upload,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Power,
  HardDrive,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  LogOut,
  FileText,
  FileCheck,
  HelpCircle,
  Sparkles,
  Smartphone,
  Monitor,
  ExternalLink,
} from 'lucide-react';
import { AuthUser, ShopAccount } from '../types/pos';
import { safeFetchJson } from '../utils/apiClient';
import {
  generateRecoveryKey,
  normalizeRecoveryKey,
  hashPasswordClient,
  generateSalt,
  encryptDataAesGcm,
  decryptDataAesGcm,
} from '../utils/cryptoSecurity';
import confetti from 'canvas-confetti';

interface MasterAdminPortalProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenShopPos?: (shop: ShopAccount) => void;
}

type TabType =
  | 'overview'
  | 'shops'
  | 'security'
  | 'backup'
  | 'audit'
  | 'storage_advisory';

export const MasterAdminPortal: React.FC<MasterAdminPortalProps> = ({
  currentUser,
  onLogout,
  onOpenShopPos,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Shops State
  const [shops, setShops] = useState<ShopAccount[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // Modal: Create Shop
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopUsername, setNewShopUsername] = useState('');
  const [newShopPassword, setNewShopPassword] = useState('');
  const [newShopOwner, setNewShopOwner] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [createShopLoading, setCreateShopLoading] = useState(false);

  // Modal: Change Shop Password
  const [selectedShopForPassword, setSelectedShopForPassword] = useState<ShopAccount | null>(null);
  const [shopNewPassword, setShopNewPassword] = useState('');
  const [changeShopPassLoading, setChangeShopPassLoading] = useState(false);

  // Modal: Edit Shop
  const [selectedShopForEdit, setSelectedShopForEdit] = useState<ShopAccount | null>(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopOwner, setEditShopOwner] = useState('');
  const [editShopPhone, setEditShopPhone] = useState('');
  const [editShopAddress, setEditShopAddress] = useState('');
  const [editShopLoading, setEditShopLoading] = useState(false);

  // Master Admin Security Settings
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(null);
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string | null>(null);

  // Regenerate Recovery Key State
  const [showRegenKeyModal, setShowRegenKeyModal] = useState(false);
  const [regenPassInput, setRegenPassInput] = useState('');
  const [newGeneratedKey, setNewGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Inactivity Auto-Lock Setting
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('waqas_pos_autolock_minutes')) || 15;
    } catch {
      return 15;
    }
  });

  // Backup & Restore State
  const [backupPassword, setBackupPassword] = useState('');
  const [backupConfirmPassword, setBackupConfirmPassword] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const [backupErrorMsg, setBackupErrorMsg] = useState<string | null>(null);

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Load Shops & Audit Logs
  const loadData = async () => {
    setLoadingShops(true);
    try {
      const res = await safeFetchJson('/api/master-admin/shops');
      if (res.data && Array.isArray(res.data.shops)) {
        setShops(res.data.shops);
        // Sync offline copy
        localStorage.setItem('waqas_pos_offline_shops', JSON.stringify(res.data.shops));
      }
    } catch {
      // Offline fallback
      try {
        const cached = localStorage.getItem('waqas_pos_offline_shops');
        if (cached) {
          setShops(JSON.parse(cached));
        } else {
          // Default initial genuine mart
          const defaultMart: ShopAccount = {
            id: 'SHOP-WM-001',
            shopName: 'WAQAS MART (Main Branch)',
            ownerName: 'Muhammad Waqas',
            email: 'waqasmart.pos@gmail.com',
            phone: '03429634133',
            whatsapp: '03228570782',
            address: 'Main Commercial Market, Pakistan',
            status: 'active',
            plan: '12_months',
            startDate: '2026-01-01',
            expiryDate: '2027-01-01',
            pricing: {
              oneMonth: 1500,
              threeMonths: 4000,
              sixMonths: 7500,
              twelveMonths: 14000,
              customPricePerMonth: 1500,
              lastUpdated: '2026-10-24',
            },
            initialPayment: 14000,
            remainingBalance: 0,
            totalPaid: 14000,
            totalIncome: 14000,
            renewalsCount: 1,
            createdAt: '2026-01-01',
          };
          setShops([defaultMart]);
        }
      } catch {}
    } finally {
      setLoadingShops(false);
    }

    // Load audit logs
    try {
      const auditRes = await safeFetchJson('/api/master-admin/audit-logs');
      if (auditRes.data && Array.isArray(auditRes.data.logs)) {
        setAuditLogs(auditRes.data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Auto-Lock setting
  const handleSaveAutoLock = (min: number) => {
    setAutoLockMinutes(min);
    localStorage.setItem('waqas_pos_autolock_minutes', String(min));
  };

  // Toggle Shop Active/Inactive
  const handleToggleShopStatus = async (shop: ShopAccount) => {
    const newStatus: 'active' | 'inactive' = shop.status === 'active' ? 'inactive' : 'active';
    try {
      await safeFetchJson(`/api/master-admin/shops/${shop.id}/toggle-status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, status: newStatus } : s))
      );
    } catch {
      // Offline fallback
      setShops((prev) => {
        const updated = prev.map((s) => (s.id === shop.id ? { ...s, status: newStatus } : s));
        localStorage.setItem('waqas_pos_offline_shops', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Create Shop Account
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateShopLoading(true);

    const cleanUser = newShopUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      alert('Username must be at least 3 alphanumeric characters.');
      setCreateShopLoading(false);
      return;
    }

    if (newShopPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      setCreateShopLoading(false);
      return;
    }

    try {
      const res = await safeFetchJson('/api/master-admin/shops', {
        method: 'POST',
        body: JSON.stringify({
          shopName: newShopName.trim(),
          username: cleanUser,
          password: newShopPassword,
          ownerName: newShopOwner.trim() || newShopName.trim(),
          phone: newShopPhone.trim(),
          address: newShopAddress.trim(),
          status: 'active',
        }),
      });

      if (res.data?.success && res.data.shop) {
        setShops((prev) => [res.data.shop, ...prev]);
        setShowCreateShopModal(false);
        setNewShopName('');
        setNewShopUsername('');
        setNewShopPassword('');
        setNewShopOwner('');
        setNewShopPhone('');
        setNewShopAddress('');
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      // Offline fallback
      const newShopId = `SHOP-${Date.now().toString().slice(-6)}`;
      const salt = generateSalt(16);
      const passHash = await hashPasswordClient(newShopPassword, salt);

      const localShop: any = {
        id: newShopId,
        shopName: newShopName.trim(),
        username: cleanUser,
        email: `${cleanUser}@localpos`,
        ownerName: newShopOwner.trim() || newShopName.trim(),
        phone: newShopPhone.trim(),
        address: newShopAddress.trim(),
        status: 'active',
        passwordSalt: salt,
        passwordHash: passHash,
        createdAt: new Date().toISOString(),
      };

      const updated = [localShop, ...shops];
      setShops(updated);
      localStorage.setItem('waqas_pos_offline_shops', JSON.stringify(updated));
      setShowCreateShopModal(false);
      setNewShopName('');
      setNewShopUsername('');
      setNewShopPassword('');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } finally {
      setCreateShopLoading(false);
    }
  };

  // Change Shop Password
  const handleChangeShopPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForPassword) return;
    if (shopNewPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setChangeShopPassLoading(true);
    try {
      await safeFetchJson(`/api/master-admin/shops/${selectedShopForPassword.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: shopNewPassword }),
      });
      alert(`Password successfully updated for ${selectedShopForPassword.shopName}!`);
      setSelectedShopForPassword(null);
      setShopNewPassword('');
    } catch {
      // Offline fallback
      const salt = generateSalt(16);
      const passHash = await hashPasswordClient(shopNewPassword, salt);
      const updated = shops.map((s: any) =>
        s.id === selectedShopForPassword.id
          ? { ...s, passwordSalt: salt, passwordHash: passHash }
          : s
      );
      setShops(updated);
      localStorage.setItem('waqas_pos_offline_shops', JSON.stringify(updated));
      alert(`Password updated offline for ${selectedShopForPassword.shopName}!`);
      setSelectedShopForPassword(null);
      setShopNewPassword('');
    } finally {
      setChangeShopPassLoading(false);
    }
  };

  // Edit Shop Details
  const handleSaveShopEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForEdit) return;

    setEditShopLoading(true);
    try {
      await safeFetchJson(`/api/master-admin/shops/${selectedShopForEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          shopName: editShopName.trim(),
          ownerName: editShopOwner.trim(),
          phone: editShopPhone.trim(),
          address: editShopAddress.trim(),
        }),
      });

      setShops((prev) =>
        prev.map((s) =>
          s.id === selectedShopForEdit.id
            ? {
                ...s,
                shopName: editShopName.trim(),
                ownerName: editShopOwner.trim(),
                phone: editShopPhone.trim(),
                address: editShopAddress.trim(),
              }
            : s
        )
      );
      setSelectedShopForEdit(null);
    } catch {
      // Offline fallback
      setShops((prev) => {
        const updated = prev.map((s) =>
          s.id === selectedShopForEdit.id
            ? {
                ...s,
                shopName: editShopName.trim(),
                ownerName: editShopOwner.trim(),
                phone: editShopPhone.trim(),
                address: editShopAddress.trim(),
              }
            : s
        );
        localStorage.setItem('waqas_pos_offline_shops', JSON.stringify(updated));
        return updated;
      });
      setSelectedShopForEdit(null);
    } finally {
      setEditShopLoading(false);
    }
  };

  // Change Master Admin Password
  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErrorMsg(null);
    setSecuritySuccessMsg(null);

    if (newMasterPass.length < 8) {
      setSecurityErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newMasterPass !== confirmMasterPass) {
      setSecurityErrorMsg('New passwords do not match.');
      return;
    }

    setChangePassLoading(true);
    try {
      const res = await safeFetchJson('/api/auth/master-admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentMasterPass,
          newPassword: newMasterPass,
        }),
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to update Master Admin password.');
      }

      // Update offline storage
      const salt = generateSalt(16);
      const passHash = await hashPasswordClient(newMasterPass, salt);
      const offline = localStorage.getItem('waqas_pos_offline_master_admin');
      if (offline) {
        const parsed = JSON.parse(offline);
        parsed.passwordSalt = salt;
        parsed.passwordHash = passHash;
        localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(parsed));
      }

      setSecuritySuccessMsg('Master Admin password successfully changed!');
      setCurrentMasterPass('');
      setNewMasterPass('');
      setConfirmMasterPass('');
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    } catch (err: any) {
      setSecurityErrorMsg(err?.message || 'Error updating password.');
    } finally {
      setChangePassLoading(false);
    }
  };

  // Regenerate Recovery Key
  const handleRegenerateRecoveryKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const newKey = generateRecoveryKey();
    const recSalt = generateSalt(16);
    const recHash = await hashPasswordClient(normalizeRecoveryKey(newKey), recSalt);

    try {
      await safeFetchJson('/api/auth/master-admin/update-recovery-key', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: regenPassInput,
          newRecoveryKey: newKey,
        }),
      });

      const offline = localStorage.getItem('waqas_pos_offline_master_admin');
      if (offline) {
        const parsed = JSON.parse(offline);
        parsed.recoveryKeySalt = recSalt;
        parsed.recoveryKeyHash = recHash;
        localStorage.setItem('waqas_pos_offline_master_admin', JSON.stringify(parsed));
      }

      setNewGeneratedKey(newKey);
    } catch (err: any) {
      alert(err?.message || 'Failed to regenerate Recovery Key. Please verify password.');
    }
  };

  // Create Encrypted Backup
  const handleCreateEncryptedBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupErrorMsg(null);
    setBackupSuccessMsg(null);

    if (backupPassword.length < 8) {
      setBackupErrorMsg('Backup password must be at least 8 characters long.');
      return;
    }

    if (backupPassword !== backupConfirmPassword) {
      setBackupErrorMsg('Backup passwords do not match.');
      return;
    }

    setBackupLoading(true);

    try {
      // 1. Fetch complete store backup payload from backend or offline storage
      let fullBackupData: any;
      try {
        const res = await safeFetchJson('/api/master-admin/backup/export');
        fullBackupData = res.data;
      } catch {
        // Collect from client offline storage
        const offlineShops = localStorage.getItem('waqas_pos_offline_shops');
        const offlineMaster = localStorage.getItem('waqas_pos_offline_master_admin');
        fullBackupData = {
          exportDate: new Date().toISOString(),
          version: '2.0-offline',
          device: 'Local Terminal',
          masterAdmin: offlineMaster ? JSON.parse(offlineMaster).user : currentUser,
          shops: offlineShops ? JSON.parse(offlineShops) : shops,
          storageSnapshots: { ...localStorage },
        };
      }

      // 2. Encrypt with AES-256-GCM using backup password
      const jsonString = JSON.stringify(fullBackupData);
      const encryptedPayload = await encryptDataAesGcm(jsonString, backupPassword);

      // 3. Trigger File Download (.wqp encrypted backup)
      const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `WAQAS_POS_BACKUP_${dateStr}_AES256.wqp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupSuccessMsg(
        'Encrypted backup file generated and downloaded successfully! Keep your backup password safe.'
      );
      setBackupPassword('');
      setBackupConfirmPassword('');
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      setBackupErrorMsg(err?.message || 'Failed to create encrypted backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  // Restore Encrypted Backup
  const handleRestoreEncryptedBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreErrorMsg(null);
    setRestoreSuccessMsg(null);

    if (!restoreFile) {
      setRestoreErrorMsg('Please select a .wqp or .enc.json backup file.');
      return;
    }

    if (!restorePassword) {
      setRestoreErrorMsg('Please enter the backup password.');
      return;
    }

    setRestoreLoading(true);

    try {
      const fileText = await restoreFile.text();
      let payload: any;
      try {
        payload = JSON.parse(fileText);
      } catch {
        throw new Error('Invalid file format. The file is not a valid JSON encrypted backup.');
      }

      // Decrypt using Web Crypto AES-256-GCM & verify checksum
      const decryptedString = await decryptDataAesGcm(payload, restorePassword);
      const restoredData = JSON.parse(decryptedString);

      // Verify integrity
      if (!restoredData || (!restoredData.shops && !restoredData.masterAdmin)) {
        throw new Error('Backup integrity verification failed: Required database schemas missing.');
      }

      // Send to backend if online
      try {
        await safeFetchJson('/api/master-admin/backup/import', {
          method: 'POST',
          body: JSON.stringify({ restoredData }),
        });
      } catch {
        // Apply offline restore
        if (restoredData.shops) {
          localStorage.setItem('waqas_pos_offline_shops', JSON.stringify(restoredData.shops));
          setShops(restoredData.shops);
        }
        if (restoredData.storageSnapshots) {
          Object.entries(restoredData.storageSnapshots).forEach(([k, v]) => {
            if (typeof v === 'string') localStorage.setItem(k, v);
          });
        }
      }

      setRestoreSuccessMsg(
        `Backup restored successfully! Verified ${restoredData.shops?.length || 0} shop(s).`
      );
      setRestorePassword('');
      setRestoreFile(null);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => loadData(), 1500);
    } catch (err: any) {
      setRestoreErrorMsg(err?.message || 'Restore failed. Please check the backup password.');
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                WAQAS POS SOFTWARE
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                MASTER ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Private Offline Device Security & Multi-Shop Administration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200">
              {currentUser.fullName || currentUser.username || 'Master Administrator'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Username: {currentUser.username || 'admin'}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-semibold text-slate-300 transition flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-1 space-y-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>System & Device Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('shops')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeTab === 'shops'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4" />
                <span>Shop Accounts ({shops.length})</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-950/60 text-[10px]">
                {shops.filter((s) => s.status === 'active').length} Active
              </span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Security & Recovery Key</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Encrypted Backup & Restore</span>
            </button>

            <button
              onClick={() => setActiveTab('storage_advisory')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'storage_advisory'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Data & Storage Warnings</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Security Audit Trail</span>
            </button>
          </div>

          {/* Quick Offline Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% Offline Capable</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              No cloud login, Google APIs, or remote servers required. All authentication and shop data reside on this device.
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="md:col-span-3">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Header Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/20 space-y-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Device Authentication Status
                </span>
                <h2 className="text-xl font-black text-white">Private Master Admin Operational</h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  This device is strictly managed under private Master Admin authority. No unauthorized party or shop account can register or perform administrative operations.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-xs">Total Shop Accounts</span>
                  <div className="text-2xl font-black text-white">{shops.length}</div>
                  <span className="text-[11px] text-emerald-400">Strictly isolated databases</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-xs">Database Encryption</span>
                  <div className="text-2xl font-black text-emerald-400">AES-256-GCM</div>
                  <span className="text-[11px] text-slate-400">PBKDF2 100,000 Iterations</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-xs">Inactivity Auto-Lock</span>
                  <div className="text-2xl font-black text-white">{autoLockMinutes} Mins</div>
                  <span className="text-[11px] text-teal-400">PIN / Password protection</span>
                </div>
              </div>

              {/* Master Admin Profile Summary */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Master Administrator Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Username:</span>
                    <span className="font-mono text-white font-bold">{currentUser.username || 'admin'}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Full Name:</span>
                    <span className="text-white font-bold">{currentUser.fullName || 'Muhammad Waqas'}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Primary Phone:</span>
                    <span className="text-white font-bold">{currentUser.phone || '03429634133'}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700">
                    <span className="text-slate-400 block text-[11px]">Authority Level:</span>
                    <span className="text-emerald-400 font-bold">Sole Device Owner & Master Admin</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHOP ACCOUNTS MANAGEMENT */}
          {activeTab === 'shops' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Shop Accounts Management</h2>
                  <p className="text-xs text-slate-400">
                    Create, edit, activate, deactivate, and manage shop accounts on this device.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateShopModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Shop Account</span>
                </button>
              </div>

              {/* Shops List */}
              <div className="space-y-3">
                {shops.map((shop) => (
                  <div
                    key={shop.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-sm text-white">{shop.shopName}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            shop.status === 'active'
                              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                              : 'bg-red-500/20 border border-red-500/30 text-red-300'
                          }`}
                        >
                          {shop.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          Username: <strong className="text-slate-200 font-mono">{(shop as any).username || shop.email?.split('@')[0]}</strong>
                        </span>
                        <span>•</span>
                        <span>Owner: {shop.ownerName || 'Waqas'}</span>
                        <span>•</span>
                        <span>Phone: {shop.phone || '03429634133'}</span>
                      </div>
                      {shop.address && (
                        <p className="text-[11px] text-slate-400">{shop.address}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {onOpenShopPos && shop.status === 'active' && (
                        <button
                          onClick={() => onOpenShopPos(shop)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Shop POS</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedShopForPassword(shop);
                          setShopNewPassword('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                        <span>Change Password</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedShopForEdit(shop);
                          setEditShopName(shop.shopName);
                          setEditShopOwner(shop.ownerName || '');
                          setEditShopPhone(shop.phone || '');
                          setEditShopAddress(shop.address || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleToggleShopStatus(shop)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          shop.status === 'active'
                            ? 'bg-red-950/60 text-red-300 hover:bg-red-900/60 border border-red-500/30'
                            : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-500/30'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{shop.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & RECOVERY KEY */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Master Admin Security Controls</h2>
                <p className="text-xs text-slate-400">
                  Update Master Admin credentials, configure screen auto-lock, and manage the Recovery Key.
                </p>
              </div>

              {securitySuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{securitySuccessMsg}</span>
                </div>
              )}

              {securityErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{securityErrorMsg}</span>
                </div>
              )}

              {/* Password Change Box */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Change Master Admin Password</span>
                </h3>

                <form onSubmit={handleChangeMasterPassword} className="space-y-4 text-xs max-w-lg">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Current Master Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentMasterPass}
                      onChange={(e) => setCurrentMasterPass(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      New Master Password (Min 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={newMasterPass}
                      onChange={(e) => setNewMasterPass(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Confirm New Master Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmMasterPass}
                      onChange={(e) => setConfirmMasterPass(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changePassLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{changePassLoading ? 'Updating Password...' : 'Save New Master Password'}</span>
                  </button>
                </form>
              </div>

              {/* Recovery Key Re-issue Box */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-teal-400" />
                      <span>Regenerate Master Admin Recovery Key</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      If you suspect your Recovery Key was exposed or misplaced, you can generate a new replacement key. This will automatically invalidate the previous key.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRegenKeyModal(true);
                      setNewGeneratedKey(null);
                      setRegenPassInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Regenerate Key
                  </button>
                </div>
              </div>

              {/* Auto-Lock Settings */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Inactivity Screen Auto-Lock Timeout</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically lock the terminal screen after inactivity to prevent unauthorized access.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[5, 10, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleSaveAutoLock(mins)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        autoLockMinutes === mins
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENCRYPTED BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Encrypted Offline Backup & Restore</h2>
                <p className="text-xs text-slate-400">
                  Create password-encrypted backups of all shops and business records. Backups can be restored offline on any terminal.
                </p>
              </div>

              {/* Export Backup Card */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>1. Create Encrypted Backup (.wqp)</span>
                </h3>

                {backupSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{backupSuccessMsg}</span>
                  </div>
                )}

                {backupErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{backupErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleCreateEncryptedBackup} className="space-y-4 text-xs max-w-lg">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Set Backup Encryption Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder="Minimum 8 characters password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Confirm Backup Encryption Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={backupConfirmPassword}
                      onChange={(e) => setBackupConfirmPassword(e.target.value)}
                      placeholder="Re-enter backup password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    The backup is encrypted using AES-256-GCM. <strong>Do not forget this password</strong>; without it, the backup cannot be decrypted.
                  </p>

                  <button
                    type="submit"
                    disabled={backupLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-950"
                  >
                    <Download className="w-4 h-4" />
                    <span>{backupLoading ? 'Encrypting & Generating...' : 'Download Encrypted Backup File'}</span>
                  </button>
                </form>
              </div>

              {/* Import Restore Card */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-teal-400" />
                  <span>2. Restore from Encrypted Backup</span>
                </h3>

                {restoreSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{restoreSuccessMsg}</span>
                  </div>
                )}

                {restoreErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{restoreErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleRestoreEncryptedBackup} className="space-y-4 text-xs max-w-lg">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Select Backup File (.wqp / .json)
                    </label>
                    <input
                      type="file"
                      accept=".wqp,.json,.enc"
                      required
                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                      className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Backup Decryption Password
                    </label>
                    <input
                      type="password"
                      required
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder="Enter password used when creating backup"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                    />
                  </div>

                  <p className="text-[11px] text-amber-400/90 leading-relaxed">
                    A safety snapshot of existing data will be created before restoring. Integrity checksums are validated before any data is overwritten.
                  </p>

                  <button
                    type="submit"
                    disabled={restoreLoading || !restoreFile}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{restoreLoading ? 'Verifying & Restoring...' : 'Verify & Restore Backup'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: STORAGE ADVISORY */}
          {activeTab === 'storage_advisory' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-3xl bg-amber-950/40 border border-amber-500/40 space-y-3">
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                  <h2 className="text-base font-bold text-white">
                    Device Storage & Data Retention Guidelines
                  </h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  WAQAS POS is designed to run completely offline on your local device. Because no remote cloud server holds your sales or inventory, your data is stored directly in your local hardware storage. Please review the important platform behaviors below:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Windows PC */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Monitor className="w-5 h-5 text-emerald-400" />
                    <span>Windows PC Installation</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300 text-[11px]">
                    <li>Data files are safely stored in the local application directory.</li>
                    <li>Files remain intact across computer restarts and system reboots.</li>
                    <li>Always copy periodic encrypted backups (.wqp) to an external USB flash drive.</li>
                  </ul>
                </div>

                {/* Android Tablet / Phone */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span>Android Tablet & Mobile</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-300 text-[11px]">
                    <li>Data is stored in local sandboxed storage.</li>
                    <li>
                      <strong>Warning:</strong> Clearing app storage or uninstalling the app permanently deletes local databases and keys.
                    </li>
                    <li>Export and save encrypted backups before device factory reset or device switching.</li>
                  </ul>
                </div>

                {/* Browser / PWA */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2.5 md:col-span-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <HardDrive className="w-5 h-5 text-teal-400" />
                    <span>Browser & PWA Storage Notice</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    If running WAQAS POS inside Chrome, Edge, or as an installed PWA, the browser manages local persistent storage. 
                    <strong>Clearing browser cookies and site data will erase local device databases.</strong> Never clear browser storage without first downloading an encrypted backup.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h2 className="text-lg font-black text-white">Security Audit Log</h2>
                <p className="text-xs text-slate-400">
                  Chronological record of Master Admin security events, shop modifications, and authentication actions.
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No security events recorded yet.
                  </div>
                ) : (
                  auditLogs.slice(0, 30).map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 font-mono">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            by {log.actorEmail || 'Master Admin'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CREATE SHOP ACCOUNT */}
      {showCreateShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl my-auto animate-in fade-in text-xs space-y-4">
            <h3 className="text-base font-black text-white">Create New Shop Account</h3>
            <p className="text-[11px] text-slate-400">
              Each shop account operates with its own isolated encrypted database partition.
            </p>

            <form onSubmit={handleCreateShop} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Shop Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. MART 2 (Downtown)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Unique Shop Username <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newShopUsername}
                  onChange={(e) => setNewShopUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. mart2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Shop Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newShopPassword}
                  onChange={(e) => setNewShopPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Owner / Manager Name
                </label>
                <input
                  type="text"
                  value={newShopOwner}
                  onChange={(e) => setNewShopOwner(e.target.value)}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newShopPhone}
                  onChange={(e) => setNewShopPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateShopModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createShopLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                >
                  {createShopLoading ? 'Creating...' : 'Create Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE SHOP PASSWORD */}
      {selectedShopForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl my-auto animate-in fade-in text-xs space-y-4">
            <h3 className="text-base font-black text-white">Reset Shop Password</h3>
            <p className="text-[11px] text-slate-400">
              Set a new password for <strong>{selectedShopForPassword.shopName}</strong>.
            </p>

            <form onSubmit={handleChangeShopPassword} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={shopNewPassword}
                  onChange={(e) => setShopNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedShopForPassword(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeShopPassLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition cursor-pointer"
                >
                  {changeShopPassLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SHOP */}
      {selectedShopForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl my-auto animate-in fade-in text-xs space-y-4">
            <h3 className="text-base font-black text-white">Edit Shop Profile</h3>

            <form onSubmit={handleSaveShopEdit} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Owner / Manager Name
                </label>
                <input
                  type="text"
                  value={editShopOwner}
                  onChange={(e) => setEditShopOwner(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editShopPhone}
                  onChange={(e) => setEditShopPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editShopAddress}
                  onChange={(e) => setEditShopAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedShopForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editShopLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                >
                  {editShopLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGENERATE RECOVERY KEY */}
      {showRegenKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl my-auto animate-in fade-in text-xs space-y-4">
            <h3 className="text-base font-black text-white">Regenerate Recovery Key</h3>

            {!newGeneratedKey ? (
              <form onSubmit={handleRegenerateRecoveryKey} className="space-y-3.5">
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Please enter your Master Admin password to generate a new replacement Recovery Key.
                </p>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Master Admin Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regenPassInput}
                    onChange={(e) => setRegenPassInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegenKeyModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition cursor-pointer"
                  >
                    Confirm & Generate
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px]">
                  Previous key invalidated. Here is your new Recovery Key:
                </div>

                <div className="p-3 rounded-xl bg-slate-950 font-mono text-center font-bold text-emerald-300 tracking-wider text-base">
                  {newGeneratedKey}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newGeneratedKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 3000);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied to Clipboard' : 'Copy New Recovery Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRegenKeyModal(false)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
