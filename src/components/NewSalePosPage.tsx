import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScanBarcode,
  Search,
  Plus,
  Trash2,
  Printer,
  Save,
  RotateCcw,
  Edit,
  FileText,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  BookOpen,
  ShoppingBag,
  ShoppingCart,
  Package,
  Layers,
  ChevronDown,
  Minimize2,
  Maximize2,
  ArrowRight,
  LogOut,
  Info,
  DollarSign,
  Barcode as BarcodeIcon,
  Home,
  Truck,
  Users,
  BarChart3,
  Settings,
  Calendar,
  Sparkles,
  Check,
} from 'lucide-react';
import { WaqasBrandingCard } from './WaqasBrandingCard';
import { WaqasDualProfileCards } from './WaqasDualProfileCards';
import {
  Product,
  CartItem,
  SaleTransaction,
  HeldBill,
  Customer,
  StoreBranding,
  UserProfile,
  DeviceInfo,
} from '../types/pos';
import { formatRs } from '../data/defaultProducts';
import { sounds } from '../utils/audio';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  validateSaleItems,
  round2,
} from '../utils/newPosCalculations';

interface NewSalePosPageProps {
  products: Product[];
  customers: Customer[];
  heldBills: HeldBill[];
  transactions: SaleTransaction[];
  branding: StoreBranding;
  currentUser: UserProfile;
  currentDevice: DeviceInfo;
  scannedBarcode?: string | null;
  onClearScannedBarcode?: () => void;
  onSaveInvoice: (invoiceData: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    taxAmount: number;
    grandTotal: number;
    paymentMethod: 'cash' | 'card' | 'credit';
    cashTendered?: number;
    changeDue?: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    invoiceNumber: string;
    note?: string;
  }) => void;
  onHoldBill: (billData: {
    items: CartItem[];
    subtotal: number;
    discount: number;
    grandTotal: number;
    customerName?: string;
    customerPhone?: string;
  }) => void;
  onResumeHeldBill: (bill: HeldBill) => void;
  onDeleteHeldBill: (billId: string) => void;
  onOpenHeldBillsModal: () => void;
  onOpenScanner: () => void;
  onOpenAddProduct: () => void;
  onQuickAddCustomer: (customer: Customer) => void;
  onNavigate: (page: string) => void;
  onViewReceipt: (tx: SaleTransaction) => void;
  onSwitchToOldSale?: () => void;
  resumedBill?: HeldBill | null;
  onClearResumedBill?: () => void;
}

