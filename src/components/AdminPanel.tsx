import React, { useState, useEffect, FormEvent } from 'react';
import { 
  BarChart3, LayoutDashboard, ShoppingCart, Coffee, TableProperties, 
  TrendingUp, Activity, Users, Plus, Check, Edit2, Play, Flame, CheckCircle, 
  Trash2, XCircle, Download, FileText, PieChart, Star, RefreshCw, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from './AuthContext';
import { OrderStatus, MenuItem, Category, Table, OrderWithItems, Feedback, Member, EmailLog, UserRole } from '../types';

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'orders' | 'menus' | 'tables' | 'reports' | 'feedback' | 'members' | 'emails'>('dashboard');

  // Authorized shadow fetch to secure network requests from hackers
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = {
      ...(init?.headers || {}),
      'x-user-email': user?.email || '',
      'x-user-role': user?.role || ''
    };
    return window.fetch(input, { ...init, headers });
  };

  // Tab Role Permissions Guard Checklist
  const hasAccessToTab = (tab: typeof activeTab) => {
    if (!user) return false;
    const role = user.role;
    if (role === UserRole.OWNER) return true; // Owner can bypass all restrictions
    
    switch (tab) {
      case 'dashboard':
        return [UserRole.ADMIN, UserRole.KASIR].includes(role);
      case 'orders':
        return [UserRole.ADMIN, UserRole.KASIR, UserRole.DAPUR].includes(role);
      case 'menus':
        return [UserRole.ADMIN].includes(role);
      case 'tables':
        return [UserRole.ADMIN].includes(role);
      case 'reports':
        return [UserRole.ADMIN].includes(role);
      case 'feedback':
        return [UserRole.ADMIN].includes(role);
      case 'emails':
        return [UserRole.ADMIN].includes(role);
      case 'members':
        return false; // Only OWNER can view members management
      default:
        return false;
    }
  };

  // Redirect to an authorized tab if the current activeTab is not permitted for the user's role
  useEffect(() => {
    if (user) {
      const allowedTabs: typeof activeTab[] = [
        'dashboard', 'orders', 'menus', 'tables', 'reports', 'feedback', 'members', 'emails'
      ];
      const currentAllowed = allowedTabs.filter(tab => hasAccessToTab(tab));
      if (currentAllowed.length > 0 && !hasAccessToTab(activeTab)) {
        setActiveTab(currentAllowed[0]);
      }
    }
  }, [user, activeTab]);
  
  // Dashboard & Reports Metrics
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalSalesToday: 0,
    activeOrdersCount: 0,
    filledTablesCount: 0,
    totalTables: 0
  });

  const [reportsData, setReportsData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    salesByCategory: {} as Record<string, number>,
    popularItems: [] as { name: string; count: number; revenue: number }[]
  });

  // State arrays fetched from DB
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters for order listing
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderTableFilter, setOrderTableFilter] = useState<string>('ALL');

  // Menu Creation/Editing ModalState
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 0,
    image: '',
    categoryId: 1
  });

  // Table Creation State
  const [newTableNum, setNewTableNum] = useState<string>('');

  // Category CRUD states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormName, setCategoryFormName] = useState('');

  // Owner Members Management State
  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: UserRole.KASIR });
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  // Email outbox and HTML preview state
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setMemberError(null);
    setMemberSuccess(null);
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      setMemberError('Semua kolom nama & e-mail wajib diisi!');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambahkan anggota.');
      }
      const newMember = await res.json();
      setMembers(prev => [...prev, newMember]);
      setMemberSuccess(`Anggota "${newMember.name}" berhasil ditambahkan ke tim!`);
      setMemberForm({ name: '', email: '', role: UserRole.KASIR });
    } catch (err: any) {
      setMemberError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus hak akses staff untuk "${name}"?`)) {
      return;
    }
    setMemberError(null);
    setMemberSuccess(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menghapus anggota.');
      }
      setMembers(prev => prev.filter(m => m.id !== id));
      setMemberSuccess(`Hak akses untuk "${name}" telah berhasil dicabut.`);
    } catch (err: any) {
      setMemberError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendEmail = async (orderId: string, recipient: string) => {
    setEmailSuccess(null);
    setEmailError(null);
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/emails/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengirim ulang e-receipt.');
      }
      setEmailSuccess(`E-Receipt berhasil dikonfigurasi dan dikirim ulang ke ${recipient}.`);
      fetchEmails();
    } catch (err: any) {
      setEmailError(err.message || 'Pembatasan jaringan SMTP.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardMetrics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReportsData = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMenuData = async () => {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setMenuItems(data.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (e) {
      console.error('Failed to fetch feedback:', e);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/admin/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (e) {
      console.error('Failed to fetch members:', e);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/admin/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.error('Failed to fetch email outbox logs:', e);
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboardMetrics(),
      fetchReportsData(),
      fetchOrders(),
      fetchTables(),
      fetchMenuData(),
      fetchFeedbacks(),
      fetchMembers(),
      fetchEmails()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAllData();

    // SSE implementation for live notification sync
    const sse = new EventSource('/api/sse/orders');
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE notification received in BackOffice:', data.type);
        // Silently reload tables/orders without flickering the loaded screens
        fetchDashboardMetrics();
        fetchReportsData();
        fetchOrders();
        fetchMembers();
        fetchEmails();
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p);
  };

  // Change order status action
  const changeStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await Promise.all([fetchOrders(), fetchDashboardMetrics(), fetchReportsData()]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Table Table
  const addNewTable = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTableNum || isNaN(Number(newTableNum))) {
      alert('Masukkan nomor meja berupa angka.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: Number(newTableNum) })
      });
      if (res.ok) {
        setNewTableNum('');
        await fetchTables();
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Gagal menambahkan meja');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Export financial report to PDF utilizing jsPDF & jspdf-autotable
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [16, 185, 129]; // #10b981 (Emerald / Brand color)
      const darkColor = [31, 41, 55]; // Gray 800

      // Helvetica Font configuration
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      
      // Header Banner
      doc.setFillColor(15, 23, 42); // Slate-900 background banner
      doc.rect(0, 0, 210, 42, 'F'); 

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(17);
      doc.text('BACK OFFICE LAPORAN KEUANGAN RESTO', 15, 16);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('SISTEM REKAPITULASI PENJUALAN LAPORAN KASIR', 15, 23);

      // Metainfo on Header
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // Gray-400
      const dateString = new Date().toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      });
      doc.text(`Dicetak pada: ${dateString}`, 15, 30);
      if (user) {
        doc.text(`Petugas: ${user.displayName} (${user.role})`, 195, 30, { align: 'right' });
      }

      // Restore text color
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

      // 1. SECTION: RINGKASAN FINANSIAL
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. Ringkasan Kinerja Penjualan', 15, 52);
      
      // Draw grid line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.4);
      doc.line(15, 55, 195, 55);

      // Data Overview Cells
      // Card 1
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(15, 60, 56, 24, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // Gray 500
      doc.text('TOTAL OMSET', 18, 66);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); // Brand colors for revenue!
      doc.text(formatPrice(reportsData.totalSales), 18, 76);

      // Card 2
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(77, 60, 56, 24, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('TOTAL TRANSAKSI LUNAS', 80, 66);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`${reportsData.totalTransactions} Transaksi`, 80, 76);

      // Card 3
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(139, 60, 56, 24, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('RATA-RATA BELANJA', 142, 66);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(formatPrice(reportsData.averageTransaction), 142, 76);

      // Reset text color
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

      // 2. SECTION: PENJUALAN PER KATEGORI (TABLE)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. Distribusi Omset Berdasarkan Kategori', 15, 96);
      
      // Draw line
      doc.line(15, 99, 195, 99);

      const categoryRows = Object.entries(reportsData.salesByCategory).map(([catName, val]) => {
        const percent = reportsData.totalSales > 0 ? (Number(val) / reportsData.totalSales) * 100 : 0;
        return [catName, formatPrice(Number(val)), `${percent.toFixed(1)}%`];
      });

      autoTable(doc, {
        startY: 103,
        margin: { left: 15, right: 15 },
        head: [['Nama Kategori', 'Total Omset', 'Kontribusi Persentase']],
        body: categoryRows.length > 0 ? categoryRows : [['Belum ada data', '-', '-']],
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { font: 'helvetica', fontSize: 9 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      // get final Y position of category table to position next section dynamically
      const finalYOfCategory = (doc as any).lastAutoTable.finalY + 12;

      // 3. SECTION: POPULAR ITEMS (TABLE)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. Daftar Top 5 Hidangan Terlaris', 15, finalYOfCategory);
      doc.line(15, finalYOfCategory + 3, 195, finalYOfCategory + 3);

      const popularRows = reportsData.popularItems.map((item, idx) => [
        (idx + 1).toString(),
        item.name,
        `${item.count} Porsi`,
        formatPrice(item.revenue)
      ]);

      autoTable(doc, {
        startY: finalYOfCategory + 7,
        margin: { left: 15, right: 15 },
        head: [['Peringkat', 'Nama Menu / Hidangan', 'Jumlah Terjual', 'Estimasi Total Pendapatan']],
        body: popularRows.length > 0 ? popularRows : [['-', 'Belum ada data transaksi', '-', '-']],
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { font: 'helvetica', fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 50, halign: 'right' }
        },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      const finalYOfPopular = (doc as any).lastAutoTable.finalY + 15;

      // Draw footer disclaimer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Dokumen ini digenerate secara langsung dan sah melalui platform client-side QR Resto & Cafe Back Office.', 15, finalYOfPopular);
      doc.text('Laporan ini tidak termasuk Pajak Pembangunan 10% terpisah di kasir restoran.', 15, finalYOfPopular + 4);

      // Signatory block
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text('Menyetujui,', 155, finalYOfPopular + 12);
      doc.text('Manajer Restoran / Owner', 155, finalYOfPopular + 30);
      doc.setDrawColor(209, 213, 219);
      doc.line(150, finalYOfPopular + 27, 195, finalYOfPopular + 27);

      // Save document!
      doc.save(`Laporan_Keuangan_Kasir_QRResto_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Gagal mendownload PDF. Ada kesalahan teknis saat menggenerasi file.');
    }
  };

  // Create or update Category
  const saveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) {
      alert('Nama kategori wajib diisi.');
      return;
    }
    setActionLoading(true);
    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : `/api/admin/categories`;
      const method = editingCategory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryFormName })
      });

      if (res.ok) {
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        setCategoryFormName('');
        await fetchMenuData(); // Reload menu categories
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan kategori');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Category
  const deleteCategory = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchMenuData();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus kategori. Pastikan tidak ada menu yang berasosiasi dengan kategori ini terlebih dahulu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Table active/inactive status
  const toggleTableActive = async (tbl: Table) => {
    try {
      const res = await fetch(`/api/admin/tables/${tbl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tbl.isActive })
      });
      if (res.ok) {
        await fetchTables();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Table from Resto DB
  const deleteTable = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus meja ini beserta QR Code-nya?')) return;
    try {
      const res = await fetch(`/api/admin/tables/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchTables();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus meja');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle MenuItem availability
  const toggleMenuAvailable = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable })
      });
      if (res.ok) {
        await fetchMenuData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create or Update Menu Item
  const saveMenuItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) {
      alert('Nama dan harga menu wajib diisi.');
      return;
    }

    setActionLoading(true);
    try {
      const url = editingMenuItem 
        ? `/api/admin/menu/${editingMenuItem.id}` 
        : `/api/admin/menu`;
      const method = editingMenuItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuForm)
      });

      if (res.ok) {
        setIsMenuModalOpen(false);
        setEditingMenuItem(null);
        setMenuForm({ name: '', description: '', price: 0, image: '', categoryId: 1 });
        await fetchMenuData();
      } else {
        alert('Gagal menyimpan menu item');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Menu Item
  const deleteMenuItem = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus menu ini dari database?')) return;
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchMenuData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter orders according to selection UI
  const filteredOrders = orders.filter(o => {
    const sMatch = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    const tMatch = orderTableFilter === 'ALL' || o.tableNumber === Number(orderTableFilter);
    return sMatch && tMatch;
  });

  return (
    <div className="h-screen w-full overflow-hidden bg-darkest flex flex-col md:flex-row text-[#E0E0E0] font-sans">
      
      {/* Sidebar Layout */}
      <aside className="w-full md:w-64 bg-[#0A0A0A] text-slate-300 flex flex-col shrink-0 border-r border-white/5 shadow-md h-auto md:h-full overflow-y-auto">
        <div className="p-6 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 bg-brand rounded-xl flex items-center justify-center text-black shadow-md">
              <TableProperties className="h-4.5 w-4.5 text-black" />
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-wide">Back Office QR</span>
              <span className="text-[10px] text-white/40 block font-semibold leading-tight uppercase">Admin/Kasir Portal</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Buttons */}
        <nav className="flex-1 px-4 py-6 space-y-2 pb-12">
          {hasAccessToTab('dashboard') && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Dashboard Ringkasan</span>
            </button>
          )}

          {hasAccessToTab('orders') && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              <span>Pesanan & Kasir</span>
            </button>
          )}

          {hasAccessToTab('menus') && (
            <button
              onClick={() => setActiveTab('menus')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'menus'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <Coffee className="h-4.5 w-4.5" />
              <span>Katalog Menu</span>
            </button>
          )}

          {hasAccessToTab('tables') && (
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <TableProperties className="h-4.5 w-4.5" />
              <span>Kelola Meja QR</span>
            </button>
          )}

          {hasAccessToTab('reports') && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5" />
              <span>Laporan Keuangan</span>
            </button>
          )}

          {hasAccessToTab('feedback') && (
            <button
              onClick={() => setActiveTab('feedback')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <Star className="h-4.5 w-4.5" />
              <span>Ulasan Pelanggan</span>
            </button>
          )}

          {hasAccessToTab('members') && (
            <button
              onClick={() => setActiveTab('members')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Kelola Anggota</span>
            </button>
          )}

          {hasAccessToTab('emails') && (
            <button
              onClick={() => setActiveTab('emails')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-extrabold flex items-center space-x-3 transition-all cursor-pointer ${
                activeTab === 'emails'
                  ? 'bg-brand text-black shadow-lg shadow-brand/10'
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <Mail className="h-4.5 w-4.5" />
              <span>Outbox E-Receipt</span>
            </button>
          )}
        </nav>

        {/* Sync Trigger block */}
        <div className="p-4 border-t border-white/5 bg-[#050505]/40 flex flex-col items-center">
          <button 
            onClick={refreshAllData}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all border border-white/10 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Sinkronisasi Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col overflow-hidden h-full">
        
        {/* Upper Dashboard Navigation bar */}
        <header className="bg-[#0A0A0A] border-b border-white/10 px-8 py-5 flex items-center justify-between shadow-sm shrink-0">
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'orders' && 'Manajemen Transaksi Kasir'}
              {activeTab === 'menus' && 'Katalog Makanan & Minuman'}
              {activeTab === 'tables' && 'Daftar Meja Cafe QR'}
              {activeTab === 'reports' && 'Laporan Penjualan Toko'}
              {activeTab === 'feedback' && 'Ulasan & Feedback Pelanggan'}
              {activeTab === 'members' && 'Kelola Anggota Staff Kafe'}
              {activeTab === 'emails' && 'Log Outbox E-Receipt'}
            </h2>
            <span className="text-[10px] text-white/40 font-bold block leading-none mt-1">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <button
            onClick={refreshAllData}
            disabled={loading}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Muat data terbaru secara instan"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin text-brand' : ''}`} />
          </button>
        </header>

        {/* Content Tabs Switch */}
        <div className="p-8 flex-1 max-w-7xl w-full mx-auto overflow-y-auto pb-24">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <RefreshCw className="h-8 w-8 text-brand animate-spin" />
              <span className="text-xs text-white/40 font-bold mt-2.5">Sinkronisasi metadata toko...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              
              {/* TAB 1: DASHBOARD OUTLOOK */}
              {activeTab === 'dashboard' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-8"
                >
                  {/* Bento Statistics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] hover:border-brand/30 transition-colors flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block">Penjualan Hari Ini</span>
                        <h4 className="text-lg font-black text-white leading-tight mt-1 font-mono">{formatPrice(dashboardMetrics.totalSalesToday)}</h4>
                      </div>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] hover:border-brand/30 transition-colors flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                        <Activity className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block">Pesanan Diproses</span>
                        <h4 className="text-lg font-black text-white leading-tight mt-1 font-mono">{dashboardMetrics.activeOrdersCount} Antrean</h4>
                      </div>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] hover:border-brand/30 transition-colors flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block">Okupansi Meja</span>
                        <h4 className="text-lg font-black text-white leading-tight mt-1 font-mono">Meja {dashboardMetrics.filledTablesCount} / {dashboardMetrics.totalTables}</h4>
                      </div>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 font-black tracking-wider uppercase block">Status Sistem</span>
                        <span className="text-xs font-black text-brand leading-tight bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20 flex items-center gap-1 mt-1.5 uppercase tracking-wide">
                          ● Online
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Operational Status */}
                  <div className="bg-[#0E0E0E] rounded-xl shadow-sm border border-white/[0.04] p-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">Panduan Cepat Simulasi Pemesanan QR</h3>
                    <p className="text-xs text-white/50 leading-relaxed mt-2">
                      Sistem menggunakan file database local <code className="bg-white/5 text-brand font-mono px-1.5 py-0.5 rounded border border-white/5 text-[10px]">db.json</code> untuk persistensi data secara instan.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                      <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
                        <span className="text-[10px] bg-brand text-black font-black px-2.5 py-0.5 rounded-full uppercase absolute right-4 top-4">Step 1</span>
                        <h4 className="text-xs font-black text-white">Buka Menu sebagai Customer</h4>
                        <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
                          Pilih tab <b>"Kelola Meja QR"</b>, klik Meja 1 dan scan atau klik linknya untuk membuka Digital Menu.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
                        <span className="text-[10px] bg-brand text-black font-black px-2.5 py-0.5 rounded-full uppercase absolute right-4 top-4">Step 2</span>
                        <h4 className="text-xs font-black text-white">Checkout & Masuk KDS</h4>
                        <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
                          Pesan hidangan di HP, klik bayar, lalu gunakan tombol <b>"Simulasi Bayar Berhasil"</b> untuk bypass Midtrans Token sandbox.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
                        <span className="text-[10px] bg-brand text-black font-black px-2.5 py-0.5 rounded-full uppercase absolute right-4 top-4">Step 3</span>
                        <h4 className="text-xs font-black text-white">Aksi Dapur Real-time</h4>
                        <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
                          Buka tab <b>Kitchen Display (/kitchen)</b> di window browser lain atau tab terpisah. Pesanan akan langsung dimasak bergantian dengan alarm berdering!
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ORDER & TRANSACTION CONTROL */}
              {activeTab === 'orders' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Filters Bar */}
                  <div className="bg-[#0E0E0E] rounded-xl p-4 shadow-sm border border-white/[0.04] flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="space-y-1">
                        <span className="text-[9px] text-white/40 font-bold block uppercase font-sans">Filter Status</span>
                        <select
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:bg-[#0E0E0E] focus:border-brand"
                          value={orderStatusFilter}
                          onChange={(e) => setOrderStatusFilter(e.target.value)}
                        >
                          <option value="ALL" className="bg-[#050505]">Semua Status</option>
                          <option value={OrderStatus.PENDING_PAYMENT} className="bg-[#050505]">Menunggu Pembayaran</option>
                          <option value={OrderStatus.PAID} className="bg-[#050505]">Pembayaran Baru</option>
                          <option value={OrderStatus.PREPARING} className="bg-[#050505]">Sedang Diproses</option>
                          <option value={OrderStatus.READY} className="bg-[#050505]">Siap Saji</option>
                          <option value={OrderStatus.SERVED} className="bg-[#050505]">Sudah Disajikan</option>
                          <option value={OrderStatus.CANCELLED} className="bg-[#050505]">Batal</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] text-white/40 font-bold block uppercase font-sans">Filter Meja</span>
                        <select
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:bg-[#0E0E0E] focus:border-brand"
                          value={orderTableFilter}
                          onChange={(e) => setOrderTableFilter(e.target.value)}
                        >
                          <option value="ALL" className="bg-[#050505]">Semua Meja</option>
                          {tables.map(t => (
                            <option key={t.id} value={t.number.toString()} className="bg-[#050505]">Meja {t.number}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-white/40">
                      Menampilkan <b className="text-white font-mono">{filteredOrders.length}</b> transaksi aktif
                    </span>
                  </div>

                  {/* Transactions table */}
                  <div className="bg-[#0E0E0E] rounded-xl shadow-sm border border-white/[0.04] overflow-hidden">
                    <div className="overflow-x-auto min-w-full">
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.01] border-b border-white/5 text-[10px] text-white/40 uppercase font-black tracking-wider">
                            <th className="px-6 py-4">Nomor Order</th>
                            <th className="px-6 py-4">Meja</th>
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Items Terbeli</th>
                            <th className="px-6 py-4">Jumlah Bill</th>
                            <th className="px-6 py-4">Status & Alur</th>
                            <th className="px-6 py-4 text-right">Opsi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-white/80">
                          {filteredOrders.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-white/30 font-bold">
                                Tidak ada transaksi yang sesuai filter
                              </td>
                            </tr>
                          ) : (
                            filteredOrders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-white/[0.01] transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-brand">
                                  {ord.id.split('-')[2] || ord.id.slice(-6)}
                                </td>
                                <td className="px-6 py-4 font-extrabold text-white">
                                  Meja {ord.tableNumber || '?'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-extrabold text-white block">{ord.customerName}</span>
                                  {ord.note && (
                                    <span className="text-[10px] text-brand font-semibold italic mt-0.5 block max-w-[150px] truncate">
                                      "{ord.note}"
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    {ord.items.map((item, id) => (
                                      <div key={id} className="flex items-center space-x-1.5 text-white/50 font-semibold text-[11px]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-white/20 shrink-0" />
                                        <span className="truncate max-w-[160px]">{item.menuItem?.name || 'Item Pilihan'}</span>
                                        <span className="text-white font-bold font-mono">({item.quantity}x)</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-black text-white font-mono">
                                  {formatPrice(ord.totalAmount)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide inline-block ${
                                    ord.status === OrderStatus.PENDING_PAYMENT ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    ord.status === OrderStatus.PAID ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    ord.status === OrderStatus.PREPARING ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse' :
                                    ord.status === OrderStatus.READY ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                    ord.status === OrderStatus.SERVED ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {ord.status === OrderStatus.PENDING_PAYMENT && 'Menunggu Bayar'}
                                    {ord.status === OrderStatus.PAID && 'Terbayar (Antrean)'}
                                    {ord.status === OrderStatus.PREPARING && 'Sedang Dimasak'}
                                    {ord.status === OrderStatus.READY && 'Siap Saji'}
                                    {ord.status === OrderStatus.SERVED && 'Hidangan Selesai'}
                                    {ord.status === OrderStatus.CANCELLED && 'Batal'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    
                                    {/* Action switcher based on status */}
                                    {ord.status === OrderStatus.PENDING_PAYMENT && (
                                      <button
                                        onClick={() => changeStatus(ord.id, OrderStatus.PAID)}
                                        className="px-2 py-1 bg-brand hover:bg-brand/90 text-black font-black text-[10px] rounded flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                        title="Bypass Lunas (Simulasi pembayaran kasir langsung)"
                                      >
                                        <Check className="h-3 w-3 text-black" />
                                        <span>Lunas</span>
                                      </button>
                                    )}

                                    {ord.status === OrderStatus.PAID && (
                                      <button
                                        onClick={() => changeStatus(ord.id, OrderStatus.PREPARING)}
                                        className="px-2 py-1 bg-brand hover:bg-brand/90 text-black font-black text-[10px] rounded flex items-center gap-1 shadow-sm cursor-pointer"
                                      >
                                        <Flame className="h-3 w-3" />
                                        <span>Masak</span>
                                      </button>
                                    )}

                                    {ord.status === OrderStatus.PREPARING && (
                                      <button
                                        onClick={() => changeStatus(ord.id, OrderStatus.READY)}
                                        className="px-2 py-1 bg-[#1A1A3A] border border-indigo-500/30 text-indigo-300 hover:bg-[#20204A] font-black text-[10px] rounded flex items-center gap-1 shadow-sm cursor-pointer"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Siap</span>
                                      </button>
                                    )}

                                    {ord.status === OrderStatus.READY && (
                                      <button
                                        onClick={() => changeStatus(ord.id, OrderStatus.SERVED)}
                                        className="px-2 py-1 bg-brand hover:bg-brand/95 text-black font-black text-[10px] rounded flex items-center gap-1 shadow-sm cursor-pointer"
                                      >
                                        <Check className="h-3 w-3 text-black" />
                                        <span>Sajikan</span>
                                      </button>
                                    )}

                                    {ord.status !== OrderStatus.SERVED && ord.status !== OrderStatus.CANCELLED && (
                                      <button
                                        onClick={() => changeStatus(ord.id, OrderStatus.CANCELLED)}
                                        className="p-1 px-1.5 text-rose-450 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
                                        title="Batalkan Pesanan"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                    )}

                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: MENU CRUD CATALOG */}
              {activeTab === 'menus' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <span className="text-xs font-black text-white/45 uppercase tracking-wide">Daftar Menu Hidangan Restoran ({menuItems.length} Produk)</span>
                    <button
                      onClick={() => {
                        setEditingMenuItem(null);
                        setMenuForm({ name: '', description: '', price: 15000, image: '', categoryId: 1 });
                        setIsMenuModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-brand text-black hover:scale-[1.02] active:scale-95 transition-transform font-black text-xs rounded-xl flex items-center space-x-1.5 shadow-md shadow-brand/10 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Menu Baru</span>
                    </button>
                  </div>

                  {/* Menu items list table */}
                  <div className="bg-[#0E0E0E] rounded-xl shadow-sm border border-white/[0.04] overflow-hidden">
                    <div className="overflow-x-auto min-w-full">
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.01] border-b border-white/5 text-[10px] text-white/40 uppercase font-black tracking-wider">
                            <th className="px-6 py-4">Foto</th>
                            <th className="px-6 py-4">Nama Menu</th>
                            <th className="px-6 py-4">Kategori</th>
                            <th className="px-6 py-4">Harga Jual</th>
                            <th className="px-6 py-4">Status Stok</th>
                            <th className="px-6 py-4 text-right">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-white/80">
                          {menuItems.map((item) => {
                            const cat = categories.find(c => c.id === item.categoryId);
                            return (
                              <tr key={item.id} className="hover:bg-white/[0.01]">
                                <td className="px-6 py-4 shrink-0">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    referrerPolicy="no-referrer"
                                    className="w-12 h-12 rounded-xl object-cover border border-white/5 shadow-md"
                                  />
                                </td>
                                <td className="px-6 py-4 max-w-sm">
                                  <span className="font-extrabold text-white block">{item.name}</span>
                                  {item.description && (
                                    <span className="text-[10px] text-white/40 block mt-0.5 line-clamp-1">{item.description}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-bold text-white/60">
                                  {cat ? cat.name : 'Unknown'}
                                </td>
                                <td className="px-6 py-4 font-black text-white font-mono">
                                  {formatPrice(item.price)}
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => toggleMenuAvailable(item)}
                                    className={`px-3 py-1.5 rounded-xl font-bold text-[10px] tracking-wide inline-block cursor-pointer border select-none transition-all ${
                                      item.isAvailable 
                                        ? 'bg-brand/10 text-brand border-brand/20' 
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                                    }`}
                                  >
                                    {item.isAvailable ? '✔ Tersedia' : '✘ Habis'}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end items-center space-x-2">
                                    <button
                                      onClick={() => {
                                        setEditingMenuItem(item);
                                        setMenuForm({
                                          name: item.name,
                                          description: item.description || '',
                                          price: item.price,
                                          image: item.image,
                                          categoryId: item.categoryId
                                        });
                                        setIsMenuModalOpen(true);
                                      }}
                                      className="p-1.5 text-white/40 hover:text-brand hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteMenuItem(item.id)}
                                      className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
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

                  {/* Column 2: Category CRUD Board (1/4 width on desktop) */}
                  <div className="space-y-4">
                    <div className="bg-[#0E0E0E] rounded-xl p-5 border border-white/[0.04] space-y-4 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-brand">Kategori Hidangan</span>
                        <button
                          onClick={() => {
                            setEditingCategory(null);
                            setCategoryFormName('');
                            setIsCategoryModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-[10px] uppercase font-bold tracking-wider rounded-lg border border-brand/20 transition-all flex items-center gap-1 cursor-pointer select-none"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Kategori</span>
                        </button>
                      </div>

                      <div className="divide-y divide-white/[0.03] max-h-[480px] overflow-y-auto pr-1">
                        {categories.map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between py-2.5 text-xs group">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-white">{cat.name}</span>
                              <span className="text-[9px] text-white/30 font-mono mt-0.5">
                                {menuItems.filter(m => m.categoryId === cat.id).length} produk
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-50 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCategoryFormName(cat.name);
                                  setIsCategoryModalOpen(true);
                                }}
                                className="p-1 text-white/40 hover:text-brand hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteCategory(cat.id)}
                                className="p-1 text-white/40 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  </div>

                  {/* Menu Create/Edit Modal Layer */}
                  {isMenuModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-dark-card rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-white/10 flex flex-col space-y-4"
                      >
                        <h3 className="text-sm font-black text-white uppercase tracking-wide">
                          {editingMenuItem ? 'Edit Menu Item' : 'Tambah Menu Hidangan'}
                        </h3>

                        <form onSubmit={saveMenuItem} className="space-y-3.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase block">Nama Menu</label>
                            <input
                              type="text"
                              required
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand"
                              placeholder="Contoh: Es Campur Selasih"
                              value={menuForm.name}
                              onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase block">Deskripsi Singkat</label>
                            <textarea
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand min-h-12 resize-none"
                              placeholder="Deskripsikan menu makanannya..."
                              value={menuForm.description}
                              onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-white/40 uppercase block">Harga Jual (IDR)</label>
                              <input
                                type="number"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand"
                                placeholder="15000"
                                value={menuForm.price}
                                onChange={(e) => setMenuForm({ ...menuForm, price: Number(e.target.value) })}
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-white/40 uppercase block">Kategori</label>
                              <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand"
                                value={menuForm.categoryId}
                                onChange={(e) => setMenuForm({ ...menuForm, categoryId: Number(e.target.value) })}
                              >
                                {categories.map(c => (
                                  <option key={c.id} value={c.id} className="bg-[#050505]">{c.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-white/40 uppercase block">Link Foto (URL Gambar)</label>
                            <input
                              type="text"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand"
                              placeholder="https://images.unsplash.com/..."
                              value={menuForm.image}
                              onChange={(e) => setMenuForm({ ...menuForm, image: e.target.value })}
                            />
                          </div>

                          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMenuModalOpen(false);
                                setEditingMenuItem(null);
                              }}
                              className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 font-extrabold text-xs rounded-xl hover:bg-white/10 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="px-5 py-2 bg-brand hover:bg-brand/90 text-black font-black text-xs rounded-xl shadow-md active:scale-95 cursor-pointer"
                            >
                              {editingMenuItem ? 'Simpan' : 'Tambah'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}

                  {/* Category Create/Edit Modal Layer */}
                  {isCategoryModalOpen && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-dark-card rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-white/10 flex flex-col space-y-4"
                      >
                        <h3 className="text-sm font-black text-white uppercase tracking-wide">
                          {editingCategory ? 'Edit Kategori Hidangan' : 'Tambah Kategori Hidangan'}
                        </h3>

                        <form onSubmit={saveCategory} className="space-y-4">
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-white/40 uppercase block">Nama Kategori</label>
                              <input
                                type="text"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand"
                                placeholder="Contoh: Western, Coffee, Mocktails"
                                value={categoryFormName}
                                onChange={(e) => setCategoryFormName(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCategoryModalOpen(false);
                                setEditingCategory(null);
                              }}
                              className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 font-extrabold text-xs rounded-xl hover:bg-white/10 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="px-5 py-2 bg-brand hover:bg-brand/90 text-black font-black text-xs rounded-xl shadow-md active:scale-95 cursor-pointer"
                            >
                              {editingCategory ? 'Simpan' : 'Tambah'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}

                </motion.div>
              )}

              {/* TAB 4: DINING TABLES MANAGEMENT */}
              {activeTab === 'tables' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Create table bar */}
                  <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] max-w-xl">
                    <span className="text-[10px] font-black text-white/40 uppercase block tracking-wider mb-2">Form Tambah Meja Restoran</span>
                    
                    <form onSubmit={addNewTable} className="flex gap-4 items-end">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-white/50 block">Nomor Meja</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white outline-none focus:bg-white/10 focus:border-brand transition-all"
                          placeholder="Masukkan angka unik (Contoh: 6)"
                          value={newTableNum}
                          onChange={(e) => setNewTableNum(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-5 py-3.5 bg-brand text-black hover:bg-brand/90 transition-transform hover:scale-[1.01] font-black text-xs rounded-xl flex items-center space-x-1 shadow-md active:scale-95 cursor-pointer shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Daftarkan Meja & QR</span>
                      </button>
                    </form>
                  </div>

                  {/* Meal Table grids cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {tables.map((tbl) => {
                      const completePath = `${window.location.origin}/order/${tbl.number}`;
                      return (
                        <div key={tbl.id} className="bg-[#0E0E0E] rounded-xl p-5 shadow-sm border border-white/[0.04] text-center flex flex-col justify-between space-y-4 hover:border-brand/30 transition-all group relative">
                          
                          <div>
                            <span className="h-8.5 w-8.5 rounded-full bg-brand/15 border border-brand/25 text-brand font-extrabold text-sm flex items-center justify-center mx-auto mb-2 font-mono">
                              {tbl.number}
                            </span>
                            <h4 className="text-xs font-black text-white">Meja Makan {tbl.number}</h4>
                            <button
                              type="button"
                              onClick={() => toggleTableActive(tbl)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1.5 uppercase tracking-wider border transition-all cursor-pointer select-none ${
                                tbl.isActive 
                                  ? 'text-brand bg-brand/15 border-brand/25 hover:bg-brand/25' 
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/15 hover:bg-rose-500/20'
                              }`}
                              title="Klik untuk mengubah status meja"
                            >
                              {tbl.isActive ? 'Aktif' : 'Non-Aktif'}
                            </button>
                          </div>

                          <div className={`relative bg-white p-2.5 rounded-xl border border-white/10 inline-block mx-auto shadow-md transition-all ${!tbl.isActive && 'opacity-40 select-none pointer-events-none'}`}>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(completePath)}`}
                              alt={`QR Meja ${tbl.number}`}
                              className="w-28 h-28 mx-auto"
                            />
                            <p className="text-[8px] text-[#0A0A0A] font-mono mt-1.5 truncate max-w-[120px]" title={completePath}>
                              Meja {tbl.number} Path URL
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-1.5">
                            <a
                              href={`/order/${tbl.number}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`w-full py-2 bg-brand/10 hover:bg-brand/15 text-brand font-extrabold text-[10px] rounded-lg tracking-wide uppercase inline-flex items-center justify-center gap-1 transition-colors border border-brand/15 ${!tbl.isActive && 'pointer-events-none opacity-30 shadow-none'}`}
                            >
                              <Play className="h-3 w-3" />
                              <span>Buka Menu</span>
                            </a>
                            <a
                              href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(completePath)}`}
                              download={`QR-Meja-${tbl.number}.png`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 font-extrabold text-[9px] rounded-lg tracking-wide uppercase inline-flex items-center justify-center gap-1 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              <span>Simpan QR</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => deleteTable(tbl.id)}
                              className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/15 hover:border-rose-500/30 font-extrabold text-[9px] rounded-lg tracking-wide uppercase inline-flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Hapus Meja</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* TAB 5: FINANCIAL SALES REPORT */}
              {activeTab === 'reports' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* PDF Export Utility Header Block */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E0E0E] rounded-xl p-5 border border-white/[0.04] shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-brand uppercase tracking-wider">Ekspor Laporan Keuangan</h4>
                      <p className="text-[11px] text-white/40 font-semibold leading-relaxed">Ekspor total omset bersih, frekuensi penjualan kategori, serta hidangan terpopuler ke format dokumen PDF resmi.</p>
                    </div>
                    <button
                      type="button"
                      onClick={exportToPDF}
                      className="px-4 py-2.5 bg-brand hover:bg-brand/90 text-black font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer select-none shrink-0"
                    >
                      <FileText className="h-4 w-4 text-black" />
                      <span>Unduh Laporan PDF</span>
                    </button>
                  </div>

                  {/* Revenue metrics row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-sans">
                    <div className="bg-gradient-to-br from-brand/90 to-brand/60 rounded-xl p-6 text-black shadow-md flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#050505]/60 block">Total Omset Penjualan</span>
                        <h3 className="text-xl font-black mt-2 leading-none font-mono">{formatPrice(reportsData.totalSales)}</h3>
                      </div>
                      <p className="text-[10px] text-[#050505]/50 mt-4 leading-relaxed font-semibold">Pajak restoran 10% dihitung terpisah sesuai tagihan.</p>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl border border-white/[0.04] p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black text-white/40 tracking-wider block">Total Transaksi Lunas</span>
                        <h3 className="text-xl font-black text-white mt-1 leading-none font-mono">{reportsData.totalTransactions} Transaksi</h3>
                      </div>
                      <p className="text-[10px] text-white/30 mt-4 font-semibold">Tercatat lunas di database sistem kasir.</p>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl border border-white/[0.04] p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black text-white/40 tracking-wider block">Rata-rata Tiket Belanja</span>
                        <h3 className="text-xl font-black text-white mt-1 leading-none font-mono">{formatPrice(reportsData.averageTransaction)}</h3>
                      </div>
                      <p className="text-[10px] text-white/30 mt-4 font-semibold">Rata-rata pengeluaran per customer meja.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* SVG Sales category chart visualizer */}
                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black text-brand uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <PieChart className="h-4.5 w-4.5 text-brand" />
                          Kategori Omset Penjualan
                        </h4>
                        <span className="text-[11px] text-white/40 block font-semibold leading-relaxed">Distribusi omset total bersih berdasarkan kategori menu terbayar</span>
                      </div>

                      <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
                        {/* Custom native responsive Category Chart bar graph */}
                        <div className="flex-1 w-full space-y-3">
                          {Object.entries(reportsData.salesByCategory).map(([catName, value], idx) => {
                            const percent = reportsData.totalSales > 0 ? (Number(value) / reportsData.totalSales) * 100 : 0;
                            const colors = ['bg-brand', 'bg-brand/80', 'bg-brand/60', 'bg-brand/40', 'bg-brand/20'];
                            const bgCol = colors[idx % colors.length];

                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-white/50">
                                  <span>{catName}</span>
                                  <span className="text-white font-bold font-mono">{formatPrice(Number(value))} ({percent.toFixed(0)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.03]">
                                  <div className={`h-full ${bgCol} rounded-full`} style={{ width: `${percent}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* TOP 5 popular items */}
                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm border border-white/[0.04] flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black text-brand uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <Star className="h-4.5 w-4.5 text-brand" />
                          Top 5 Menu Paling Laris
                        </h4>
                        <span className="text-[11px] text-white/40 block font-semibold">Produk makanan/minuman yang paling sering dipesan oleh customer meja</span>
                      </div>

                      <div className="mt-6 divide-y divide-white/5 flex-1">
                        {reportsData.popularItems.length === 0 ? (
                          <div className="flex items-center justify-center py-10 text-white/30 font-bold text-xs">
                            Belum ada statistik hidangan terpasang
                          </div>
                        ) : (
                          reportsData.popularItems.map((item, idx) => (
                            <div key={idx} className="py-3 flex items-center justify-between border-b last:border-0 border-white/5">
                              <div className="flex items-center space-x-3">
                                <span className="h-6 w-6 rounded-lg bg-white/5 text-brand border border-white/10 font-bold text-xs flex items-center justify-center font-mono">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h5 className="text-xs font-black text-white leading-tight">{item.name}</h5>
                                  <span className="text-[10px] text-white/40 mt-1 block font-semibold font-mono">Total Pendapatan: {formatPrice(item.revenue)}</span>
                                </div>
                              </div>

                              <span className="text-xs font-black text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg shrink-0 font-mono">
                                {item.count} Porsi Terjual
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* TAB 6: CUSTOMER FEEDBACKS AND REVIEWS */}
              {activeTab === 'feedback' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Feedback Summary Cards row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-sans">
                    <div className="bg-[#0E0E0E] rounded-xl border border-white/[0.04] p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black text-white/40 tracking-wider block">Total Ulasan Masuk</span>
                        <h3 className="text-xl font-black text-white mt-1 leading-none font-mono">
                          {feedbacks.length} Ulasan
                        </h3>
                      </div>
                      <p className="text-[10px] text-white/30 mt-4 font-semibold">Tercatat secara langsung dari sistem kasir meja.</p>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl border border-white/[0.04] p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black text-white/40 tracking-wider block">Skor Rata-rata Kepuasan</span>
                        <h3 className="text-xl font-black text-amber-400 mt-1 leading-none font-mono flex items-center gap-1.5">
                          <Star className="h-5 w-5 fill-amber-400 text-amber-400 shrink-0" />
                          <span>
                            {feedbacks.length > 0 
                              ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
                              : '0.0'
                            } / 5.0
                          </span>
                        </h3>
                      </div>
                      <p className="text-[10px] text-white/30 mt-4 font-semibold">Berdasarkan ulasan bintang masuk.</p>
                    </div>

                    <div className="bg-emerald-950/20 rounded-xl border border-emerald-500/10 p-6 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black text-emerald-400/80 tracking-wider block">Tingkat Kepuasan</span>
                        <h3 className="text-xl font-black text-emerald-400 mt-1 leading-none font-mono">
                          {feedbacks.length > 0
                            ? ((feedbacks.filter(f => f.rating >= 4).length / feedbacks.length) * 100).toFixed(0)
                            : '0'
                          }% Sangat Puas
                        </h3>
                      </div>
                      <p className="text-[10px] text-emerald-500/40 mt-4 font-semibold">Ulasan berkategori bintang 4 & 5.</p>
                    </div>
                  </div>

                  {/* Feedbacks detailed list table/cards */}
                  <div className="bg-[#0E0E0E] rounded-xl border border-white/[0.04] p-6 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-brand uppercase tracking-wide font-sans">Daftar Feedback & Review Terbaru</h4>
                      <p className="text-[11px] text-white/40 block font-semibold leading-relaxed">Berikut tanggapan lengkap langsung dari gadget customer meja saat proses transaksi selesai.</p>
                    </div>

                    {feedbacks.length === 0 ? (
                      <div className="text-center py-16 text-white/30 font-bold text-xs font-sans">
                        Belum ada ulasan atau feedback yang masuk dari pelanggan.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                        {feedbacks.map((f) => (
                          <div 
                            key={f.id} 
                            className="bg-[#121212] border border-white/[0.03] hover:border-white/[0.06] rounded-xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-2">
                              {/* Header info card */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="text-xs font-black text-white leading-tight flex items-center gap-1.5 font-sans">
                                    {f.customerName}
                                    {f.orderId && (
                                      <span className="text-[9px] font-mono text-white/30 bg-white/5 border border-white/10 px-1 py-0.2 rounded font-normal shrink-0">
                                        ID #{f.orderId.split('-')[2] || f.orderId.slice(-6)}
                                      </span>
                                    )}
                                  </h5>
                                  <span className="text-[9px] text-white/30 block mt-0.5 font-bold font-mono">
                                    {new Date(f.createdAt).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-0.5">
                                  {[1, 2, 3, 4, 5].map((starVal) => (
                                    <Star 
                                      key={starVal}
                                      className={`h-3 w-3 ${starVal <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              {/* Note message */}
                              <p className="text-[11px] text-white/70 italic font-medium leading-relaxed bg-[#161616] p-2.5 rounded-lg border border-white/[0.02]">
                                {f.note ? `"${f.note}"` : <span className="text-white/20 font-light italic font-sans text-[10px]">"Tidak menulis ulasan spesifik"</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 7: OWNER MEMBERS MANAGEMENT */}
              {activeTab === 'members' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 font-sans"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Member Form Column */}
                    <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm h-fit space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-brand uppercase tracking-wide">Tambah Anggota Staff</h4>
                        <p className="text-[11px] text-white/40 block font-semibold">Tugaskan hak akses personil baru ke dalam sistem Kafe QR Anda.</p>
                      </div>

                      {memberError && (
                        <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-[11px] rounded-lg font-bold">
                          {memberError}
                        </div>
                      )}

                      {memberSuccess && (
                        <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[11px] rounded-lg font-bold">
                          {memberSuccess}
                        </div>
                      )}

                      <form onSubmit={handleAddMember} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black text-white/50 block">Nama Anggota</label>
                          <input
                            type="text"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:border-brand outline-none transition-all"
                            placeholder="Contoh: Lintang Syahdewo"
                            value={memberForm.name}
                            onChange={e => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black text-white/50 block">Alamat E-mail</label>
                          <input
                            type="email"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:border-brand outline-none transition-all"
                            placeholder="Contoh: lintang@gmail.com"
                            value={memberForm.email}
                            onChange={e => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black text-white/50 block">Jabatan / Akses Level</label>
                          <select
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand outline-none transition-all [&>option]:bg-neutral-900"
                            value={memberForm.role}
                            onChange={e => setMemberForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                          >
                            <option value={UserRole.OWNER}>OWNER (Direktur Utama)</option>
                            <option value={UserRole.ADMIN}>ADMIN (Pengelola Admin)</option>
                            <option value={UserRole.KASIR}>KASIR (Petugas Pelayanan Bil)</option>
                            <option value={UserRole.DAPUR}>DAPUR (Penyaji Makanan)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-brand hover:bg-brand/90 text-black font-black uppercase text-[10px] tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 font-sans"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{actionLoading ? 'Menyimpan...' : 'Tambahkan Anggota'}</span>
                        </button>
                      </form>
                    </div>

                    {/* Member Directory List Column */}
                    <div className="lg:col-span-2 bg-[#0E0E0E] rounded-xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-brand uppercase tracking-wide">Daftar Struktur Tim & Staff</h4>
                          <p className="text-[11px] text-white/40 block font-semibold mt-0.5">Personils aktif yang memiliki kuasa log-in backend QR.</p>
                        </div>
                        <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/60 font-black">
                          {members.length} Anggota Terdaftar
                        </span>
                      </div>

                      {members.length === 0 ? (
                        <div className="text-center py-16 text-white/35 font-bold text-xs">
                          Belum ada anggota staff tambahan terdaftar di sistem.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {members.map(m => (
                            <div 
                              key={m.id} 
                              className="bg-[#121212] border border-white/[0.03] hover:border-white/[0.05] p-4 rounded-xl flex items-start justify-between transition-all"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white font-black uppercase shrink-0">
                                  {m.name.slice(0, 2)}
                                </div>
                                <div className="space-y-0.5">
                                  <h5 className="text-xs font-black text-white leading-tight">{m.name}</h5>
                                  <p className="text-[10px] text-white/40 leading-none truncate font-semibold max-w-[130px]">{m.email}</p>
                                  
                                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${
                                    m.role === UserRole.OWNER ? 'bg-purple-950/40 border border-purple-500/20 text-purple-400' :
                                    m.role === UserRole.ADMIN ? 'bg-amber-950/40 border border-amber-500/20 text-amber-400' :
                                    m.role === UserRole.KASIR ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' :
                                    'bg-blue-950/40 border border-blue-500/20 text-blue-400'
                                  }`}>
                                    {m.role}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteMember(m.id, m.name)}
                                disabled={actionLoading || (user && user.email === m.email)}
                                className="text-white/20 hover:text-red-400 hover:bg-neutral-800 p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-20"
                                title="Cabut Akses Anggota"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 8: LOG OUTBOX E-RECEIPT EMAIL SYSTEM */}
              {activeTab === 'emails' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 font-sans"
                >
                  {/* Outbox Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-[#0E0E0E] rounded-xl p-5 shadow-sm">
                      <span className="text-[9px] uppercase font-black text-white/40 tracking-wider block">Volume Nota E-Receipt</span>
                      <h3 className="text-xl font-black text-white mt-1 leading-none font-mono">
                        {emails.length} Nota Terbit
                      </h3>
                      <p className="text-[10px] text-white/30 mt-3 font-semibold">Tercatat terdistribusi otomatis pasca pembayaran.</p>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl p-5 shadow-sm">
                      <span className="text-[9px] uppercase font-black text-white/40 tracking-wider block">Koneksi Mesin Transmisi</span>
                      <h3 className="text-xl font-black text-white mt-1 leading-none font-sans flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 block animate-pulse"></span>
                        <span className="text-xs font-black uppercase text-brand">SISTEM AKTIF</span>
                      </h3>
                      <p className="text-[10px] text-white/30 mt-3 font-semibold">SMTP Engine stand-by mengawasi invoice digital.</p>
                    </div>

                    <div className="bg-[#0E0E0E] rounded-xl p-5 shadow-sm">
                      <span className="text-[9px] uppercase font-black text-white/40 tracking-wider block">Bypass Simulasi Mode</span>
                      <h3 className="text-xl font-black text-amber-400 mt-1 leading-none font-mono">
                        {emails.filter(e => e.status === 'SIMULATED').length} Transaksi
                      </h3>
                      <p className="text-[10px] text-white/30 mt-3 font-semibold">Nota tercatat dalam logger virtual sandbox lokal.</p>
                    </div>
                  </div>

                  {/* Feedback alerting messages */}
                  {emailError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-[11px] rounded-lg font-bold font-sans">
                      {emailError}
                    </div>
                  )}

                  {emailSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[11px] rounded-lg font-bold font-sans">
                      {emailSuccess}
                    </div>
                  )}

                  {/* Outbox Receipts List table */}
                  <div className="bg-[#0E0E0E] rounded-xl p-6 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-brand uppercase tracking-wide">Daftar Pengiriman Outbox Nota E-Receipt</h4>
                      <p className="text-[11px] text-white/40 block font-semibold leading-relaxed mt-0.5">Sejarah status penerbitan PDF bukti billing tagihan makan konsumen via email.</p>
                    </div>

                    {emails.length === 0 ? (
                      <div className="text-center py-16 text-white/30 font-bold text-xs font-sans">
                        Belum ada data email invoice keluar yang pernah terkirim ke pelanggan.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider font-extrabold text-white/50">
                              <th className="py-3 px-4">Nama Pelanggan</th>
                              <th className="py-3 px-4">Email Penerima</th>
                              <th className="py-3 px-4">Subjek Surat</th>
                              <th className="py-3 px-4">Waktu Terkirim</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {emails.map((e) => (
                              <tr 
                                key={e.id} 
                                className="border-b border-white/[0.02] hover:bg-white/[0.01] text-xs font-sans text-white/80 transition-all"
                              >
                                <td className="py-3 px-4">
                                  <div className="font-bold text-white">{e.customerName}</div>
                                  <div className="text-[9px] text-white/30 font-mono">Order ID: {e.orderId.substring(0, 12)}...</div>
                                </td>
                                
                                <td className="py-3 px-4 font-semibold text-white/70">
                                  {e.recipientEmail}
                                </td>

                                <td className="py-3 px-4 max-w-[200px] truncate text-white/60">
                                  {e.subject}
                                </td>

                                <td className="py-3 px-4 font-mono text-[10px] text-white/40">
                                  {new Date(e.sentAt).toLocaleString('id-ID', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    e.status === 'SENT' ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' :
                                    e.status === 'SIMULATED' ? 'bg-amber-950/40 border border-amber-500/20 text-amber-400' :
                                    'bg-red-950/40 border border-red-500/20 text-red-500'
                                  }`}>
                                    {e.status === 'SENT' ? 'SMTP Terkirim' : e.status === 'SIMULATED' ? 'Simulasi Sukses' : 'Gagal'}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-right space-x-2">
                                  <button
                                    onClick={() => setPreviewEmail(e)}
                                    className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-neutral-800 text-[10px] font-bold rounded-lg transition-all uppercase cursor-pointer"
                                  >
                                    Pratinjau
                                  </button>
                                  <button
                                    onClick={() => handleResendEmail(e.orderId, e.recipientEmail)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1 bg-brand text-black hover:bg-brand/90 text-[10px] font-bold rounded-lg transition-all uppercase cursor-pointer disabled:opacity-40"
                                  >
                                    Kirim Ulang
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>

      </section>

      {/* EMAIL PREVIEW INVOICE MODAL ACCORDION */}
      <AnimatePresence>
        {previewEmail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0C0C0C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-sans"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-brand uppercase tracking-wider">Pratinjau Nota PDF/HTML E-Receipt</h3>
                  <p className="text-[10px] text-white/40 block font-semibold mt-0.5">Nota ini dikirim otomatis ke alamat: {previewEmail.recipientEmail}</p>
                </div>
                <button
                  onClick={() => setPreviewEmail(null)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer transition-all"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto bg-neutral-900 min-h-[400px]">
                <div 
                  className="rounded-xl overflow-hidden shadow-lg border border-neutral-700 bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }} 
                />
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#080808]">
                <span className="text-[9px] font-mono text-white/30 uppercase font-bold text-white/30">Nota Log ID: {previewEmail.id}</span>
                <button
                  onClick={() => setPreviewEmail(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white hover:text-white text-xs font-black uppercase rounded-xl border border-white/10 transition-all cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
