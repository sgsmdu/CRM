import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  Building2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Percent, 
  ArrowUpDown, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  Layers,
  Receipt,
  ShoppingCart
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { Invoice, VendorBill, CashFlowEntry } from '../types';

export const ReportsManager: React.FC = () => {
  const { 
    invoices, 
    vendorBills, 
    cashFlow, 
    adminSettings, 
    theme 
  } = useSgs();
  
  const isDark = theme === 'dark';

  const [activeReportTab, setActiveReportTab] = useState<'all' | 'gstr1' | 'gstr2'>('gstr1');
  
  // Period filter for GSTR (YYYY-MM)
  const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [copySuccess, setCopySuccess] = useState(false);

  // Master All Reports Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFirm, setFilterFirm] = useState<'all' | 'sgs' | 'pandiyan'>('all');
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'quotation' | 'vendor_bill' | 'cashflow'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'cancelled'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Month return period formatted as MMYYYY for GST portal (e.g. 102026)
  const fpMonth = useMemo(() => {
    const parts = selectedMonth.split('-');
    if (parts.length === 2) {
      return `${parts[1]}${parts[0]}`;
    }
    return '102026';
  }, [selectedMonth]);

  // Outward Tax Invoices for GSTR-1 in selected period
  const gstr1Invoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.type !== 'invoice' || inv.status === 'cancelled') return false;
      if (inv.billingFirm === 'pandiyan') return false; // Pandiyan is non-GST
      return inv.date.startsWith(selectedMonth);
    });
  }, [invoices, selectedMonth]);

  // Inward Vendor Bills for GSTR-2 in selected period
  const gstr2Bills = useMemo(() => {
    return vendorBills.filter(bill => {
      const billDate = bill.invoiceDate || bill.createdAt;
      return billDate.startsWith(selectedMonth);
    });
  }, [vendorBills, selectedMonth]);

  // GSTR-1 Calculations
  const gstr1Stats = useMemo(() => {
    let totalTaxable = 0;
    let totalTax = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalInvoiceValue = 0;

    gstr1Invoices.forEach(inv => {
      totalTaxable += inv.subtotal || 0;
      totalTax += inv.taxAmount || 0;
      totalCgst += (inv.taxAmount || 0) / 2;
      totalSgst += (inv.taxAmount || 0) / 2;
      totalInvoiceValue += inv.grandTotal || 0;
    });

    return {
      count: gstr1Invoices.length,
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalInvoiceValue: Number(totalInvoiceValue.toFixed(2)),
    };
  }, [gstr1Invoices]);

  // GSTR-2 Stats
  const gstr2Stats = useMemo(() => {
    let totalPurchases = 0;
    let totalTaxable = 0;
    let totalInputGst = 0;

    gstr2Bills.forEach(bill => {
      totalPurchases += bill.totalAmount || 0;
      const tax = bill.taxAmount || 0;
      totalInputGst += tax;
      totalTaxable += (bill.subtotal || (bill.totalAmount - tax));
    });

    return {
      count: gstr2Bills.length,
      totalPurchases: Number(totalPurchases.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalInputGst: Number(totalInputGst.toFixed(2)),
      totalCgst: Number((totalInputGst / 2).toFixed(2)),
      totalSgst: Number((totalInputGst / 2).toFixed(2)),
    };
  }, [gstr2Bills]);

  // Generate Official GSTR-1 JSON (as per GST Portal Offline Tool Schema)
  const generateGstr1Json = () => {
    const gstin = adminSettings.workshopGstin || '33AANCS7890Q1Z8';

    // B2B: Invoices with customer GSTIN (or if not present, dummy for demonstration)
    const b2bInvoices: any[] = [];
    const b2csInvoices: any[] = [];
    const hsnMap: { [code: string]: { desc: string; qty: number; val: number; txval: number; camt: number; samt: number; rt: number } } = {};

    gstr1Invoices.forEach(inv => {
      const rate = inv.gstPercent || 18;
      const camt = Number(((inv.taxAmount || 0) / 2).toFixed(2));
      const samt = Number(((inv.taxAmount || 0) / 2).toFixed(2));
      const dateParts = inv.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : inv.date;

      // Group into B2CS (Consumer Unregistered)
      b2csInvoices.push({
        sply_ty: 'INTRA',
        pos: '33', // Tamil Nadu
        typ: 'OE',
        rt: rate,
        txval: Number(inv.subtotal.toFixed(2)),
        camt,
        samt,
        csamt: 0
      });

      // HSN aggregation
      (inv.items || []).forEach(item => {
        const hsn = item.hsnCode || adminSettings.defaultHsnCode || '998713';
        const itmTaxable = item.amount || 0;
        const itmRate = item.gstPercent !== undefined ? item.gstPercent : rate;
        const itmGst = item.gstAmount || ((itmTaxable * itmRate) / 100);
        const itmCamt = Number((itmGst / 2).toFixed(2));
        const itmSamt = Number((itmGst / 2).toFixed(2));

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            desc: item.description.split('\n')[0].substring(0, 30),
            qty: 0,
            val: 0,
            txval: 0,
            camt: 0,
            samt: 0,
            rt: itmRate
          };
        }
        hsnMap[hsn].qty += (item.quantity || 1);
        hsnMap[hsn].val += Number(((item.totalWithGst || (itmTaxable + itmGst))).toFixed(2));
        hsnMap[hsn].txval += Number(itmTaxable.toFixed(2));
        hsnMap[hsn].camt += itmCamt;
        hsnMap[hsn].samt += itmSamt;
      });
    });

    const hsnData = Object.keys(hsnMap).map((code, idx) => ({
      num: idx + 1,
      hsn_sc: code,
      desc: hsnMap[code].desc,
      uqc: 'NOS',
      qty: hsnMap[code].qty,
      val: Number(hsnMap[code].val.toFixed(2)),
      txval: Number(hsnMap[code].txval.toFixed(2)),
      iamt: 0,
      camt: Number(hsnMap[code].camt.toFixed(2)),
      samt: Number(hsnMap[code].samt.toFixed(2)),
      csamt: 0
    }));

    // Document Summary (Table 13)
    const sortedNums = gstr1Invoices.map(i => i.invoiceNumber).filter(Boolean);
    const docSummary = {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          docs: [
            {
              num: 1,
              from: sortedNums[0] || `${adminSettings.invoicePrefix || 'SGS-INV-'}0001`,
              to: sortedNums[sortedNums.length - 1] || `${adminSettings.invoicePrefix || 'SGS-INV-'}0001`,
              totnum: gstr1Invoices.length,
              canc: 0,
              net_issue: gstr1Invoices.length
            }
          ]
        }
      ]
    };

    const gstr1Payload = {
      gstin,
      fp: fpMonth,
      gt: 0,
      cur_gt: gstr1Stats.totalInvoiceValue,
      b2b: b2bInvoices,
      b2cs: b2csInvoices,
      hsn: { data: hsnData },
      doc_issue: docSummary
    };

    return gstr1Payload;
  };

  // Download GSTR-1 JSON
  const handleDownloadGstr1Json = () => {
    const payload = generateGstr1Json();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    const safeGstin = adminSettings.workshopGstin || '33AANCS7890Q1Z8';
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `spider_grid_solutions_${safeGstin}_gstr_1_${fpMonth}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy GSTR-1 JSON to Clipboard
  const handleCopyGstr1Json = () => {
    const payload = generateGstr1Json();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Generate Official GSTR-2 JSON
  const generateGstr2Json = () => {
    const gstin = adminSettings.workshopGstin || '33AANCS7890Q1Z8';
    const b2bInward: any[] = [];

    gstr2Bills.forEach(bill => {
      const invDate = bill.invoiceDate || bill.createdAt.split('T')[0];
      const dateParts = invDate.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : invDate;
      const rate = 18;
      const tax = bill.taxAmount || 0;
      const txval = Number(((bill.subtotal || (bill.totalAmount - tax))).toFixed(2));
      const camt = Number((tax / 2).toFixed(2));
      const samt = Number((tax / 2).toFixed(2));

      b2bInward.push({
        ctin: '33AABCV1234F1Z0',
        cpty: bill.vendorName,
        inv: [
          {
            inum: bill.invoiceNumber,
            idt: formattedDate,
            val: Number(bill.totalAmount.toFixed(2)),
            pos: '33',
            rchrg: 'N',
            inv_typ: 'R',
            itms: [
              {
                num: 1,
                itm_det: {
                  txval,
                  rt: rate,
                  camt,
                  samt,
                  csamt: 0
                },
                itc: {
                  elg: 'ip',
                  tx_c: camt,
                  tx_s: samt,
                  tx_i: 0
                }
              }
            ]
          }
        ]
      });
    });

    return {
      gstin,
      fp: fpMonth,
      b2b: b2bInward
    };
  };

  // Download GSTR-2 JSON
  const handleDownloadGstr2Json = () => {
    const payload = generateGstr2Json();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    const safeGstin = adminSettings.workshopGstin || '33AANCS7890Q1Z8';
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `spider_grid_solutions_${safeGstin}_gstr_2_${fpMonth}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download GSTR-1 Excel (.csv)
  const handleDownloadGstr1Excel = () => {
    const headers = [
      'Document Type',
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer Phone',
      'Customer Area / POS',
      'HSN Code',
      'Item Description',
      'Quantity',
      'Gross Selling Rate',
      'Taxable Value (₹)',
      'GST Rate (%)',
      'CGST 9% (₹)',
      'SGST 9% (₹)',
      'Total GST (₹)',
      'Total Invoice Value (₹)',
      'Payment Status',
      'Payment Mode'
    ];

    const rows: string[][] = [];

    gstr1Invoices.forEach(inv => {
      inv.items.forEach(it => {
        const rate = it.gstPercent !== undefined ? it.gstPercent : (inv.gstPercent || 18);
        const camt = Number(((it.gstAmount || 0) / 2).toFixed(2));
        const samt = Number(((it.gstAmount || 0) / 2).toFixed(2));

        rows.push([
          inv.type.toUpperCase(),
          inv.invoiceNumber,
          inv.date,
          `"${inv.customerName.replace(/"/g, '""')}"`,
          inv.customerPhone || '',
          `"${(inv.customerArea || 'Tamil Nadu (33)').replace(/"/g, '""')}"`,
          it.hsnCode || adminSettings.defaultHsnCode || '998713',
          `"${(it.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          String(it.quantity || 1),
          String(it.grossRate || it.rate),
          String(it.amount),
          String(rate),
          String(camt),
          String(samt),
          String(it.gstAmount || 0),
          String(inv.grandTotal),
          inv.paymentStatus.toUpperCase(),
          inv.paymentMode.toUpperCase()
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      headers.join(',') + '\n' + 
      rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR1_Outward_Supplies_${selectedMonth}_SpiderGrid.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Download GSTR-2 Excel (.csv)
  const handleDownloadGstr2Excel = () => {
    const headers = [
      'Vendor Name',
      'Vendor GSTIN',
      'Bill Number',
      'Bill Date',
      'Item Description',
      'HSN Code',
      'Quantity',
      'Taxable Value (₹)',
      'Input CGST (₹)',
      'Input SGST (₹)',
      'Total Input GST (₹)',
      'Total Bill Amount (₹)',
      'Eligible ITC (Y/N)',
      'Payment Status'
    ];

    const rows: string[][] = [];

    gstr2Bills.forEach(bill => {
      const invDate = bill.invoiceDate || bill.createdAt.split('T')[0];
      const items = bill.items && bill.items.length > 0 ? bill.items : [{
        itemName: 'Workshop Hardware & Spares',
        hsnCode: '8471',
        quantity: 1,
        unitCost: bill.subtotal || (bill.totalAmount - (bill.taxAmount || 0)),
        total: bill.subtotal || (bill.totalAmount - (bill.taxAmount || 0)),
        gstAmount: bill.taxAmount || 0,
        totalWithGst: bill.totalAmount
      }];

      items.forEach(it => {
        const itmGst = it.gstAmount || (bill.taxAmount || 0);
        rows.push([
          `"${bill.vendorName.replace(/"/g, '""')}"`,
          '33AABCV1234F1Z0',
          bill.invoiceNumber,
          invDate,
          `"${(it.itemName || '').replace(/"/g, '""')}"`,
          it.hsnCode || '8471',
          String(it.quantity || 1),
          String(it.total || 0),
          String(Number((itmGst / 2).toFixed(2))),
          String(Number((itmGst / 2).toFixed(2))),
          String(itmGst),
          String(bill.totalAmount),
          'Y (Inputs/Services)',
          bill.paymentStatus.toUpperCase()
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      headers.join(',') + '\n' + 
      rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR2_Inward_ITC_${selectedMonth}_SpiderGrid.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Master Filtered Records for All Details
  const masterFilteredRecords = useMemo(() => {
    type MasterRow = {
      id: string;
      date: string;
      docNum: string;
      type: 'Invoice' | 'Quotation' | 'Vendor Bill' | 'Income' | 'Expense';
      firm: 'SGS' | 'Pandiyan' | 'Vendor';
      partyName: string;
      phone: string;
      details: string;
      taxable: number;
      taxAmount: number;
      total: number;
      paymentStatus: 'paid' | 'partial' | 'unpaid' | 'cancelled' | 'pending';
      paymentMode: string;
      reference: string;
    };

    const results: MasterRow[] = [];

    // 1. Invoices & Quotations
    if (filterType === 'all' || filterType === 'invoice' || filterType === 'quotation') {
      invoices.forEach(inv => {
        if (filterType === 'invoice' && inv.type !== 'invoice') return;
        if (filterType === 'quotation' && inv.type !== 'quotation') return;
        if (filterFirm === 'sgs' && inv.billingFirm === 'pandiyan') return;
        if (filterFirm === 'pandiyan' && inv.billingFirm !== 'pandiyan') return;
        if (filterStatus !== 'all' && inv.paymentStatus !== filterStatus) return;

        results.push({
          id: inv.id,
          date: inv.date,
          docNum: inv.invoiceNumber,
          type: inv.type === 'invoice' ? 'Invoice' : 'Quotation',
          firm: inv.billingFirm === 'pandiyan' ? 'Pandiyan' : 'SGS',
          partyName: inv.customerName,
          phone: inv.customerPhone,
          details: inv.items.map(i => i.description.split('\n')[0]).join(', '),
          taxable: inv.subtotal || 0,
          taxAmount: inv.taxAmount || 0,
          total: inv.grandTotal,
          paymentStatus: inv.paymentStatus,
          paymentMode: inv.paymentMode,
          reference: inv.paymentReference || ''
        });
      });
    }

    // 2. Vendor Bills
    if (filterType === 'all' || filterType === 'vendor_bill') {
      if (filterFirm === 'all' || filterFirm === 'sgs') {
        vendorBills.forEach(bill => {
          if (filterStatus !== 'all' && bill.paymentStatus !== filterStatus) return;
          const billDate = bill.invoiceDate || bill.createdAt.split('T')[0];
          results.push({
            id: bill.id,
            date: billDate,
            docNum: bill.invoiceNumber,
            type: 'Vendor Bill',
            firm: 'Vendor',
            partyName: bill.vendorName,
            phone: '',
            details: (bill.items || []).map(i => i.itemName).join(', ') || 'Workshop Spares',
            taxable: bill.subtotal || (bill.totalAmount - (bill.taxAmount || 0)),
            taxAmount: bill.taxAmount || 0,
            total: bill.totalAmount,
            paymentStatus: bill.paymentStatus,
            paymentMode: bill.paymentMode || 'upi',
            reference: bill.paymentReference || ''
          });
        });
      }
    }

    // 3. Cash Flow Entries
    if (filterType === 'cashflow') {
      cashFlow.forEach(cf => {
        results.push({
          id: cf.id,
          date: cf.date,
          docNum: cf.referenceNumber || cf.referenceId || 'CASH-REC',
          type: cf.type === 'income' ? 'Income' : 'Expense',
          firm: 'SGS',
          partyName: cf.category,
          phone: '',
          details: cf.description,
          taxable: cf.amount,
          taxAmount: 0,
          total: cf.amount,
          paymentStatus: 'paid',
          paymentMode: cf.paymentMode,
          reference: cf.referenceNumber || ''
        });
      });
    }

    // Date Filtering
    const now = new Date();
    const thisMonthStr = now.toISOString().substring(0, 7);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = lastMonthDate.toISOString().substring(0, 7);

    let filtered = results.filter(r => {
      if (dateRange === 'this_month') {
        return r.date.startsWith(thisMonthStr);
      } else if (dateRange === 'last_month') {
        return r.date.startsWith(lastMonthStr);
      } else if (dateRange === 'custom') {
        if (customStartDate && r.date < customStartDate) return false;
        if (customEndDate && r.date > customEndDate) return false;
        return true;
      }
      return true;
    });

    // Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.docNum.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.reference.toLowerCase().includes(q)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount_desc') return b.total - a.total;
      if (sortBy === 'amount_asc') return a.total - b.total;
      return 0;
    });

    return filtered;
  }, [invoices, vendorBills, cashFlow, filterFirm, filterType, filterStatus, dateRange, customStartDate, customEndDate, searchQuery, sortBy]);

  // Download All Details to Excel
  const handleDownloadMasterExcel = () => {
    const headers = [
      'Sl No',
      'Date',
      'Document Number',
      'Record Type',
      'Firm / Entity',
      'Party Name (Customer / Vendor)',
      'Phone',
      'Details / Line Items',
      'Taxable Value (₹)',
      'Tax Amount (₹)',
      'Total Amount (₹)',
      'Payment Status',
      'Payment Mode',
      'Payment Reference'
    ];

    const rows = masterFilteredRecords.map((r, i) => [
      String(i + 1),
      r.date,
      r.docNum,
      r.type,
      r.firm,
      `"${r.partyName.replace(/"/g, '""')}"`,
      r.phone,
      `"${r.details.replace(/"/g, '""')}"`,
      String(r.taxable),
      String(r.taxAmount),
      String(r.total),
      r.paymentStatus.toUpperCase(),
      r.paymentMode.toUpperCase(),
      r.reference
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      headers.join(',') + '\n' + 
      rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  GST Reports & Filing Center
                </h1>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Official GSTR-1, GSTR-2 GST Portal JSON / Excel Exports, and Master Account Reports
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Tax Period:</span>
              <input 
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`bg-transparent font-bold focus:outline-none cursor-pointer ${
                  isDark ? 'text-blue-400' : 'text-blue-700'
                }`}
              />
            </div>

            <a
              href="https://services.gst.gov.in/services/login"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all"
            >
              <span>Open GST Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveReportTab('gstr1')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'gstr1'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>GSTR-1 (Outward Sales Return)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeReportTab === 'gstr1' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {gstr1Invoices.length} Invoices
            </span>
          </button>

          <button
            onClick={() => setActiveReportTab('gstr2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'gstr2'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>GSTR-2 (Inward Vendor ITC)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeReportTab === 'gstr2' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {gstr2Bills.length} Bills
            </span>
          </button>

          <button
            onClick={() => setActiveReportTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Master All Details (Filter, Sort & Excel)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeReportTab === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {masterFilteredRecords.length} Rows
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: GSTR-1 */}
      {activeReportTab === 'gstr1' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Period Invoices</span>
              <p className="text-xl font-bold font-mono text-blue-600 mt-1">{gstr1Stats.count}</p>
              <span className="text-[10px] text-slate-400">Month: {selectedMonth}</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Taxable Value</span>
              <p className={`text-xl font-bold font-mono mt-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                ₹{gstr1Stats.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Before GST</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Central Tax (CGST 9%)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                ₹{gstr1Stats.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">50% of 18% GST</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>State Tax (SGST 9%)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                ₹{gstr1Stats.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">50% of 18% GST</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gross Invoice Value</span>
              <p className="text-xl font-bold font-mono text-indigo-600 mt-1">
                ₹{gstr1Stats.totalInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Taxable + Total GST</span>
            </div>
          </div>

          {/* Download & GST Portal Actions Box */}
          <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isDark ? 'bg-blue-950/20 border-blue-900/60' : 'bg-blue-50/70 border-blue-200'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  GSTR-1 GST Portal Offline Tool JSON & Excel Ready
                </h3>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Format strictly validated according to GST Portal Offline Tool v1.0 standard (GSTIN: <span className="font-mono font-bold">{adminSettings.workshopGstin || '33AANCS7890Q1Z8'}</span>, Return Period: <span className="font-mono font-bold">{fpMonth}</span>).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadGstr1Json}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download GSTR-1 JSON</span>
              </button>

              <button
                onClick={handleCopyGstr1Json}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                  copySuccess 
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : (isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')
                }`}
              >
                {copySuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'Copied!' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleDownloadGstr1Excel}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel (.csv)</span>
              </button>
            </div>
          </div>

          {/* GSTR-1 Invoices Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Period Outward Supplies (Tax Invoices)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Showing {gstr1Invoices.length} Tax Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] font-semibold uppercase ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">HSN Codes</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">CGST 9% (₹)</th>
                    <th className="py-3 px-4 text-right">SGST 9% (₹)</th>
                    <th className="py-3 px-4 text-right">Total Invoice (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                  {gstr1Invoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                        No outward tax invoices found for {selectedMonth}. Create an invoice or select another month.
                      </td>
                    </tr>
                  ) : (
                    gstr1Invoices.map((inv, idx) => {
                      const cgst = (inv.taxAmount || 0) / 2;
                      const sgst = (inv.taxAmount || 0) / 2;
                      return (
                        <tr key={`${inv.id}-${idx}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-500">{inv.date}</td>
                          <td className="py-3 px-4 font-semibold">
                            {inv.customerName}
                            {inv.customerPhone && <span className="block text-[10px] text-slate-400 font-mono">{inv.customerPhone}</span>}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {inv.items.map(i => i.hsnCode || '998713').join(', ')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">
                            ₹{inv.subtotal.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">
                            ₹{cgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">
                            ₹{sgst.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            ₹{inv.grandTotal.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              inv.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                            }`}>
                              {inv.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GSTR-2 (Inward Supplies / Vendor ITC) */}
      {activeReportTab === 'gstr2' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vendor Inward Bills</span>
              <p className="text-xl font-bold font-mono text-blue-600 mt-1">{gstr2Stats.count}</p>
              <span className="text-[10px] text-slate-400">Month: {selectedMonth}</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Taxable Purchase Value</span>
              <p className={`text-xl font-bold font-mono mt-1 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                ₹{gstr2Stats.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Net Spares & Consumables</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Input GST Credit (ITC)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                ₹{gstr2Stats.totalInputGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">CGST ₹{gstr2Stats.totalCgst} | SGST ₹{gstr2Stats.totalSgst}</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gross Vendor Payouts</span>
              <p className="text-xl font-bold font-mono text-purple-600 mt-1">
                ₹{gstr2Stats.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Inclusive of Taxes</span>
            </div>
          </div>

          {/* Download & Actions Box */}
          <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isDark ? 'bg-indigo-950/20 border-indigo-900/60' : 'bg-indigo-50/70 border-indigo-200'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  GSTR-2 Inward ITC Data Ready for Portal Reconciliation
                </h3>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Reconcile your Input Tax Credit directly with GSTR-2B. Claim eligible hardware ITC against your outward GST liabilities.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadGstr2Json}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download GSTR-2 JSON</span>
              </button>

              <button
                onClick={handleDownloadGstr2Excel}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 cursor-pointer transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel (.csv)</span>
              </button>
            </div>
          </div>

          {/* Vendor Bills Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Period Inward Purchases & Bills
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Showing {gstr2Bills.length} Inward Bills
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] font-semibold uppercase ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Bill #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Vendor Supplier</th>
                    <th className="py-3 px-4">Spares / Items</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">Input CGST (₹)</th>
                    <th className="py-3 px-4 text-right">Input SGST (₹)</th>
                    <th className="py-3 px-4 text-right">Gross Bill Total (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                  {gstr2Bills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                        No inward vendor bills found for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    gstr2Bills.map((b, idx) => {
                      const tax = b.taxAmount || 0;
                      const cgst = tax / 2;
                      const sgst = tax / 2;
                      const taxable = b.subtotal || (b.totalAmount - tax);
                      return (
                        <tr key={`${b.id}-${idx}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600">{b.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-500">{b.invoiceDate || b.createdAt.split('T')[0]}</td>
                          <td className="py-3 px-4 font-semibold">{b.vendorName}</td>
                          <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                            {(b.items || []).map(i => i.itemName).join(', ') || 'Hardware spares'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">₹{taxable.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">₹{cgst.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">₹{sgst.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold">₹{b.totalAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              b.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                            }`}>
                              {b.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MASTER ALL DETAILS REPORT */}
      {activeReportTab === 'all' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by customer, vendor, invoice #, phone, item description, or UPI ref..."
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Action: Download Excel */}
              <button
                onClick={handleDownloadMasterExcel}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer transition-all whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Export Filtered to Excel (.csv)</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              
              {/* Firm */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Firm / Entity
                </label>
                <select
                  value={filterFirm}
                  onChange={(e) => setFilterFirm(e.target.value as any)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">All Entities</option>
                  <option value="sgs">Spider Grid (GST)</option>
                  <option value="pandiyan">Pandiyan (Non-GST)</option>
                </select>
              </div>

              {/* Record Type */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Record Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">All Documents</option>
                  <option value="invoice">Invoices</option>
                  <option value="quotation">Quotations</option>
                  <option value="vendor_bill">Vendor Bills</option>
                  <option value="cashflow">Cash Flow Transactions</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Payment Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid / Pending</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">All Dates</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="amount_desc">Amount (Highest First)</option>
                  <option value="amount_asc">Amount (Lowest First)</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range Row */}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Master Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] font-semibold uppercase ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Doc #</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Firm</th>
                    <th className="py-3 px-4">Party / Customer</th>
                    <th className="py-3 px-4">Items / Details</th>
                    <th className="py-3 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3 px-3 text-right">Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                  {masterFilteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-500 text-xs">
                        No records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    masterFilteredRecords.map((r, i) => (
                      <tr key={`${r.id}-${i}`} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">{i + 1}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono">{r.date}</td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-600">{r.docNum}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.type === 'Invoice' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            r.type === 'Quotation' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            r.type === 'Vendor Bill' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            r.type === 'Income' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[11px]">{r.firm}</td>
                        <td className="py-3 px-4 font-semibold">
                          {r.partyName}
                          {r.phone && <span className="block text-[10px] font-mono text-slate-400">{r.phone}</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">{r.details}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{r.taxable.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600">₹{r.taxAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">₹{r.total.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            r.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                          }`}>
                            {r.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