export const NewSalePosPage: React.FC<NewSalePosPageProps> = ({
  products,
  customers,
  heldBills,
  transactions,
  branding,
  currentUser,
  currentDevice,
  scannedBarcode,
  onClearScannedBarcode,
  onSaveInvoice,
  onHoldBill,
  onResumeHeldBill,
  onDeleteHeldBill,
  onOpenHeldBillsModal,
  onOpenScanner,
  onOpenAddProduct,
  onQuickAddCustomer,
  onNavigate,
  onViewReceipt,
  onSwitchToOldSale,
  resumedBill,
  onClearResumedBill,
}) => {
  // Input refs and scanner control
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate sequential invoice number (e.g. 790+)
  const [invoiceNumber, setInvoiceNumber] = useState<string>(() => {
    return (790 + (transactions.length || 0)).toString();
  });

  // Current active date & time
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    const d = currentDateTime.getDate().toString().padStart(2, '0');
    const m = (currentDateTime.getMonth() + 1).toString().padStart(2, '0');
    const y = currentDateTime.getFullYear();
    return `${d}/${m}/${y}`;
  }, [currentDateTime]);

  const formattedTime = useMemo(() => {
    return currentDateTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [currentDateTime]);

  // Main Sales Table Items
  const [saleItems, setSaleItems] = useState<CartItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Top Item Entry Bar state
  const [topBarcode, setTopBarcode] = useState('');
  const [topItemName, setTopItemName] = useState('');
  const [topQty, setTopQty] = useState<number>(1);
  const [topPrice, setTopPrice] = useState<number>(0);
  const [topDiscountPercent, setTopDiscountPercent] = useState<number>(0);
  const [topTaxPercent, setTopTaxPercent] = useState<number>(0);

  // Autocomplete / Search dropdown for Item Name
  const [nameSuggestions, setNameSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Customer & Payment state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');

  // Bottom Totals & Overrides
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [invoiceDiscountOverride, setInvoiceDiscountOverride] = useState<number>(0);
  const [invoiceTaxOverride, setInvoiceTaxOverride] = useState<number>(0);

  // Check Item Details panel state (bottom right)
  const [detailsBarcode, setDetailsBarcode] = useState('');
  const [detailsItemName, setDetailsItemName] = useState('');
  const [detailsCategory, setDetailsCategory] = useState('Select Category');
  const [detailsQty, setDetailsQty] = useState<number>(1);
  const [detailsPrice, setDetailsPrice] = useState<number>(0);
  const [showMoreDetailsModal, setShowMoreDetailsModal] = useState(false);

  // Mobile Catalog Drawer State
  const [isMobileCatalogOpen, setIsMobileCatalogOpen] = useState(false);
  const [mobileCatalogSearch, setMobileCatalogSearch] = useState('');
  const [mobileCatalogCategory, setMobileCatalogCategory] = useState('All');

  // Modals
  const [isSearchInvoiceModalOpen, setIsSearchInvoiceModalOpen] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustBalance, setNewCustBalance] = useState<number>(0);
  const [showConfirmClearCart, setShowConfirmClearCart] = useState<boolean>(false);

  // Toast / Status notification
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusNotice({ message, type });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Auto-focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener (F2, F3, F4, F5, F8, F10, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        onOpenScanner();
      } else if (e.key === 'F3') {
        e.preventDefault();
        onOpenAddProduct();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (selectedItemIndex !== null && saleItems[selectedItemIndex]) {
          setShowMoreDetailsModal(true);
        } else {
          showToast('Please select an item row in the table first!', 'info');
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        const input = document.getElementById('new-pos-item-name-input');
        input?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBillAction();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleSaveInvoiceAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onNavigate('Home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saleItems, cashReceived, selectedCustomerId, paymentMethod, selectedItemIndex]);

  // Handle outside click for item search suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When topItemName changes, filter suggestions
  useEffect(() => {
    if (topItemName.trim().length > 1) {
      const q = topItemName.toLowerCase();
      const matches = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.urduName && p.urduName.includes(q)) ||
          p.barcode.includes(q)
      );
      setNameSuggestions(matches.slice(0, 8));
      setShowSuggestions(true);
    } else {
      setNameSuggestions([]);
      setShowSuggestions(false);
    }
  }, [topItemName, products]);

  // When an item row is selected, update the bottom-right "Item Details..." panel
  useEffect(() => {
    if (selectedItemIndex !== null && saleItems[selectedItemIndex]) {
      const item = saleItems[selectedItemIndex];
      setDetailsBarcode(item.product.barcode || item.product.sku || '');
      setDetailsItemName(item.product.name);
      setDetailsCategory(item.product.category || 'General');
      setDetailsQty(item.quantity);
      setDetailsPrice(item.unitPrice);
    }
  }, [selectedItemIndex, saleItems]);

  // Handle mobile camera scanner prop passed from App
  useEffect(() => {
    if (scannedBarcode && scannedBarcode.trim()) {
      handleBarcodeScanAdd(scannedBarcode.trim());
      onClearScannedBarcode?.();
    }
  }, [scannedBarcode]);

  // Handle resuming a held bill into New Sale Page
  useEffect(() => {
    if (resumedBill && Array.isArray(resumedBill.items) && resumedBill.items.length > 0) {
      setSaleItems([...resumedBill.items]);
      setInvoiceDiscountOverride(resumedBill.discount || 0);
      if (resumedBill.customerName) {
        const found = customers.find(
          (c) => c.name.toLowerCase() === resumedBill.customerName?.toLowerCase()
        );
        if (found) setSelectedCustomerId(found.id);
      }
      showToast(`Held Bill ${resumedBill.holdNumber} successfully restored in New Sale!`, 'success');
      onClearResumedBill?.();
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [resumedBill, customers]);

  // Current Selected Product's Real Purchase Price (display-only, 0.00 if none selected)
  const currentSelectedPurchasePrice = useMemo(() => {
    if (selectedItemIndex !== null && saleItems[selectedItemIndex]) {
      const it = saleItems[selectedItemIndex];
      const match = products.find((p) => p.id === it.product.id) || it.product;
      return match.costPrice || 0;
    }
    if (saleItems.length > 0) {
      const it = saleItems[saleItems.length - 1];
      const match = products.find((p) => p.id === it.product.id) || it.product;
      return match.costPrice || 0;
    }
    return 0;
  }, [selectedItemIndex, saleItems, products]);

  // Calculated top entry preview total
  const topTotal = useMemo(() => {
    const calc = calculateLineItem(topQty, topPrice, topDiscountPercent, topTaxPercent);
    return calc.netLineAmount;
  }, [topQty, topPrice, topDiscountPercent, topTaxPercent]);

  // Overall Invoice Calculations
  const calculations = useMemo(() => {
    return calculateInvoiceTotals(saleItems, invoiceDiscountOverride, invoiceTaxOverride, cashReceived);
  }, [saleItems, invoiceDiscountOverride, invoiceTaxOverride, cashReceived]);

  // Direct addition of product to cart without async state delays (Fixes Mobile Add Item)
  const handleAddProductDirectly = (product: Product, quantity = 1, priceOverride?: number) => {
    const now = Date.now();
    if (lastScanRef.current.code === product.id && now - lastScanRef.current.time < 250) {
      return;
    }
    lastScanRef.current = { code: product.id, time: now };

    if (product.stock <= 0) {
      sounds.playErrorTone();
      showToast(
        `Stock Alert: "${product.name}" stock is ${product.stock}. Sale recorded with negative stock. / منفی اسٹاک ریکارڈ ہوگا`,
        'info'
      );
    }

    const priceToUse = priceOverride !== undefined && priceOverride > 0 ? priceOverride : product.price;

    setSaleItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.product.id === product.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        const curr = updated[existingIndex];
        const newQty = round2(curr.quantity + quantity);
        const lineCalc = calculateLineItem(
          newQty,
          priceToUse,
          curr.discountPercent || 0,
          curr.taxPercent || 0
        );
        updated[existingIndex] = {
          ...curr,
          quantity: newQty,
          unitPrice: priceToUse,
          lineTotal: lineCalc.grossLineTotal,
          discountAmount: lineCalc.discountAmount,
          taxAmount: lineCalc.taxAmount,
          netAmount: lineCalc.netLineAmount,
        };
        setSelectedItemIndex(existingIndex);
        return updated;
      } else {
        const lineCalc = calculateLineItem(quantity, priceToUse, 0, 0);
        const newItem: CartItem = {
          id: `item-${Date.now()}-${product.id}`,
          product,
          quantity,
          unitPrice: priceToUse,
          discountPercent: 0,
          discountAmount: 0,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: lineCalc.grossLineTotal,
          netAmount: lineCalc.netLineAmount,
        };
        setSelectedItemIndex(prev.length);
        return [...prev, newItem];
      }
    });

    sounds.playBarcodeBeep();
    showToast(`Added: ${product.name} (${formatRs(priceToUse)})`, 'success');
  };

  // Automatic Barcode Addition (Hardware USB/Bluetooth scanner, Enter key, or Mobile camera)
  const handleBarcodeScanAdd = (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Prevent double-scan within 250ms for identical barcode from scanner bounce
    const now = Date.now();
    if (lastScanRef.current.code === cleanCode && now - lastScanRef.current.time < 250) {
      return;
    }
    lastScanRef.current = { code: cleanCode, time: now };

    const matchedProduct = products.find(
      (p) =>
        p.barcode?.toLowerCase() === cleanCode.toLowerCase() ||
        p.sku?.toLowerCase() === cleanCode.toLowerCase() ||
        p.id.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedProduct) {
      handleAddProductDirectly(matchedProduct, 1);
      setTopBarcode('');
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } else {
      sounds.playErrorTone();
      showToast(
        `Barcode not found: "${cleanCode}". Please add this product or search by item code/name. / بارکوڈ نہیں ملا، نیا پروڈکٹ شامل کریں`,
        'error'
      );
      setTopBarcode(cleanCode);
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    }
  };

  // Populate Top Entry with selected product
  const populateTopEntry = (product: Product) => {
    setTopBarcode(product.barcode);
    setTopItemName(product.name);
    setTopQty(1);
    setTopPrice(product.price);
    setTopDiscountPercent(0);
    setTopTaxPercent(0);
    setShowSuggestions(false);
  };

  // Add Item from Top Entry Bar to Sales Table
  const handleAddTopItemToTable = () => {
    if (!topItemName.trim() && !topBarcode.trim()) {
      showToast('Please enter barcode or search an item name first!', 'error');
      return;
    }

    const productMatch = products.find(
      (p) =>
        (topBarcode.trim() &&
          (p.barcode?.toLowerCase() === topBarcode.trim().toLowerCase() ||
            p.sku?.toLowerCase() === topBarcode.trim().toLowerCase())) ||
        (topItemName.trim() && p.name.toLowerCase() === topItemName.trim().toLowerCase())
    );

    if (!productMatch) {
      sounds.playErrorTone();
      showToast(
        'Barcode not found. Please add this product or search by item name. / بارکوڈ ڈیٹا بیس میں نہیں ملا',
        'error'
      );
      return;
    }

    if (topQty <= 0) {
      showToast('Quantity must be greater than zero! / مقدار 0 سے زیادہ ہونی چاہیے', 'error');
      return;
    }

    const priceToUse = topPrice > 0 ? topPrice : productMatch.price;

    setSaleItems((prev) => {
      const existingIndex = prev.findIndex((it) => it.product.id === productMatch.id);
      if (existingIndex !== -1) {
        const updated = [...prev];
        const curr = updated[existingIndex];
        const newQty = round2(curr.quantity + topQty);
        const lineCalc = calculateLineItem(
          newQty,
          priceToUse,
          topDiscountPercent,
          topTaxPercent
        );
        updated[existingIndex] = {
          ...curr,
          quantity: newQty,
          unitPrice: priceToUse,
          discountPercent: topDiscountPercent,
          discountAmount: lineCalc.discountAmount,
          taxPercent: topTaxPercent,
          taxAmount: lineCalc.taxAmount,
          lineTotal: lineCalc.grossLineTotal,
          netAmount: lineCalc.netLineAmount,
        };
        setSelectedItemIndex(existingIndex);
        return updated;
      } else {
        const lineCalc = calculateLineItem(
          topQty,
          priceToUse,
          topDiscountPercent,
          topTaxPercent
        );
        const newItem: CartItem = {
          id: `item-${Date.now()}-${productMatch.id}`,
          product: productMatch,
          quantity: topQty,
          unitPrice: priceToUse,
          discountPercent: topDiscountPercent,
          discountAmount: lineCalc.discountAmount,
          taxPercent: topTaxPercent,
          taxAmount: lineCalc.taxAmount,
          lineTotal: lineCalc.grossLineTotal,
          netAmount: lineCalc.netLineAmount,
        };
        setSelectedItemIndex(prev.length);
        return [...prev, newItem];
      }
    });

    sounds.playBarcodeBeep();
    setTopBarcode('');
    setTopItemName('');
    setTopQty(1);
    setTopPrice(0);
    setTopDiscountPercent(0);
    setTopTaxPercent(0);
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Direct editing of line item quantity in table
  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...saleItems];
    const item = updated[index];
    const calc = calculateLineItem(
      newQty,
      item.unitPrice,
      item.discountPercent || 0,
      item.taxPercent || 0
    );

    updated[index] = {
      ...item,
      quantity: newQty,
      lineTotal: calc.grossLineTotal,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      netAmount: calc.netLineAmount,
    };
    setSaleItems(updated);
  };

  // Direct editing of line item price in table
  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...saleItems];
    const item = updated[index];
    const calc = calculateLineItem(
      item.quantity,
      newPrice,
      item.discountPercent || 0,
      item.taxPercent || 0
    );

    updated[index] = {
      ...item,
      unitPrice: newPrice,
      lineTotal: calc.grossLineTotal,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      netAmount: calc.netLineAmount,
    };
    setSaleItems(updated);
  };

  // Direct editing of line item discount percent in table
  const handleUpdateItemDiscountPercent = (index: number, newDiscPercent: number) => {
    const validPercent = Math.min(100, Math.max(0, newDiscPercent || 0));
    const updated = [...saleItems];
    const item = updated[index];
    const calc = calculateLineItem(
      item.quantity,
      item.unitPrice,
      validPercent,
      item.taxPercent || 0
    );

    updated[index] = {
      ...item,
      discountPercent: validPercent,
      discountAmount: calc.discountAmount,
      taxAmount: calc.taxAmount,
      netAmount: calc.netLineAmount,
    };
    setSaleItems(updated);
  };

  // Delete selected item row
  const handleRemoveItem = (index: number) => {
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedItemIndex === index) {
      setSelectedItemIndex(null);
    } else if (selectedItemIndex !== null && selectedItemIndex > index) {
      setSelectedItemIndex(selectedItemIndex - 1);
    }
    sounds.playErrorTone();
  };

  // Delete all items (with in-UI modal confirmation)
  const handleDeleteAllItems = () => {
    if (saleItems.length === 0) {
      showToast('No items in invoice to delete.', 'info');
      return;
    }
    setShowConfirmClearCart(true);
  };

  const handleConfirmClearCart = () => {
    const count = saleItems.length;
    setSaleItems([]);
    setSelectedItemIndex(null);
    setCashReceived(0);
    setShowConfirmClearCart(false);
    sounds.playErrorTone();
    showToast(`All ${count} items cleared from sale invoice.`, 'info');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // New Sale Action (Reset and new invoice)
  const handleNewSale = () => {
    setSaleItems([]);
    setSelectedItemIndex(null);
    setCashReceived(0);
    setSelectedCustomerId('');
    setTopBarcode('');
    setTopItemName('');
    setTopQty(1);
    setTopPrice(0);
    setTopDiscountPercent(0);
    setTopTaxPercent(0);
    setInvoiceDiscountOverride(0);
    setInvoiceTaxOverride(0);
    setInvoiceNumber((790 + transactions.length + 1).toString());
    showToast('New Sale invoice initiated.', 'success');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Hold Bill Action (F8)
  const handleHoldBillAction = () => {
    if (saleItems.length === 0) {
      showToast('Cannot hold an empty cart!', 'error');
      return;
    }
    const customer = customers.find((c) => c.id === selectedCustomerId);
    onHoldBill({
      items: saleItems,
      subtotal: calculations.subtotal,
      discount: calculations.overallDiscount,
      grandTotal: calculations.grandTotal,
      customerName: customer?.name || undefined,
      customerPhone: customer?.phone || undefined,
    });
    setSaleItems([]);
    setSelectedItemIndex(null);
    setCashReceived(0);
    showToast('Sale held successfully! / بل محفوظ کر لیا گیا', 'success');
  };

  // Save Invoice Action (Save, deduct stock, update Khata, print receipt)
  const handleSaveInvoiceAction = () => {
    if (isSubmitting) return;

    const validation = validateSaleItems(saleItems);
    if (!validation.valid) {
      sounds.playErrorTone();
      showToast(validation.error || 'Invalid items in invoice', 'error');
      return;
    }

    // Customer validation for credit
    const selectedCust = customers.find((c) => c.id === selectedCustomerId);
    if (paymentMethod === 'credit' && !selectedCust) {
      sounds.playErrorTone();
      showToast('Please select a customer for Credit / Khata sale! (کھاتہ کے لیے کسٹمر منتخب کریں)', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      onSaveInvoice({
        items: saleItems,
        subtotal: calculations.subtotal,
        discount: calculations.overallDiscount,
        taxAmount: calculations.overallTax,
        grandTotal: calculations.grandTotal,
        paymentMethod,
        cashTendered: cashReceived > 0 ? cashReceived : calculations.grandTotal,
        changeDue: calculations.changeDue,
        customerId: selectedCust?.id,
        customerName: selectedCust?.name,
        customerPhone: selectedCust?.phone,
        invoiceNumber: `WM-${invoiceNumber}`,
      });

      sounds.playSuccessChime();
      showToast(`Invoice #${invoiceNumber} saved successfully! / انوائس محفوظ ہو گئی`, 'success');
      handleNewSale();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save New Customer
  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      previousBalance: newCustBalance || 0,
      createdAt: new Date().toISOString(),
    };
    onQuickAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setIsNewCustomerModalOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustBalance(0);
    showToast(`Customer "${newCust.name}" added and selected.`, 'success');
  };

  // Load existing invoice for editing or viewing
  const handleLoadInvoice = (tx: SaleTransaction) => {
    setInvoiceNumber(tx.invoiceNumber.replace('WM-', ''));
    const recomputedItems: CartItem[] = (tx.items || []).map((it) => {
      const calc = calculateLineItem(
        it.quantity,
        it.unitPrice,
        it.discountPercent || 0,
        it.taxPercent || 0
      );
      return {
        ...it,
        lineTotal: calc.grossLineTotal,
        discountAmount: calc.discountAmount,
        taxAmount: calc.taxAmount,
        netAmount: calc.netLineAmount,
      };
    });
    setSaleItems(recomputedItems);
    setPaymentMethod(tx.paymentMethod);
    setSelectedCustomerId(tx.customerId || '');
    setCashReceived(tx.cashTendered || tx.grandTotal);
    setIsSearchInvoiceModalOpen(false);
    showToast(`Loaded invoice ${tx.invoiceNumber} into editor.`, 'info');
  };

  return (
    <div className="flex-1 flex flex-row bg-[#eef4fb] text-slate-800 font-sans min-h-screen select-none">
      {/* Toast Notice */}
      {statusNotice && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
            statusNotice.type === 'success'
              ? 'bg-emerald-600 text-white'
              : statusNotice.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {statusNotice.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {statusNotice.type === 'error' && <AlertTriangle className="w-4 h-4" />}
          {statusNotice.type === 'info' && <Info className="w-4 h-4" />}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* LEFT NAVIGATION SIDEBAR (EXACT MATCH TO REFERENCE SCREENSHOT)  */}
      {/* ============================================================== */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-[#051b3d] text-white shrink-0 h-screen sticky top-0 overflow-y-auto z-20 border-r border-blue-950/60 shadow-xl">
        {/* Top Logo & App Branding */}
        <div className="p-4 flex items-center gap-3 border-b border-blue-900/40">
          <div className="w-10 h-10 rounded-xl bg-[#00a859] flex items-center justify-center shadow-lg border border-emerald-400/30 shrink-0">
            <ShoppingCart className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white leading-tight">
              Waqas <span className="text-emerald-400">Mart</span>
            </h1>
            <p className="text-[11px] font-bold text-cyan-300 tracking-wider">
              Sale App
            </p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-3 space-y-1.5 flex-1">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => onNavigate('Home')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Dashboard</span>
          </button>

          {/* 2. Sales (ACTIVE GREEN BUTTON AS IN REFERENCE SCREENSHOT) */}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#10b981] text-white shadow-md cursor-default"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span>Sales</span>
          </button>

          {/* 3. Purchase */}
          <button
            type="button"
            onClick={() => onNavigate('New Purchase Entry')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4 text-slate-400" />
            <span>Purchase</span>
          </button>

          {/* 4. Stock */}
          <button
            type="button"
            onClick={() => onNavigate('Total Stock')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Stock</span>
          </button>

          {/* 5. Khata */}
          <button
            type="button"
            onClick={() => onNavigate('Customer Ledgers')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>Khata</span>
          </button>

          {/* 6. Reports */}
          <button
            type="button"
            onClick={() => onNavigate('Sale Summary')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span>Reports</span>
          </button>

          {/* 7. Settings */}
          <button
            type="button"
            onClick={() => onNavigate('Settings')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
        </nav>
        {/* Sidebar Footer info */}
        <div className="p-2.5 border-t border-blue-900/40 text-[10px] text-blue-300/80 text-center font-bold">
          Waqas Mart • POS Counter 01
        </div>

        {/* MART OWNER & SOFTWARE OWNER PROFILE CARDS (STACKED VERTICALLY IN LEFT AREA) */}
        <div className="p-2 pt-0 pb-3 mt-auto shrink-0 space-y-2">
          <WaqasDualProfileCards variant="sidebar" />
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA                                              */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#edf3fa] min-h-screen overflow-x-hidden">
        {/* ============================================================== */}
        {/* 1. TOP HEADER (EXACT MATCH TO REFERENCE SCREENSHOT)           */}
        {/* ============================================================== */}
        <header className="bg-[#051b3d] text-white px-4 py-2.5 shadow-sm flex items-center justify-between border-b border-blue-900/60 shrink-0">
          {/* Left: Mobile Nav Button + New Sale Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight leading-none">
                New Sale
              </h2>
              <p className="text-[11px] font-semibold text-cyan-300/90 mt-0.5">
                Fast | Easy | Smart
              </p>
            </div>
          </div>

          {/* Right: Date, Time, User, and Window Controls */}
          <div className="flex items-center gap-2.5">
            {/* Date & Time Capsule (Rounded container with calendar and clock) */}
            <div className="hidden sm:flex items-center gap-3 bg-[#0a254e] border border-blue-800/40 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-200">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{formattedDate}</span>
              </div>
              <div className="w-px h-3.5 bg-blue-700/60"></div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{formattedTime}</span>
              </div>
            </div>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-2 bg-[#0a254e] border border-blue-800/40 rounded-xl px-3 py-1">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                <User className="w-4 h-4 text-slate-700" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-white leading-tight">Admin 102</p>
                <p className="text-[10px] text-slate-400 leading-tight">Administrator</p>
              </div>
            </div>

            {/* Desktop Window Controls simulation */}
            <div className="flex items-center gap-1 text-slate-400 pl-1 border-l border-blue-800/40">
              <button
                type="button"
                onClick={() => onNavigate('Home')}
                className="w-6 h-6 flex items-center justify-center hover:text-white rounded transition-colors cursor-pointer"
                title="Minimize / Exit to Home"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('Home')}
                className="w-6 h-6 flex items-center justify-center hover:text-white rounded transition-colors cursor-pointer"
                title="Maximize"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('Home')}
                className="w-6 h-6 flex items-center justify-center hover:text-red-400 rounded transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Top Branding & Quick Actions Bar (lg:hidden) */}
        <div className="lg:hidden px-3 pt-2 space-y-2">
          <WaqasBrandingCard variant="compact" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileCatalogOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#005bb5] to-[#0c66d6] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            >
              <Package className="w-4 h-4 text-yellow-300" />
              <span>Browse Catalog / اشیاء براؤز کریں ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={onOpenScanner}
              className="py-2.5 px-3.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Scan Barcode with Camera"
            >
              <ScanBarcode className="w-4 h-4" />
              <span>Camera Scan</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. TOP ITEM ENTRY BAR (MATCHING REFERENCE ROW 1)              */}
        {/* ============================================================== */}
        <section className="p-3 pb-1">
          <div className="bg-[#eef6fc] border border-[#bcd7f3] rounded-2xl p-2.5 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-2.5">
            {/* Field 1: Barcode Input with Scan Button */}
            <div className="flex-1 min-w-[200px] flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                <ScanBarcode className="w-3.5 h-3.5 text-blue-600" />
                <span>Barcode</span>
              </label>
              <div className="flex items-center rounded-xl bg-white border border-blue-300/80 overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-blue-500">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={topBarcode}
                  onChange={(e) => setTopBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (topBarcode.trim()) {
                        handleBarcodeScanAdd(topBarcode);
                      }
                    }
                  }}
                  placeholder="Scan or Enter Barcode..."
                  className="flex-1 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-mono font-semibold"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (topBarcode.trim()) {
                      handleBarcodeScanAdd(topBarcode);
                    } else {
                      onOpenScanner();
                    }
                  }}
                  className="px-2.5 py-1.5 bg-[#0c66d6] hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Search barcode or open scanner"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Field 2: Item Name Search Field with Autocomplete */}
            <div className="flex-[2] min-w-[240px] flex flex-col gap-1 relative" ref={searchContainerRef}>
              <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Item Name</span>
              </label>
              <div className="rounded-xl bg-white border border-blue-300/80 overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 flex items-center">
                <input
                  id="new-pos-item-name-input"
                  type="text"
                  value={topItemName}
                  onChange={(e) => setTopItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nameSuggestions.length > 0) {
                      populateTopEntry(nameSuggestions[0]);
                    } else if (e.key === 'Enter' && topPrice > 0) {
                      handleAddTopItemToTable();
                    }
                  }}
                  placeholder="Search Item Name..."
                  className="w-full px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <div className="pr-2.5 text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {nameSuggestions.length > 0 ? (
                    nameSuggestions.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          populateTopEntry(prod);
                          handleAddProductDirectly(prod, topQty > 0 ? topQty : 1);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{prod.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Barcode: {prod.barcode} • SKU: {prod.sku || 'N/A'} • Stock: {prod.stock} {prod.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600 block">
                            {formatRs(prod.price)}
                          </span>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            + Add to Sale
                          </span>
                        </div>
                      </button>
                    ))
                  ) : topItemName.trim().length > 1 ? (
                    <div className="p-3 text-center text-slate-500 text-xs">
                      <p className="font-bold text-slate-700">No matching product found</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">نام یا بارکوڈ دوبارہ چیک کریں</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          onOpenAddProduct();
                        }}
                        className="mt-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px]"
                      >
                        + Add New Product
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Field 3: Quantity Input */}
            <div className="w-20 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900">Qty</label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={topQty}
                onChange={(e) => setTopQty(Math.max(0.1, parseFloat(e.target.value) || 0))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTopItemToTable();
                }}
                className="w-full px-2 py-1.5 text-center text-xs font-bold bg-white border border-blue-300/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Field 4: Price Input */}
            <div className="w-24 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900">Price</label>
              <input
                type="number"
                step="any"
                min="0"
                value={topPrice || ''}
                onChange={(e) => setTopPrice(parseFloat(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTopItemToTable();
                }}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-right text-xs font-bold bg-white border border-blue-300/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Field 5: Calculated Total Display (Light mint green badge) */}
            <div className="w-28 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900">Total</label>
              <div className="w-full py-1.5 px-2 bg-[#d7f9e8] text-emerald-950 font-black text-xs text-right rounded-xl border border-emerald-300 shadow-2xs">
                {topTotal.toFixed(2)}
              </div>
            </div>

            {/* Field 6: Discount % */}
            <div className="w-20 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900">Discount</label>
              <div className="flex items-center bg-white border border-blue-300/80 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={topDiscountPercent}
                  onChange={(e) => setTopDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full px-1.5 py-1.5 text-center text-xs font-bold focus:outline-none"
                />
                <span className="pr-1.5 text-[10px] font-bold text-slate-400">%</span>
              </div>
            </div>

            {/* Field 7: Tax % */}
            <div className="w-20 flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900">Tax</label>
              <div className="flex items-center bg-white border border-blue-300/80 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={topTaxPercent}
                  onChange={(e) => setTopTaxPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full px-1.5 py-1.5 text-center text-xs font-bold focus:outline-none"
                />
                <span className="pr-1.5 text-[10px] font-bold text-slate-400">%</span>
              </div>
            </div>

            {/* Clear Action (Red Button Matching Reference Screenshot) */}
            <div className="flex items-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setTopBarcode('');
                  setTopItemName('');
                  setTopQty(1);
                  setTopPrice(0);
                  setTopDiscountPercent(0);
                  setTopTaxPercent(0);
                  barcodeInputRef.current?.focus();
                }}
                className="px-3.5 py-1.5 bg-[#dc2626] hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Clear entry fields"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. HOLD BILL, CUSTOMER & PAYMENT METHOD BAR (ROW 2 - EXACT!)  */}
        {/* ============================================================== */}
        <section className="px-3 py-1.5">
          <div className="bg-white rounded-2xl border border-[#cbdff2] p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Left: Hold Bill (F8) and Held Bills (X) Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleHoldBillAction}
                className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                title="Hold Current Bill (F8)"
              >
                <Clock className="w-4 h-4 text-cyan-200" />
                <span>Hold Bill (F8)</span>
              </button>

              <button
                type="button"
                onClick={onOpenHeldBillsModal}
                className="px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
                title="View Held Bills"
              >
                <FileText className="w-4 h-4 text-cyan-200" />
                <span>Held Bills ({heldBills.length})</span>
              </button>
            </div>

            {/* Middle: Customer Selection with + New Button */}
            <div className="flex-1 min-w-[280px] max-w-xl flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold shrink-0">
                <User className="w-4 h-4 text-blue-600" />
                <span>Customer</span>
              </div>
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - Bal: Rs. {c.previousBalance || 0}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
                title="Add New Customer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Right: Payment Method Radio Options */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-bold text-blue-900">Payment Method</span>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newPosPaymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span>Cash</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newPosPaymentMethod"
                    value="credit"
                    checked={paymentMethod === 'credit'}
                    onChange={() => setPaymentMethod('credit')}
                    className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 accent-purple-600"
                  />
                  <span>Credit</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newPosPaymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <span>Card</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. MAIN WORKSTATION: SPREADSHEET TABLE & RIGHT ACTION BUTTONS */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col lg:flex-row p-3 pt-1 gap-3 overflow-hidden">
          {/* Left: Main Sales Table (Excel / POS Grid Style) */}
          <div className="flex-1 bg-white rounded-2xl border border-[#c2daf2] shadow-xs flex flex-col overflow-hidden">
            {/* Table Header Bar (Deep Royal Blue matching reference screenshot) */}
            <div className="bg-[#005bb5] text-white flex items-center text-xs font-black uppercase tracking-wider py-2.5 select-none shadow-xs">
              <div className="w-12 text-center">No</div>
              <div className="flex-1 px-3 text-left">Item Name</div>
              <div className="w-24 text-center">Qty</div>
              <div className="w-24 text-right px-2">Price</div>
              <div className="w-24 text-right px-2">Total</div>
              <div className="w-20 text-center">Disc %</div>
              <div className="w-24 text-right px-2">D.Amount</div>
              <div className="w-28 text-right px-3">Net Amount</div>
              <div className="w-10 text-center"></div>
            </div>

            {/* Table Rows Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#e1ecf8] bg-white min-h-[320px]">
              {saleItems.length === 0 ? (
                /* Empty grid placeholder matching the reference screenshot grid */
                <div className="divide-y divide-[#edf3fa]">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center text-xs py-3 border-r border-[#e8f1fb] bg-white opacity-40 select-none"
                    >
                      <div className="w-12 text-center font-bold text-slate-300">{i + 1}</div>
                      <div className="flex-1 px-3 text-slate-200">—</div>
                      <div className="w-24 text-center text-slate-200">—</div>
                      <div className="w-24 text-right px-2 text-slate-200">—</div>
                      <div className="w-24 text-right px-2 text-slate-200">—</div>
                      <div className="w-20 text-center text-slate-200">—</div>
                      <div className="w-24 text-right px-2 text-slate-200">—</div>
                      <div className="w-28 text-right px-3 text-slate-200">—</div>
                      <div className="w-10"></div>
                    </div>
                  ))}
                </div>
              ) : (
                saleItems.map((item, index) => {
                  const isSelected = selectedItemIndex === index;
                  const lineCalc = calculateLineItem(
                    item.quantity,
                    item.unitPrice,
                    item.discountPercent || 0,
                    item.taxPercent || 0
                  );
                  const lineTotal = lineCalc.grossLineTotal;
                  const discAmt = lineCalc.discountAmount;
                  const netAmt = lineCalc.netLineAmount;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemIndex(index)}
                      className={`flex items-center text-xs py-2 transition-colors cursor-pointer border-r border-[#e8f1fb] ${
                        isSelected
                          ? 'bg-[#e0effe] border-l-4 border-l-[#005bb5] text-blue-950 font-semibold'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-[#f6faff]'
                          : 'bg-[#fafcff] hover:bg-[#f6faff]'
                      }`}
                    >
                      {/* 1. No */}
                      <div className="w-12 text-center font-bold text-slate-500">
                        {index + 1}
                      </div>

                      {/* 2. Item Name & Thumbnail */}
                      <div className="flex-1 px-3 text-left flex items-center gap-2 min-w-0">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
                          />
                        ) : null}
                        <div className="min-w-0 truncate">
                          <p className="font-bold text-slate-800 line-clamp-1">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.product.barcode || item.product.sku}
                          </p>
                        </div>
                      </div>

                      {/* 3. Qty (Editable directly in table) */}
                      <div className="w-24 text-center px-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemQuantity(index, parseFloat(e.target.value) || 0.1)
                            }
                            className="w-10 text-center font-black text-slate-800 focus:outline-none text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 4. Price (Editable directly in table without discount) */}
                      <div className="w-24 text-right px-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItemPrice(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-right font-bold text-slate-800 px-1 py-0.5 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* 5. Total (Qty * Price) */}
                      <div className="w-24 text-right px-2 font-bold text-slate-700">
                        {lineTotal.toFixed(2)}
                      </div>

                      {/* 6. Disc % */}
                      <div className="w-20 text-center px-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || 0}
                          onChange={(e) =>
                            handleUpdateItemDiscountPercent(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-center font-semibold text-slate-700 px-1 py-0.5 bg-white border border-slate-200 rounded focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>

                      {/* 7. D.Amount */}
                      <div className="w-24 text-right px-2 text-slate-600 font-medium">
                        {discAmt.toFixed(2)}
                      </div>

                      {/* 8. Net Amount */}
                      <div className="w-28 text-right px-3 font-black text-emerald-700">
                        {netAmt.toFixed(2)}
                      </div>

                      {/* Row delete button */}
                      <div className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Action Buttons (Stacked Vertically in Vibrant Rounded Cards matching Reference) */}
          <div className="w-full lg:w-48 flex flex-row lg:flex-col gap-2 shrink-0">
            {/* F2 Barcode */}
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-[#1762da] to-[#0f4eb7] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ScanBarcode className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">F2</span>
                  <span>Barcode</span>
                </div>
                <p className="text-[10px] text-blue-200">Scan Item</p>
              </div>
            </button>

            {/* F3 New Item */}
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">F3</span>
                  <span>New Item</span>
                </div>
                <p className="text-[10px] text-emerald-200">Add New Product</p>
              </div>
            </button>

            {/* F4 Edit Item */}
            <button
              type="button"
              onClick={() => {
                if (selectedItemIndex !== null && saleItems[selectedItemIndex]) {
                  setShowMoreDetailsModal(true);
                } else {
                  showToast('Please select an item row in the table first!', 'info');
                }
              }}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">F4</span>
                  <span>Edit Item</span>
                </div>
                <p className="text-[10px] text-orange-200">Edit Product</p>
              </div>
            </button>

            {/* F5 Search */}
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('new-pos-item-name-input');
                input?.focus();
              }}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-[#9333ea] to-[#7e22ce] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">F5</span>
                  <span>Search</span>
                </div>
                <p className="text-[10px] text-purple-200">Find Item</p>
              </div>
            </button>

            {/* Del All */}
            <button
              type="button"
              onClick={handleDeleteAllItems}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Del</span>
                  <span>Del All</span>
                </div>
                <p className="text-[10px] text-red-200">Delete All Items</p>
              </div>
            </button>

            {/* Esc Exit */}
            <button
              type="button"
              onClick={() => onNavigate('Home')}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Esc</span>
                  <span>Exit</span>
                </div>
                <p className="text-[10px] text-cyan-200">Close Sale</p>
              </div>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. BOTTOM PANELS: 10 ACTION BUTTONS, TOTALS, ITEM DETAILS     */}
        {/* ============================================================== */}
        <div className="p-3 bg-[#e4effa] border-t border-[#cbdff2] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-stretch">
          {/* 10 Bottom Action Buttons (Expanded full width & size without compression) */}
          <div className="xl:col-span-6 lg:col-span-12 md:col-span-2 grid grid-cols-5 gap-2 sm:gap-2.5">
            {/* Row 1 */}
            {/* 1. New Sale */}
            <button
              type="button"
              onClick={handleNewSale}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#c026d3] hover:bg-[#a21caf] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <FileText className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">New Sale</span>
              <span className="text-[10px] text-purple-200 leading-none">New Sale</span>
            </button>

            {/* 2. Save Invoice */}
            <button
              type="button"
              onClick={handleSaveInvoiceAction}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#16a34a] hover:bg-[#15803d] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Save className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">Save</span>
              <span className="text-[10px] text-emerald-200 leading-none">Save Invoice</span>
            </button>

            {/* 3. Edit Invoice */}
            <button
              type="button"
              onClick={() => setIsSearchInvoiceModalOpen(true)}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Edit className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">Edit Inv</span>
              <span className="text-[10px] text-blue-200 leading-none">Edit Invoice</span>
            </button>

            {/* 4. Search Invoice */}
            <button
              type="button"
              onClick={() => setIsSearchInvoiceModalOpen(true)}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#0891b2] hover:bg-[#0e7490] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Search className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">Search Inv</span>
              <span className="text-[10px] text-cyan-200 leading-none">Search Invoice</span>
            </button>

            {/* 5. New Item */}
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Plus className="w-6 h-6 text-slate-900 stroke-[3]" />
              <span className="text-xs sm:text-sm font-black leading-tight">New Item</span>
              <span className="text-[10px] text-amber-950 font-black leading-none">Add Item</span>
            </button>

            {/* Row 2 */}
            {/* 6. Del All */}
            <button
              type="button"
              onClick={handleDeleteAllItems}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#334155] hover:bg-[#1e293b] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Trash2 className="w-6 h-6 text-slate-300" />
              <span className="text-xs sm:text-sm font-black leading-tight">Del All</span>
              <span className="text-[10px] text-slate-400 leading-none">Delete All</span>
            </button>

            {/* 7. Del One */}
            <button
              type="button"
              onClick={() => {
                if (selectedItemIndex !== null) {
                  handleRemoveItem(selectedItemIndex);
                } else if (saleItems.length > 0) {
                  handleRemoveItem(saleItems.length - 1);
                } else {
                  showToast('No items to delete', 'info');
                }
              }}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#f97316] hover:bg-[#ea580c] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Trash2 className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">Del One</span>
              <span className="text-[10px] text-orange-200 leading-none">Delete One</span>
            </button>

            {/* 8. F10-Print */}
            <button
              type="button"
              onClick={handleSaveInvoiceAction}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#e11d48] hover:bg-[#be123c] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Printer className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">F10-Print</span>
              <span className="text-[10px] text-rose-200 leading-none">Print Invoice</span>
            </button>

            {/* 9. Search */}
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('new-pos-item-name-input');
                input?.focus();
              }}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#7e22ce] hover:bg-[#6b21a8] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <Search className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">Quick Search</span>
              <span className="text-[10px] text-purple-200 leading-none">Quick Search</span>
            </button>

            {/* 10. Exit System */}
            <button
              type="button"
              onClick={() => onNavigate('Home')}
              className="p-3 sm:p-3.5 rounded-2xl bg-[#15803d] hover:bg-[#166534] text-white shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
            >
              <LogOut className="w-6 h-6 text-white" />
              <span className="text-xs sm:text-sm font-black leading-tight">Exit</span>
              <span className="text-[10px] text-emerald-200 leading-none">Exit System</span>
            </button>
          </div>

          {/* Middle: Bottom Totals Panel (Discount, VAT, Giant Royal Blue Box, Cash Received) */}
          <div className="xl:col-span-3 lg:col-span-6 md:col-span-1 bg-white p-3 rounded-2xl border border-[#cbdff2] shadow-xs flex flex-col justify-between gap-2">
            {/* Discount Row */}
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Discount:</span>
              <input
                type="number"
                min="0"
                value={invoiceDiscountOverride || ''}
                onChange={(e) => setInvoiceDiscountOverride(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-24 text-right font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none"
              />
            </div>

            {/* VAT (Tax) Row */}
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">VAT(Tax):</span>
              <input
                type="number"
                min="0"
                value={invoiceTaxOverride || ''}
                onChange={(e) => setInvoiceTaxOverride(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-24 text-right font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none"
              />
            </div>

            {/* Giant Royal Blue Box: Total Amount with Large Yellow Number (Exact Reference!) */}
            <div className="bg-[#0b5cd5] text-white p-3 rounded-xl shadow-md text-center flex flex-col items-center justify-center">
              <span className="text-xs uppercase font-extrabold tracking-wider text-blue-200">
                Total Amount
              </span>
              <span className="text-4xl font-black text-yellow-300 tracking-tight my-0.5">
                {calculations.grandTotal.toFixed(2)}
              </span>
              <span className="text-[10px] text-blue-200">Total Items: {calculations.totalQty}</span>
            </div>

            {/* Cash Received and Remaining Balance */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Cash Received:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 text-right font-black text-slate-900 bg-white border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCashReceived(calculations.grandTotal)}
                    className="px-1.5 py-1 text-[10px] font-bold bg-blue-100 text-blue-800 rounded hover:bg-blue-200 cursor-pointer"
                    title="Exact Amount"
                  >
                    Exact
                  </button>
                </div>
              </div>

              {/* Tiny Purchase Price Field (Subtle, unobtrusive, display-only) */}
              <div className="flex items-center justify-between px-1.5 py-0.5 text-[11px] text-slate-500">
                <span className="font-medium text-slate-400">Purchase Price:</span>
                <span className="font-mono text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/80 text-[11px]">
                  Rs. {currentSelectedPurchasePrice.toFixed(2)}
                </span>
              </div>

              {/* Change Due and Remaining Balance */}
              <div className="flex items-center justify-between px-2 text-xs font-bold">
                {calculations.changeDue > 0 ? (
                  <>
                    <span className="text-emerald-800 font-bold">Change Due (واپسی):</span>
                    <span className="font-black text-sm text-emerald-700">
                      Rs. {calculations.changeDue.toFixed(2)}
                    </span>
                  </>
                ) : calculations.remainingBalance > 0 ? (
                  <>
                    <span className="text-red-700 font-bold">Balance Due (باقی ادھار):</span>
                    <span className="font-black text-sm text-red-600">
                      Rs. {calculations.remainingBalance.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-600 font-bold">Remaining Balance:</span>
                    <span className="font-black text-sm text-slate-700">
                      Rs. 0.00
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: "Item Details..." Panel (Exact Reference Layout) */}
          <div className="xl:col-span-3 lg:col-span-6 md:col-span-1 bg-white p-3 rounded-2xl border border-[#cbdff2] shadow-xs flex flex-col justify-between gap-2">
            <div className="text-xs font-black text-blue-950 border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <span>Item Details...</span>
              {selectedItemIndex !== null && saleItems[selectedItemIndex] && (
                <span className="text-[10px] font-bold text-emerald-600">
                  Item #{selectedItemIndex + 1} Selected
                </span>
              )}
            </div>

            {/* Field 1: Barcode */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 font-bold text-slate-600">Barcode:</span>
              <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <input
                  type="text"
                  value={detailsBarcode}
                  onChange={(e) => setDetailsBarcode(e.target.value)}
                  placeholder="Barcode"
                  className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Field 2: Item Name */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 font-bold text-slate-600">Item Name:</span>
              <input
                type="text"
                value={detailsItemName}
                onChange={(e) => setDetailsItemName(e.target.value)}
                placeholder="Item Name"
                className="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>

            {/* Field 3: Category */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 font-bold text-slate-600">Category:</span>
              <select
                value={detailsCategory}
                onChange={(e) => setDetailsCategory(e.target.value)}
                className="flex-1 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="Select Category">Select Category</option>
                <option value="General">General / کریانہ</option>
                <option value="Groceries">Groceries / راشن</option>
                <option value="Beverages">Beverages / مشروبات</option>
                <option value="Snacks">Snacks / نمکو</option>
                <option value="Dairy">Dairy / ڈیری</option>
                <option value="Bread">Bread & Bakery</option>
                <option value="Fresh Fruits">Fresh Fruits</option>
                <option value="Household">Household</option>
              </select>
            </div>

            {/* Field 4: Quantity & Sales Price */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">Quantity:</span>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={detailsQty}
                  onChange={(e) => {
                    const q = parseFloat(e.target.value) || 1;
                    setDetailsQty(q);
                    if (selectedItemIndex !== null) {
                      handleUpdateItemQuantity(selectedItemIndex, q);
                    }
                  }}
                  className="w-full text-center font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600 shrink-0">Sale Price:</span>
                <input
                  type="number"
                  step="any"
                  value={detailsPrice || ''}
                  onChange={(e) => {
                    const p = parseFloat(e.target.value) || 0;
                    setDetailsPrice(p);
                    if (selectedItemIndex !== null) {
                      handleUpdateItemPrice(selectedItemIndex, p);
                    }
                  }}
                  placeholder="0.00"
                  className="w-full text-right font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Field 5: Barcode in Yellow Background + More... Button */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="w-16 font-bold text-slate-600 text-xs">Barcode:</span>
              <div className="flex-1 flex items-center bg-[#fef08a] border border-amber-300 rounded-lg px-2 py-1 shadow-2xs">
                <span className="w-full font-mono font-black text-slate-900 text-xs truncate">
                  {detailsBarcode ? `*${detailsBarcode}*` : '*20101*'}
                </span>
                <BarcodeIcon className="w-5 h-5 text-slate-700 shrink-0" />
              </div>
              <button
                type="button"
                onClick={() => setShowMoreDetailsModal(true)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 cursor-pointer shrink-0 transition-colors"
              >
                More...
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 6. FIXED FOOTER (MATCHING REFERENCE EXACT FOOTER)             */}
        {/* ============================================================== */}
        <footer className="relative bg-[#051b3d] text-white py-2 px-4 border-t border-blue-900/40 flex items-center justify-center text-xs font-bold tracking-wide shrink-0">
          <div className="flex items-center gap-3 text-slate-300">
            <span>Better Shop</span>
            <span className="text-emerald-400">|</span>
            <span>Better Business</span>
            <span className="text-emerald-400">|</span>
            <span className="text-white font-black">Waqas Mart</span>
          </div>
        </footer>
      </div>

      {/* ============================================================== */}
      {/* MODAL: SEARCH INVOICE / LOAD INVOICE                          */}
      {/* ============================================================== */}
      {isSearchInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <Search className="w-5 h-5 text-blue-600" />
                <span>Search Saved Invoices</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSearchInvoiceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4">
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Search by invoice # (e.g. 790), customer name, or phone..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No saved invoices found</p>
              ) : (
                transactions
                  .filter((t) => {
                    const q = invoiceSearchQuery.toLowerCase();
                    return (
                      t.invoiceNumber.toLowerCase().includes(q) ||
                      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
                      (t.customerPhone && t.customerPhone.includes(q))
                    );
                  })
                  .slice(0, 15)
                  .map((tx) => (
                    <div
                      key={tx.invoiceNumber}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg"
                    >
                      <div>
                        <p className="text-xs font-bold text-blue-950">{tx.invoiceNumber}</p>
                        <p className="text-[11px] text-slate-500">
                          {tx.dateTime} • {tx.customerName || 'Walk-in'} • {tx.items.length} items
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-600">
                          {formatRs(tx.grandTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLoadInvoice(tx)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: QUICK ADD NEW CUSTOMER                                 */}
      {/* ============================================================== */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <User className="w-5 h-5 text-emerald-600" />
                <span>Add New Customer / نیا کسٹمر</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Javed Ali Traders"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Address / City</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Shop # 12, Main Market"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Previous Balance / سابقہ ادھار (Rs.)</label>
                <input
                  type="number"
                  value={newCustBalance || ''}
                  onChange={(e) => setNewCustBalance(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MORE ITEM DETAILS & QUICK EDIT (F4)                     */}
      {/* ============================================================== */}
      {showMoreDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-base">
                <Edit className="w-5 h-5 text-blue-600" />
                <span>Product Item Details & Price Override</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreDetailsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <label className="font-bold text-slate-600">Product Name:</label>
                <input
                  type="text"
                  value={detailsItemName}
                  onChange={(e) => setDetailsItemName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600">Barcode:</label>
                  <input
                    type="text"
                    value={detailsBarcode}
                    onChange={(e) => setDetailsBarcode(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600">Category:</label>
                  <input
                    type="text"
                    value={detailsCategory}
                    onChange={(e) => setDetailsCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600">Current Sale Quantity:</label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={detailsQty}
                    onChange={(e) => setDetailsQty(parseFloat(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600">Actual Sale Price (Rs.):</label>
                  <input
                    type="number"
                    step="any"
                    value={detailsPrice}
                    onChange={(e) => setDetailsPrice(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-xl font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px]">
                <p className="font-bold">Note:</p>
                <p>
                  Editing the price here applies strictly to the current invoice line. It will not alter
                  the master product database price, nor will it be converted to a discount.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoreDetailsModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedItemIndex !== null && saleItems[selectedItemIndex]) {
                      handleUpdateItemPrice(selectedItemIndex, detailsPrice);
                      handleUpdateItemQuantity(selectedItemIndex, detailsQty);
                      showToast('Line item updated successfully.', 'success');
                    }
                    setShowMoreDetailsModal(false);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MOBILE PRODUCT CATALOG DRAWER / MODAL                         */}
      {/* ============================================================== */}
      {isMobileCatalogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in">
          <div className="bg-white rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border-t-2 border-blue-500">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#051b3d] to-[#0a2f6c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Browse Product Catalog</h3>
                  <p className="text-[10px] text-cyan-200">
                    {products.length} Active Items • Touch to add to bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCatalogOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Category Filter */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={mobileCatalogSearch}
                  onChange={(e) => setMobileCatalogSearch(e.target.value)}
                  placeholder="Search Name, Barcode, SKU, Urdu..."
                  className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {mobileCatalogSearch && (
                  <button
                    type="button"
                    onClick={() => setMobileCatalogSearch('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {['All', ...Array.from(new Set(products.map((p) => p.category || 'General')))].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMobileCatalogCategory(cat)}
                    className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer text-[11px] ${
                      mobileCatalogCategory === cat
                        ? 'bg-[#005bb5] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-2 max-h-[55vh]">
              {(() => {
                const q = mobileCatalogSearch.toLowerCase().trim();
                const matched = products.filter((p) => {
                  const matchesCat =
                    mobileCatalogCategory === 'All' ||
                    (p.category || 'General') === mobileCatalogCategory;
                  if (!matchesCat) return false;
                  if (!q) return true;
                  const name = (p.name || '').toLowerCase();
                  const barcode = (p.barcode || '').toLowerCase();
                  const sku = (p.sku || '').toLowerCase();
                  const urdu = (p.urduName || '').toLowerCase();
                  return (
                    name.includes(q) ||
                    barcode.includes(q) ||
                    sku.includes(q) ||
                    urdu.includes(q)
                  );
                });

                if (matched.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Package className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="font-black text-slate-700 text-sm">
                        No matching product found
                      </p>
                      <p className="text-xs text-slate-500">
                        کوئی پروڈکٹ نہیں ملی — نام یا بارکوڈ دوبارہ چیک کریں
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileCatalogOpen(false);
                          onOpenAddProduct();
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product to Database</span>
                      </button>
                    </div>
                  );
                }

                return matched.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddProductDirectly(prod, 1)}
                    className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-400 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {prod.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 mt-0.5 font-mono">
                          <span>BC: {prod.barcode}</span>
                          <span>•</span>
                          {prod.stock < 0 ? (
                            <span className="text-red-700 font-black bg-red-100 px-1.5 py-0.2 rounded border border-red-300">
                              Neg Stock: {prod.stock}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-bold">
                              Stock: {prod.stock} {prod.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-black text-emerald-600 mt-0.5">
                          {formatRs(prod.price)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddProductDirectly(prod, 1)}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs rounded-xl shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Cart Total: Rs. {calculations.grandTotal.toFixed(2)} ({calculations.totalQty} items)
              </span>
              <button
                type="button"
                onClick={() => setIsMobileCatalogOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow cursor-pointer active:scale-95"
              >
                Done / بل دیکھیں
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-UI Confirm Clear Cart Modal */}
      {showConfirmClearCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black text-slate-900 text-center">
              Delete All Items? / تمام اشیاء ختم کریں؟
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1">
              Are you sure you want to delete all <span className="font-bold text-red-600">{saleItems.length}</span> items from this sale invoice?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearCart(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 cursor-pointer"
              >
                Cancel / منسوخ
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCart}
                className="py-2.5 px-4 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow cursor-pointer"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
