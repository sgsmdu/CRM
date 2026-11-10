import React, { useState, useMemo } from 'react';
import {
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  X, 
  Tag, 
  Filter,
  Edit3,
  Receipt,
  ExternalLink,
  Calendar,
  Building2,
  Trash2,
  Eye,
  FileText,
  Check,
  Layers,
  Image as ImageIcon,
  Download,
  Upload
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { InventoryItem, DeviceCategory, VendorBill } from '../types';
import { inventoryToCsv, parseInventoryCsv } from '../utils/csv';
import { todayLocal } from '../utils/accounting';
import { encodeAmountToCode } from '../utils/priceCode';

export const InventoryManager: React.FC = () => {
  const { 
    inventory, 
    stockTransactions, 
    jobCards, 
    vendorBills,
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem,
    linkInventoryToVendorBill,
    recordStockMovement, 
    activePriceCodeMapping,
    theme,
    canDelete
  } = useSgs();
  const isDark = theme === 'dark';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockViewTab, setStockViewTab] = useState<'catalog' | 'logs'>('catalog');

  // Category Detail Modal / Panel state
  // When Total Stock, Vendor, or Payment button is clicked for a category, show that detail filtered below
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    category: DeviceCategory;
    detailType: 'stock' | 'vendor' | 'payment';
  } | null>(null);

  // Modals
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // Edit Stock Item & Vendor Bill Traceability Modal
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState<'details' | 'vendor_origin' | 'ledger'>('details');
  const [editSaveSuccess, setEditSaveSuccess] = useState(false);
  const [selectedBillToLink, setSelectedBillToLink] = useState('');
  const [selectedBillForPreview, setSelectedBillForPreview] = useState<VendorBill | null>(null);

  // Edit Form Fields
  const [editForm, setEditForm] = useState<{
    name: string;
    category: DeviceCategory;
    currentStock: number;
    minStockAlert: number;
    unitCost: number;
    unitPrice: number;
    sku: string;
    location: string;
    hsnCode: string;
    vendorBillId: string;
    vendorName: string;
    vendorInvoiceNumber: string;
    vendorBillDate: string;
    notes: string;
  }>({
    name: '',
    category: 'laptop',
    currentStock: 0,
    minStockAlert: 2,
    unitCost: 0,
    unitPrice: 0,
    sku: '',
    location: '',
    hsnCode: '',
    vendorBillId: '',
    vendorName: '',
    vendorInvoiceNumber: '',
    vendorBillDate: '',
    notes: '',
  });

  // Stock Movement Form
  const [moveItemId, setMoveItemId] = useState('');
  const [moveType, setMoveType] = useState<'in' | 'out'>('out');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');
  const [moveJobId, setMoveJobId] = useState('');

  // Add Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<DeviceCategory>('laptop');
  const [newItemStock, setNewItemStock] = useState(5);
  const [newItemMinAlert, setNewItemMinAlert] = useState(2);
  const [newItemCost, setNewItemCost] = useState(1000);
  const [newItemPrice, setNewItemPrice] = useState(1400);
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('Shelf A1');

  // Filtered Inventory
  const filteredInventory = inventory.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || (item.sku && item.sku.toLowerCase().includes(q));
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minStockAlert).length;
  const totalStockUnits = inventory.reduce((sum, i) => sum + i.currentStock, 0);
  const totalAssetValue = inventory.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0);

  const handleOpenMoveModal = (item?: InventoryItem, defaultType: 'in' | 'out' = 'out') => {
    if (item) {
      setMoveItemId(item.id);
    } else if (inventory.length > 0) {
      setMoveItemId(inventory[0].id);
    }
    setMoveType(defaultType);
    setMoveQty(1);
    setMoveReason(defaultType === 'out' ? 'Used for repair service' : 'Restock shipment received');
    setMoveJobId('');
    setIsMoveModalOpen(true);
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveItemId) return;
    const moveItem = inventory.find(i => i.id === moveItemId);
    const qtyToMove = Number(moveQty) || 0;
    if (qtyToMove <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }
    if (moveType === 'out' && moveItem && qtyToMove > moveItem.currentStock) {
      alert(`Only ${moveItem.currentStock} in stock for "${moveItem.name}". You cannot take out ${qtyToMove}.`);
      return;
    }

    recordStockMovement(
      moveItemId, 
      moveType, 
      qtyToMove, 
      moveReason || (moveType === 'in' ? 'Stock Inward' : 'Stock Outward'),
      moveJobId || undefined
    );

    setIsMoveModalOpen(false);
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addInventoryItem({
      name: newItemName,
      category: newItemCategory,
      currentStock: Number(newItemStock) || 0,
      minStockAlert: Number(newItemMinAlert) || 2,
      unitCost: Number(newItemCost) || 0,
      unitPrice: Number(newItemPrice) || 0,
      sku: newItemSku || `SKU-${Date.now().toString().slice(-4)}`,
      location: newItemLocation,
    });

    setIsAddItemModalOpen(false);
    setNewItemName('');
    setNewItemSku('');
  };

  // ---- CSV export / import (bulk add parts, or keep a spreadsheet backup)
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCsv = () => {
    const blob = new Blob(['\uFEFF' + inventoryToCsv(inventory)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stock_${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseInventoryCsv(String(reader.result || ''));
      const known = new Set(inventory.map(i => i.name.trim().toLowerCase()));
      const fresh = rows.filter(r => !known.has(r.name.toLowerCase()));
      const skipped = rows.length - fresh.length;
      if (fresh.length === 0) {
        alert(`Nothing new to add.${skipped ? `\n${skipped} item(s) already exist in stock.` : ''}${errors.length ? `\n\nProblems:\n${errors.slice(0, 8).join('\n')}` : ''}`);
        return;
      }
      const msg = `Add ${fresh.length} new item(s) to stock?` +
        (skipped ? `\n${skipped} already exist and will be skipped.` : '') +
        (errors.length ? `\n\n${errors.length} row(s) have problems and are skipped:\n${errors.slice(0, 8).join('\n')}` : '');
      if (!window.confirm(msg)) return;
      fresh.forEach(r => addInventoryItem({
        name: r.name, category: r.category as any, currentStock: r.currentStock, minStockAlert: r.minStockAlert,
        unitCost: r.unitCost, unitPrice: r.unitPrice, hsnCode: r.hsnCode || undefined,
        sku: r.sku || `SKU-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`,
        location: r.location,
      } as any));
    };
    reader.readAsText(file);
  };

  // Open Edit Item & Vendor Bill Origin Modal
  const handleOpenEditItemModal = (item: InventoryItem, initialTab: 'details' | 'vendor_origin' | 'ledger' = 'details') => {
    setSelectedItemForEdit(item);
    setEditForm({
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      minStockAlert: item.minStockAlert,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      sku: item.sku || '',
      location: item.location || '',
      hsnCode: item.hsnCode || '',
      vendorBillId: item.vendorBillId || '',
      vendorName: item.vendorName || '',
      vendorInvoiceNumber: item.vendorInvoiceNumber || '',
      vendorBillDate: item.vendorBillDate || '',
      notes: item.notes || '',
    });
    setSelectedBillToLink(item.vendorBillId || '');
    setEditActiveTab(initialTab);
    setEditSaveSuccess(false);
    setIsEditModalOpen(true);
  };

  // Submit Edit Item
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForEdit || !editForm.name.trim()) return;

    updateInventoryItem(selectedItemForEdit.id, {
      name: editForm.name,
      category: editForm.category,
      currentStock: Number(editForm.currentStock) || 0,
      minStockAlert: Number(editForm.minStockAlert) || 1,
      unitCost: Number(editForm.unitCost) || 0,
      unitPrice: Number(editForm.unitPrice) || 0,
      sku: editForm.sku,
      location: editForm.location,
      hsnCode: editForm.hsnCode,
      vendorBillId: editForm.vendorBillId || undefined,
      vendorName: editForm.vendorName || undefined,
      vendorInvoiceNumber: editForm.vendorInvoiceNumber || undefined,
      vendorBillDate: editForm.vendorBillDate || undefined,
      notes: editForm.notes,
    });

    setSelectedItemForEdit(prev => prev ? { ...prev, ...editForm } : null);
    setEditSaveSuccess(true);
    setTimeout(() => setEditSaveSuccess(false), 2000);
  };

  // Link Origin Vendor Bill to Item
  const handleLinkVendorBill = (billId: string) => {
    if (!selectedItemForEdit) return;
    const matchedBill = vendorBills.find(b => b.id === billId);
    if (!matchedBill) return;

    linkInventoryToVendorBill(selectedItemForEdit.id, matchedBill.id);
    setEditForm(prev => ({
      ...prev,
      vendorBillId: matchedBill.id,
      vendorName: matchedBill.vendorName,
      vendorInvoiceNumber: matchedBill.invoiceNumber,
      vendorBillDate: matchedBill.invoiceDate,
    }));
    setSelectedItemForEdit(prev => prev ? {
      ...prev,
      vendorBillId: matchedBill.id,
      vendorName: matchedBill.vendorName,
      vendorInvoiceNumber: matchedBill.invoiceNumber,
      vendorBillDate: matchedBill.invoiceDate,
    } : null);

    setEditSaveSuccess(true);
    setTimeout(() => setEditSaveSuccess(false), 2000);
  };

  // Unlink Vendor Bill from Item
  const handleUnlinkVendorBill = () => {
    if (!selectedItemForEdit) return;
    updateInventoryItem(selectedItemForEdit.id, {
      vendorBillId: undefined,
      vendorName: undefined,
      vendorInvoiceNumber: undefined,
      vendorBillDate: undefined,
    });
    setEditForm(prev => ({
      ...prev,
      vendorBillId: '',
      vendorName: '',
      vendorInvoiceNumber: '',
      vendorBillDate: '',
    }));
    setSelectedItemForEdit(prev => prev ? {
      ...prev,
      vendorBillId: undefined,
      vendorName: undefined,
      vendorInvoiceNumber: undefined,
      vendorBillDate: undefined,
    } : null);
    setSelectedBillToLink('');
    setEditSaveSuccess(true);
    setTimeout(() => setEditSaveSuccess(false), 2000);
  };

  // Delete Item
  const handleDeleteItem = (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to remove "${item.name}" from inventory?`)) {
      deleteInventoryItem(item.id);
      setIsEditModalOpen(false);
      setSelectedItemForEdit(null);
    }
  };

  // Find linked vendor bills for selected item
  const findLinkedVendorBills = (item: InventoryItem | null) => {
    if (!item) return [];
    return vendorBills.filter(bill => {
      // Direct ID match
      if (item.vendorBillId && bill.id === item.vendorBillId) return true;
      // Invoice number match
      if (item.vendorInvoiceNumber && bill.invoiceNumber.toLowerCase() === item.vendorInvoiceNumber.toLowerCase()) return true;
      // Item name match in bill items
      if (bill.items.some(it => it.matchedInventoryId === item.id || it.itemName.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(it.itemName.toLowerCase()))) return true;
      // Referenced in stock transactions
      if (stockTransactions.some(tx => tx.itemId === item.id && tx.referenceBillId === bill.id)) return true;
      return false;
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-sky-400' : 'text-blue-700'
          }`}>
            <span>Hardware Spares & Inward/Outward Ledger</span>
            <span>·</span>
            <span>Inventory Control</span>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Parts Catalog & Stock In / Out
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Track internal spares for Laptops, CCTV, Desktops, and Printers with automatic low-stock alarms.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => handleOpenMoveModal(undefined, 'in')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDark 
                ? 'text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-600 border border-emerald-800' 
                : 'text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 shadow-xs'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Stock Inward</span>
          </button>
          <button
            onClick={() => handleOpenMoveModal(undefined, 'out')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDark 
                ? 'text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-600 border border-amber-800' 
                : 'text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-300 shadow-xs'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Stock Outward</span>
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            title="Add many parts at once from a CSV file (columns: Name, Category, HSN, Stock, Min Stock, Cost, Selling Price, SKU, Location)"
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700' : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            title="Download the whole stock list as a spreadsheet"
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700' : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddItemModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Catalog Item</span>
          </button>
        </div>
      </div>

      {/* Stock Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <span className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Stocked Quantity</span>
          <div className={`text-2xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {totalStockUnits} units
          </div>
          <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{inventory.length} distinct hardware parts</span>
        </div>

        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <span className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Inventory Asset Valuation</span>
          <div className={`text-2xl font-bold font-mono tabular-nums ${isDark ? 'text-sky-400' : 'text-blue-700'}`}>
            ₹{totalAssetValue.toLocaleString('en-IN')}
          </div>
          <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Cost value in workshop storage</span>
        </div>

        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <span className={`text-xs block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock Reorder Alerts</span>
          <div className={`text-2xl font-bold font-mono tabular-nums ${lowStockCount > 0 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
            {lowStockCount} items
          </div>
          <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Items below safety reorder threshold</span>
        </div>
      </div>

      {/* Category Wise Command Center Cards (Requirement 6: Total Stock, Vendor, and Payment buttons) */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Category Stock, Vendor & Payment Breakdown
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Click Total Stock, Vendor, or Payment button to filter and inspect detailed breakdown below
            </p>
          </div>
          {activeCategoryDetail && (
            <button
              onClick={() => setActiveCategoryDetail(null)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              ✕ Clear Detail Filter
            </button>
          )}
        </div>

        {/* Category Cards Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['laptop', 'desktop', 'printer', 'cctv'] as DeviceCategory[]).map((catKey) => {
            const catItems = inventory.filter(i => i.category === catKey);
            const totalStockCount = catItems.reduce((sum, i) => sum + i.currentStock, 0);
            const totalVal = catItems.reduce((sum, i) => sum + (i.currentStock * i.unitCost), 0);

            // Related vendors from linked vendor bills or matching items
            const catItemNames = new Set(catItems.map(i => i.name.toLowerCase()));
            const linkedBills = vendorBills.filter(b => 
              b.items.some(it => catItemNames.has(it.itemName.toLowerCase()) || catItems.some(ci => ci.vendorBillId === b.id))
            );
            const vendorNames = Array.from(new Set(linkedBills.map(b => b.vendorName).filter(Boolean)));
            const totalVendorPurchase = linkedBills.reduce((sum, b) => sum + b.totalAmount, 0);
            const totalVendorPaid = linkedBills.reduce((sum, b) => sum + b.paidAmount, 0);
            const totalVendorPending = linkedBills.reduce((sum, b) => sum + Math.max(0, b.totalAmount - b.paidAmount), 0);

            const isStockActive = activeCategoryDetail?.category === catKey && activeCategoryDetail?.detailType === 'stock';
            const isVendorActive = activeCategoryDetail?.category === catKey && activeCategoryDetail?.detailType === 'vendor';
            const isPaymentActive = activeCategoryDetail?.category === catKey && activeCategoryDetail?.detailType === 'payment';

            const catLabels: Record<DeviceCategory, string> = {
              laptop: '💻 Laptops & Notebooks',
              desktop: '🖥️ Desktops & All-in-Ones',
              printer: '🖨️ Printers & Toner Cartridges',
              cctv: '📹 CCTV & Surveillance',
              network: '🌐 Network Equipment',
              general: '⚙️ General Hardware',
            };

            return (
              <div
                key={catKey}
                className={`p-3.5 rounded-xl border transition-all ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold truncate">{catLabels[catKey]}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700 border border-slate-200'
                  }`}>
                    {catItems.length} SKUs
                  </span>
                </div>

                {/* 3 Active Interactive Buttons */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* Button 1: Total Stock */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isStockActive) {
                        setActiveCategoryDetail(null);
                        setSelectedCategory('all');
                      } else {
                        setActiveCategoryDetail({ category: catKey, detailType: 'stock' });
                        setSelectedCategory(catKey);
                      }
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isStockActive
                        ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-blue-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 shadow-2xs'
                    }`}
                    title="Click to view all stock items in this category"
                  >
                    <span className="text-[9px] uppercase font-bold block opacity-75">Total Stock</span>
                    <span className="text-xs font-mono font-bold block">{totalStockCount} units</span>
                  </button>

                  {/* Button 2: Vendor */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isVendorActive) {
                        setActiveCategoryDetail(null);
                      } else {
                        setActiveCategoryDetail({ category: catKey, detailType: 'vendor' });
                        setSelectedCategory(catKey);
                      }
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isVendorActive
                        ? 'bg-purple-600 text-white font-bold border-purple-700 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-400 shadow-2xs'
                    }`}
                    title="Click to view suppliers & vendor purchases for this category"
                  >
                    <span className="text-[9px] uppercase font-bold block opacity-75">Vendor</span>
                    <span className="text-xs font-mono font-bold block truncate">{vendorNames.length || 0} Vendors</span>
                  </button>

                  {/* Button 3: Payment */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isPaymentActive) {
                        setActiveCategoryDetail(null);
                      } else {
                        setActiveCategoryDetail({ category: catKey, detailType: 'payment' });
                        setSelectedCategory(catKey);
                      }
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isPaymentActive
                        ? 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 shadow-2xs'
                    }`}
                    title="Click to view payment breakdown (Paid vs Due) for this category"
                  >
                    <span className="text-[9px] uppercase font-bold block opacity-75">Payment</span>
                    <span className={`text-xs font-mono font-bold block ${totalVendorPending > 0 && !isPaymentActive ? 'text-amber-500' : ''}`}>
                      ₹{totalVendorPaid > 0 ? (totalVendorPaid >= 1000 ? `${Math.round(totalVendorPaid/1000)}k` : totalVendorPaid) : '0'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Filter Panel Display when button clicked (Requirement 6) */}
        {activeCategoryDetail && (
          <div className={`p-4 rounded-xl border mt-3 space-y-3 animate-in fade-in duration-200 ${
            isDark ? 'bg-slate-950 border-blue-900/60' : 'bg-blue-50/60 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                  Category Filter Result:
                </span>
                <span className="text-xs font-bold">
                  {activeCategoryDetail.category.toUpperCase()} · {
                    activeCategoryDetail.detailType === 'stock' ? '📦 Total Stock Inventory Items' :
                    activeCategoryDetail.detailType === 'vendor' ? '🏢 Associated Spares Vendors' : '💳 Vendor Payment & Clearance Summary'
                  }
                </span>
              </div>
              <button
                onClick={() => setActiveCategoryDetail(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Detail Type 1: Stock Breakdown */}
            {activeCategoryDetail.detailType === 'stock' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {inventory.filter(i => i.category === activeCategoryDetail.category).map((inv, idx) => (
                  <div key={`${inv.id}-${idx}`} className={`p-3 rounded-lg border flex items-center justify-between ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <p className="font-bold">{inv.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">SKU: {inv.sku || 'N/A'} · HSN: {inv.hsnCode || '8471'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Location: {inv.location || 'Shelf'}</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className={`text-sm font-bold ${inv.currentStock <= inv.minStockAlert ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {inv.currentStock} units
                      </span>
                      <p className="text-[10px] text-slate-500">₹{inv.unitCost} / ₹{inv.unitPrice}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detail Type 2: Vendor Breakdown */}
            {activeCategoryDetail.detailType === 'vendor' && (
              <div className="space-y-2 text-xs">
                {(() => {
                  const catItems = inventory.filter(i => i.category === activeCategoryDetail.category);
                  const catItemNames = new Set(catItems.map(i => i.name.toLowerCase()));
                  const bills = vendorBills.filter(b => 
                    b.items.some(it => catItemNames.has(it.itemName.toLowerCase()) || catItems.some(ci => ci.vendorBillId === b.id))
                  );
                  if (bills.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic p-3">
                        No vendor purchase bills currently tagged with this category. Scan or record a vendor bill to link suppliers.
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {bills.map(b => (
                        <div key={b.id} className={`p-3 rounded-lg border ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <strong className="text-blue-500">{b.vendorName}</strong>
                            <span className="font-mono text-[10px]">Inv: {b.invoiceNumber}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-1">Date: {b.invoiceDate} · ₹{b.totalAmount.toLocaleString('en-IN')}</p>
                          <div className="mt-2 text-[10px] flex items-center justify-between">
                            <span className="capitalize">Status: <strong>{b.paymentStatus}</strong></span>
                            <span className="text-emerald-500 font-bold">Paid: ₹{b.paidAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Detail Type 3: Payment Breakdown */}
            {activeCategoryDetail.detailType === 'payment' && (
              <div className="p-3 rounded-lg border space-y-2 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {(() => {
                  const catItems = inventory.filter(i => i.category === activeCategoryDetail.category);
                  const catItemNames = new Set(catItems.map(i => i.name.toLowerCase()));
                  const bills = vendorBills.filter(b => 
                    b.items.some(it => catItemNames.has(it.itemName.toLowerCase()) || catItems.some(ci => ci.vendorBillId === b.id))
                  );
                  const totalPurchased = bills.reduce((sum, b) => sum + b.totalAmount, 0);
                  const totalPaid = bills.reduce((sum, b) => sum + b.paidAmount, 0);
                  const totalDue = bills.reduce((sum, b) => sum + Math.max(0, b.totalAmount - b.paidAmount), 0);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-slate-500 block">Total Spares Purchased</span>
                        <strong className="text-base font-mono">₹{totalPurchased.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Amount Settled (Paid)</span>
                        <strong className="text-base font-mono text-emerald-500">₹{totalPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Pending Clearance (Due)</span>
                        <strong className={`text-base font-mono ${totalDue > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                          ₹{totalDue.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Tabs & Search Toolbar */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className={`flex items-center gap-2 p-1 border rounded-lg w-full sm:w-auto ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setStockViewTab('catalog')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                stockViewTab === 'catalog' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Hardware Catalog ({inventory.length})
            </button>
            <button
              onClick={() => setStockViewTab('logs')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                stockViewTab === 'logs' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Inward / Outward Movement History ({stockTransactions.length})
            </button>
          </div>

          {stockViewTab === 'catalog' && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search parts by name, SKU..."
                  className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                  isDark 
                    ? 'bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500' 
                    : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
              >
                <option value="all">All Categories</option>
                <option value="laptop">Laptops</option>
                <option value="desktop">Desktops</option>
                <option value="cctv">CCTV</option>
                <option value="printer">Printers</option>
                <option value="network">Networking</option>
                <option value="general">General</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Hardware Catalog Table */}
        {stockViewTab === 'catalog' && (
          <div className={`rounded-xl border overflow-hidden mt-3 ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className={`border-b uppercase tracking-wider text-[11px] font-semibold ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Item Name & Specification</th>
                    <th className="py-3 px-4">Origin Vendor Bill</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 font-mono">SKU / Code</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 font-mono text-center">In Stock</th>
                    <th className="py-3 px-4 font-mono">Unit Cost <span className="font-sans font-normal text-[9px]">(no GST)</span></th>
                    <th className="py-3 px-4 font-mono">Selling Price <span className="font-sans font-normal text-[9px]">(incl. GST & Code)</span></th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {filteredInventory.map((item, idx) => {
                    const isLow = item.currentStock <= item.minStockAlert;
                    const originBill = item.vendorInvoiceNumber || (item.vendorBillId ? vendorBills.find(b => b.id === item.vendorBillId)?.invoiceNumber : undefined);
                    const originVendor = item.vendorName || (item.vendorBillId ? vendorBills.find(b => b.id === item.vendorBillId)?.vendorName : undefined);

                    return (
                      <tr 
                        key={`${item.id}-${idx}`} 
                        onClick={() => handleOpenEditItemModal(item)}
                        className={`transition-colors cursor-pointer group ${
                          isDark ? 'hover:bg-blue-950/20' : 'hover:bg-blue-50/60'
                        }`}
                        title="Click to Edit Item Details & View Originating Vendor Bill"
                      >
                        <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-700'}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{item.name}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-500 font-normal transition-opacity">
                              ✎ Click to edit
                            </span>
                          </div>
                          {isLow && (
                            <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                              isDark ? 'text-amber-400' : 'text-amber-600'
                            }`}>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Low stock alert (Min threshold: {item.minStockAlert})</span>
                            </span>
                          )}
                        </td>

                        {/* Origin Vendor Bill Column */}
                        <td className="py-3 px-4" onClick={(e) => { e.stopPropagation(); handleOpenEditItemModal(item, 'vendor_origin'); }}>
                          {originBill ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                <Receipt className="w-2.5 h-2.5" />
                                <span>{originBill}</span>
                              </span>
                              {originVendor && (
                                <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{originVendor}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic hover:text-blue-500 flex items-center gap-1">
                              <span>+ Link Vendor Bill</span>
                            </span>
                          )}
                        </td>

                        <td className={`py-3 px-4 uppercase tracking-wider text-[10px] font-medium ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {item.category}
                        </td>

                        <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.sku || '—'}
                        </td>

                        <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.location || 'Workshop'}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span className={isLow 
                            ? (isDark ? 'text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200')
                            : (isDark ? 'text-emerald-400' : 'text-emerald-700')
                          }>
                            {item.currentStock}
                          </span>
                        </td>

                        <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ₹{item.unitCost.toLocaleString('en-IN')}
                        </td>

                        <td className={`py-3 px-4 font-mono font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>₹{item.unitPrice.toLocaleString('en-IN')}</span>
                            {item.unitPrice > 0 && (
                              <span 
                                className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900 tracking-wider"
                                title={`Secret Price Code: ${encodeAmountToCode(item.unitPrice, activePriceCodeMapping).code}`}
                              >
                                {encodeAmountToCode(item.unitPrice, activePriceCodeMapping).code}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditItemModal(item)}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                              title="Edit Item Details & Vendor Bill Origin"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenMoveModal(item, 'in')}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                isDark ? 'text-emerald-400 hover:bg-slate-800' : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title="Stock In (+)"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenMoveModal(item, 'out')}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-amber-700 hover:bg-amber-50'
                              }`}
                              title="Stock Out (-)"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
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
        )}

        {/* Tab 2: Movement Logs Table */}
        {stockViewTab === 'logs' && (
          <div className={`rounded-xl border overflow-hidden mt-3 ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className={`border-b uppercase tracking-wider text-[11px] font-semibold ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4 font-mono text-center">Qty</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Linked Job / Bill</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {stockTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No transactions logged yet.
                      </td>
                    </tr>
                  ) : (
                    stockTransactions.map(tx => (
                      <tr key={tx.id} className={`transition-colors ${
                        isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
                      }`}>
                        <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tx.date}</td>
                        <td className="py-3 px-4">
                          {tx.type === 'in' ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              isDark ? 'text-emerald-400' : 'text-emerald-700'
                            }`}>
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>INWARD (+)</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              isDark ? 'text-amber-400' : 'text-amber-700'
                            }`}>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>OUTWARD (-)</span>
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tx.itemName}</td>
                        <td className={`py-3 px-4 text-center font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{tx.quantity}</td>
                        <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tx.reason}</td>
                        <td className={`py-3 px-4 font-mono ${isDark ? 'text-blue-400' : 'text-blue-700 font-semibold'}`}>
                          {tx.jobCardId || tx.referenceBillId || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stock In / Out Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Record Stock In / Out Movement</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Update warehouse inventory balances</p>
              </div>
              <button onClick={() => setIsMoveModalOpen(false)} className={`cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMoveSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Select Hardware Item</label>
                <select
                  value={moveItemId}
                  onChange={(e) => setMoveItemId(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  {inventory.map((item, idx) => (
                    <option key={`${item.id}-${idx}`} value={item.id}>
                      {item.name} (Current: {item.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Movement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMoveType('in')}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                      moveType === 'in' 
                        ? 'bg-emerald-600 border-emerald-500 text-white' 
                        : (isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600')
                    }`}
                  >
                    + INWARD (Restock / Received)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveType('out')}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                      moveType === 'out' 
                        ? 'bg-amber-600 border-amber-500 text-white' 
                        : (isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600')
                    }`}
                  >
                    - OUTWARD (Used / Sold)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={moveQty}
                    onChange={(e) => setMoveQty(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Link Job ID (Optional)</label>
                  <select
                    value={moveJobId}
                    onChange={(e) => setMoveJobId(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">None (General)</option>
                    {jobCards.filter(j => j.status !== 'delivered').map(j => (
                      <option key={j.id} value={j.jobId}>
                        {j.jobId} - {j.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Reason / Reference Note</label>
                <input
                  type="text"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="e.g. Dinesh Lenovo NVMe upgrade, Over-the-counter sale"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-800 bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Commit Stock Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Catalog Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add New Hardware Part to Catalog</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Configure part pricing, reorder thresholds, and bin location</p>
              </div>
              <button onClick={() => setIsAddItemModalOpen(false)} className={`cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Part Name & Model *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Kingston 16GB DDR5 5200MHz RAM"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as DeviceCategory)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="laptop">Laptop Spares</option>
                    <option value="desktop">Desktop Components</option>
                    <option value="cctv">CCTV Equipment</option>
                    <option value="printer">Printer Consumables</option>
                    <option value="network">Networking Cables</option>
                    <option value="general">General Spares</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>SKU / Serial Prefix</label>
                  <input
                    type="text"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="e.g. RAM-DDR5-16G"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Initial Stock Qty</label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Min Stock Alert</label>
                  <input
                    type="number"
                    value={newItemMinAlert}
                    onChange={(e) => setNewItemMinAlert(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Cost Price (₹) - without GST</label>
                  <input
                    type="number"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Sale Rate (₹) - including GST</label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Sticker Code (Secret)</label>
                  <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono font-extrabold border min-h-[34px] ${
                    newItemPrice > 0
                      ? 'bg-blue-50/80 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300'
                      : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800'
                  }`}>
                    <span className="tracking-widest text-sm">
                      {newItemPrice > 0 ? (encodeAmountToCode(newItemPrice, activePriceCodeMapping).code || '—') : '—'}
                    </span>
                    {newItemPrice > 0 && encodeAmountToCode(newItemPrice, activePriceCodeMapping).code && (
                      <span className="text-[10px] font-normal text-slate-400 font-sans">
                        Pen on item
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-800 bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Item & Vendor Bill Origin Traceability Modal */}
      {isEditModalOpen && selectedItemForEdit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      {selectedItemForEdit.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                      {selectedItemForEdit.category}
                    </span>
                    {selectedItemForEdit.sku && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedItemForEdit.sku}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Stock Editor & Vendor Bill Origin Traceability
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className={`flex items-center gap-2 px-6 pt-3 border-b shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-100/50'
            }`}>
              <button
                type="button"
                onClick={() => setEditActiveTab('details')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  editActiveTab === 'details'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Item Details</span>
              </button>

              <button
                type="button"
                onClick={() => setEditActiveTab('vendor_origin')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  editActiveTab === 'vendor_origin'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Origin Vendor Bill Traceability</span>
                {selectedItemForEdit.vendorInvoiceNumber || selectedItemForEdit.vendorBillId ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setEditActiveTab('ledger')}
                className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  editActiveTab === 'ledger'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Movement Ledger</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* TAB 1: Edit Item Details */}
              {editActiveTab === 'details' && (
                <form onSubmit={handleSaveItemEdit} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Item / Hardware Part Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Category
                      </label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as DeviceCategory })}
                        className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="laptop">Laptop Spares</option>
                        <option value="desktop">Desktop Components</option>
                        <option value="cctv">CCTV Equipment</option>
                        <option value="printer">Printer Consumables</option>
                        <option value="network">Networking Cables</option>
                        <option value="general">General Spares</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        SKU / Serial Prefix
                      </label>
                      <input
                        type="text"
                        value={editForm.sku}
                        onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Stock Level Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Current Stock Count (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.currentStock}
                        onChange={(e) => setEditForm({ ...editForm, currentStock: Number(e.target.value) })}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Minimum Stock Alert Threshold
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.minStockAlert}
                        onChange={(e) => setEditForm({ ...editForm, minStockAlert: Number(e.target.value) })}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Pricing Inputs & Margin Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Unit Cost Price (₹) [Purchase Rate, without GST]
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.unitCost}
                        onChange={(e) => setEditForm({ ...editForm, unitCost: Number(e.target.value) })}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Sale Rate / Unit Price (₹) [including GST]
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editForm.unitPrice}
                        onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Sticker Code (Secret)
                      </label>
                      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-mono font-extrabold border min-h-[34px] ${
                        editForm.unitPrice > 0
                          ? 'bg-blue-50/80 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300'
                          : 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800'
                      }`}>
                        <span className="tracking-widest text-sm">
                          {editForm.unitPrice > 0 ? (encodeAmountToCode(editForm.unitPrice, activePriceCodeMapping).code || '—') : '—'}
                        </span>
                        {editForm.unitPrice > 0 && encodeAmountToCode(editForm.unitPrice, activePriceCodeMapping).code && (
                          <span className="text-[10px] font-normal text-slate-400 font-sans">
                            Pen on item
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Margin calculation card */}
                  {(() => {
                    // selling price includes GST, cost does not -> compare like with like
                    const gstForMargin = 18;
                    const priceExGst = editForm.unitPrice / (1 + gstForMargin / 100);
                    const margin = Number((priceExGst - editForm.unitCost).toFixed(2));
                    const markupPct = editForm.unitCost > 0 ? Math.round((margin / editForm.unitCost) * 100) : 0;
                    return (
                      <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                        isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-emerald-50/50 border-emerald-200'
                      }`}>
                        <span className="text-slate-400 font-sans">Profit per Unit (after removing 18% GST from price):</span>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{margin.toLocaleString('en-IN')} Profit
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            markupPct >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {markupPct}% Markup
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Storage Location & HSN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Storage Location / Rack / Bin
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        placeholder="e.g. Shelf B2, Drawer 4, Workshop Desk"
                        className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        HSN / SAC Code (for GST Billing)
                      </label>
                      <input
                        type="text"
                        value={editForm.hsnCode}
                        onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
                        placeholder="e.g. 84717020, 84733020"
                        className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Technical Specifications & Warranty Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="e.g. 5-year manufacturer warranty, Gen4x4 speed 3500MB/s, OEM seal intact"
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Actions & Delete */}
                  <div className={`flex items-center justify-between pt-4 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(selectedItemForEdit)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Delete Item (Admin Only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Item</span>
                      </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      {editSaveSuccess && (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Saved Successfully!
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                          isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 2: Origin Vendor Bill Traceability */}
              {editActiveTab === 'vendor_origin' && (() => {
                const currentBillId = editForm.vendorBillId || selectedItemForEdit.vendorBillId;
                const matchedBill = vendorBills.find(b => b.id === currentBillId) ||
                  vendorBills.find(b => editForm.vendorInvoiceNumber && b.invoiceNumber.toLowerCase() === editForm.vendorInvoiceNumber.toLowerCase());

                const candidateBills = findLinkedVendorBills(selectedItemForEdit);

                return (
                  <div className="space-y-5">
                    
                    {/* Traceability Status Header */}
                    <div className={`p-4 rounded-xl border ${
                      matchedBill 
                        ? (isDark ? 'bg-blue-950/20 border-blue-900/60' : 'bg-blue-50/70 border-blue-200')
                        : (isDark ? 'bg-amber-950/20 border-amber-900/60' : 'bg-amber-50/70 border-amber-200')
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Receipt className={`w-4 h-4 ${matchedBill ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600'}`} />
                            <h4 className="text-xs font-bold">
                              {matchedBill 
                                ? `Stock Origin Linked: ${matchedBill.invoiceNumber}`
                                : 'No Vendor Bill Currently Linked'}
                            </h4>
                            {matchedBill && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Verified Inward Stock
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {matchedBill 
                              ? `This inventory item was purchased & stocked from vendor ${matchedBill.vendorName} on ${matchedBill.invoiceDate}.`
                              : 'Link this stock item to a registered vendor invoice to track cost price, warranty invoices, and supply chain origins.'}
                          </p>
                        </div>

                        {matchedBill && (
                          <button
                            type="button"
                            onClick={handleUnlinkVendorBill}
                            className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                          >
                            Unlink Bill
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Verified Bill Card */}
                    {matchedBill ? (
                      <div className={`p-4 rounded-xl border space-y-4 ${
                        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin Vendor Invoice</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                                {matchedBill.invoiceNumber}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                matchedBill.paymentStatus === 'paid' 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {matchedBill.paymentStatus.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Vendor Supplier</span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {matchedBill.vendorName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Bill Date: {matchedBill.invoiceDate}
                            </p>
                          </div>
                        </div>

                        {/* Bill Breakdown Items */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-blue-500" />
                              Line Items on this Vendor Bill:
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                              Total Bill: ₹{matchedBill.totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="border rounded-lg overflow-hidden text-xs">
                            <div className="overflow-x-auto scrollbar-thin">
                              <table className="w-full text-left min-w-[360px]">
                              <thead className={`border-b text-[10px] font-semibold uppercase ${
                                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                <tr>
                                  <th className="py-2 px-3">Item on Bill</th>
                                  <th className="py-2 px-2 text-center">Qty Received</th>
                                  <th className="py-2 px-2 text-right">Unit Cost</th>
                                  <th className="py-2 px-3 text-right">Line Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {matchedBill.items.map((bItem, idx) => {
                                  const isCurrentItemMatch = bItem.matchedInventoryId === selectedItemForEdit.id ||
                                    bItem.itemName.toLowerCase().includes(selectedItemForEdit.name.toLowerCase()) ||
                                    selectedItemForEdit.name.toLowerCase().includes(bItem.itemName.toLowerCase());

                                  return (
                                    <tr key={idx} className={isCurrentItemMatch ? (isDark ? 'bg-blue-950/40 font-bold' : 'bg-blue-50 font-bold') : ''}>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-1.5">
                                          <span>{bItem.itemName}</span>
                                          {isCurrentItemMatch && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white">
                                              This Stock Item
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono">{bItem.quantity}</td>
                                      <td className="py-2 px-2 text-right font-mono">₹{bItem.unitCost.toLocaleString('en-IN')}</td>
                                      <td className="py-2 px-3 text-right font-mono font-bold">₹{bItem.total.toLocaleString('en-IN')}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* Bill Scanned Image or Voucher link if present */}
                        {matchedBill.billImage && (
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-xs font-medium">Scanned Physical Vendor Invoice Available</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedBillForPreview(matchedBill)}
                              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              View Bill Slip
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Link / Re-link Selector */}
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <h4 className="text-xs font-bold flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-500" />
                        <span>{matchedBill ? 'Switch / Re-link to a Different Vendor Bill' : 'Select Origin Vendor Bill for this Item'}</span>
                      </h4>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={selectedBillToLink}
                          onChange={(e) => setSelectedBillToLink(e.target.value)}
                          className={`flex-1 rounded-lg px-3 py-2 text-xs focus:outline-none ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="">-- Choose Vendor Bill from System --</option>
                          {vendorBills.map(bill => (
                            <option key={bill.id} value={bill.id}>
                              {bill.invoiceNumber} · {bill.vendorName} ({bill.invoiceDate}) - ₹{bill.totalAmount.toLocaleString('en-IN')}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!selectedBillToLink}
                          onClick={() => handleLinkVendorBill(selectedBillToLink)}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white cursor-pointer shadow-xs"
                        >
                          Link Bill
                        </button>
                      </div>

                      {/* Other candidate bills */}
                      {candidateBills.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                            Relevant Bills Mentioning Similar Parts:
                          </span>
                          <div className="space-y-1">
                            {candidateBills.map(cb => (
                              <div
                                key={cb.id}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                }`}
                              >
                                <div>
                                  <span className="font-mono font-bold text-blue-600 mr-2">{cb.invoiceNumber}</span>
                                  <span className="text-slate-600 dark:text-slate-300">{cb.vendorName} ({cb.invoiceDate})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleLinkVendorBill(cb.id)}
                                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                                >
                                  Use this Bill
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })()}

              {/* TAB 3: Stock Movement Ledger */}
              {editActiveTab === 'ledger' && (() => {
                const itemLogs = stockTransactions.filter(t => t.itemId === selectedItemForEdit.id);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Item Movement History</span>
                      <span className="text-xs font-mono text-slate-400">{itemLogs.length} transactions recorded</span>
                    </div>

                    {itemLogs.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-400">
                        No inward or outward stock transactions recorded specifically for this item yet.
                      </div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden text-xs">
                        <div className="overflow-x-auto scrollbar-thin">
                          <table className="w-full text-left min-w-[420px]">
                          <thead className={`border-b text-[10px] font-semibold uppercase ${
                            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3 text-center">Qty</th>
                              <th className="py-2.5 px-3">Reason / Ref</th>
                              <th className="py-2.5 px-3">Ref ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {itemLogs.map(t => (
                              <tr key={t.id}>
                                <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{t.date}</td>
                                <td className="py-2 px-3">
                                  {t.type === 'in' ? (
                                    <span className="text-emerald-600 font-bold text-[11px]">INWARD (+)</span>
                                  ) : (
                                    <span className="text-amber-600 font-bold text-[11px]">OUTWARD (-)</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold">{t.quantity}</td>
                                <td className="py-2 px-3">{t.reason}</td>
                                <td className="py-2 px-3 font-mono text-blue-600">{t.jobCardId || t.referenceBillId || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="text-[11px] text-slate-400">
                Item ID: <span className="font-mono">{selectedItemForEdit.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Vendor Bill Preview Modal */}
      {selectedBillForPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold font-mono text-blue-600">
                  {selectedBillForPreview.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedBillForPreview.vendorName} · {selectedBillForPreview.invoiceDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedBillForPreview(null)}
                className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedBillForPreview.billImage && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-60 bg-black flex items-center justify-center">
                <img
                  src={selectedBillForPreview.billImage}
                  alt="Scanned Bill"
                  className="max-h-60 object-contain w-full"
                />
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Bill Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  ₹{selectedBillForPreview.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid Amount:</span>
                <span className="font-mono font-bold text-emerald-600">
                  ₹{selectedBillForPreview.paidAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment Status:</span>
                <span className="font-bold uppercase text-blue-600">
                  {selectedBillForPreview.paymentStatus}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBillForPreview(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
