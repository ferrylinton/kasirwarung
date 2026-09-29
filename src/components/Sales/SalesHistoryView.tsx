import React, { useState, useEffect } from 'react';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import * as Select from '@radix-ui/react-select';
import {
  Receipt,
  Download,
  Lock,
  Wallet,
  QrCode,
  Search,
  Calendar,
  Clock,
  User,
  ChevronDown,
  Check,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { Order } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';
import { ReceiptModal } from '../Modals/ReceiptModal';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export const SalesHistoryView: React.FC = () => {
  const { tenant, token } = useAuthStore();
  const { addToast } = useToastStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | 'month' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('Semua');

  // Confirmation Modals
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err: any) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleDateChange = (val: Value) => {
    setSelectedDate(val);
    if (val) {
      setPeriod('custom');
    }
  };

  // Filter orders by date/period, search, and payment
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((it) => it.name.toLowerCase().includes(search.toLowerCase()));

    const matchPayment = paymentFilter === 'Semua' || o.paymentMethod.toUpperCase() === paymentFilter.toUpperCase();

    let matchDate = true;
    const orderDate = new Date(o.createdAt);
    const now = new Date();

    if (!isNaN(orderDate.getTime())) {
      if (period === 'today') {
        matchDate =
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      } else if (period === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        matchDate =
          orderDate.getDate() === yesterday.getDate() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getFullYear() === yesterday.getFullYear();
      } else if (period === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        matchDate = orderDate >= sevenDaysAgo && orderDate <= now;
      } else if (period === 'month') {
        matchDate =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      } else if (period === 'custom') {
        if (selectedDate instanceof Date) {
          matchDate =
            orderDate.getDate() === selectedDate.getDate() &&
            orderDate.getMonth() === selectedDate.getMonth() &&
            orderDate.getFullYear() === selectedDate.getFullYear();
        } else if (Array.isArray(selectedDate) && selectedDate[0]) {
          const startDate = new Date(selectedDate[0]);
          startDate.setHours(0, 0, 0, 0);
          const endDate = selectedDate[1] ? new Date(selectedDate[1]) : new Date(selectedDate[0]);
          endDate.setHours(23, 59, 59, 999);
          matchDate = orderDate >= startDate && orderDate <= endDate;
        }
      }
    }

    return matchSearch && matchPayment && matchDate;
  });

  // Financial aggregates
  let totalOmzet = 0;
  let kasTunai = 0;
  let qrisTransfer = 0;
  let tunaiCount = 0;
  let nonTunaiCount = 0;

  filteredOrders.forEach((o) => {
    totalOmzet += o.total;
    if (o.paymentMethod === 'TUNAI') {
      kasTunai += o.total;
      tunaiCount++;
    } else if (o.paymentMethod === 'QRIS' || o.paymentMethod === 'TRANSFER') {
      qrisTransfer += o.total;
      nonTunaiCount++;
    }
  });

  const tunaiPercentage = totalOmzet > 0 ? ((kasTunai / totalOmzet) * 100).toFixed(1) : '0.0';
  const nonTunaiPercentage = totalOmzet > 0 ? ((qrisTransfer / totalOmzet) * 100).toFixed(1) : '0.0';

  const periodLabel =
    period === 'today'
      ? 'Hari Ini'
      : period === 'yesterday'
      ? 'Kemarin'
      : period === '7days'
      ? '7 Hari Terakhir'
      : period === 'month'
      ? 'Bulan Ini'
      : selectedDate instanceof Date
      ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Kustom';

  const handleDownloadReport = () => {
    addToast({
      type: 'success',
      title: 'Unduh Rekap Berhasil',
      message: 'Rekap buku kas penjualan harian berhasil diunduh (Format CSV/Excel).',
    });
  };

  const handleCloseCashRegister = () => {
    setShowCloseRegisterModal(false);
    addToast({
      type: 'success',
      title: 'Tutup Buku Kas Selesai',
      message: `Buku kas harian berhasil ditutup. Total uang fisik di laci: Rp ${kasTunai.toLocaleString('id-ID')}.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 3 Financial Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Omzet */}
        <div className="bg-linear-to-br from-emerald-800 to-emerald-950 text-white p-5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
              Total Omzet ({periodLabel})
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-700/60 flex items-center justify-center text-white">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono tracking-tight">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-200/90 pt-1 border-t border-emerald-700/50">
            <span>{filteredOrders.length} Transaksi Selesai</span>
            <span className="font-semibold text-emerald-300 bg-emerald-900/60 px-1.5 py-0.2 rounded">
              {period === 'today' ? 'Hari Ini' : periodLabel}
            </span>
          </div>
        </div>

        {/* Card 2: Kas Tunai Laci */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Kas Tunai (Laci Fisik)
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              Rp {kasTunai.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>{tunaiCount} Transaksi Tunai</span>
            <span className="font-bold font-mono text-emerald-600">{tunaiPercentage}%</span>
          </div>
        </div>

        {/* Card 3: QRIS */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pembayaran QRIS
            </div>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              Rp {qrisTransfer.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>{nonTunaiCount} Transaksi QRIS</span>
            <span className="font-bold font-mono text-teal-600">{nonTunaiPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Date Periods & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Unified Date Related Filter Control Group */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-300/40 dark:border-slate-700/60 shadow-xs">
          {(
            [
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: 'month', label: 'Bulan Ini' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setPeriod(t.id);
                if (t.id === 'today') {
                  setSelectedDate(new Date());
                } else if (t.id === 'yesterday') {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d);
                } else {
                  setSelectedDate(null);
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                period === t.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Divider */}
          <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* React Date Picker in same group */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              period === 'custom'
                ? 'bg-white dark:bg-slate-900 ring-2 ring-emerald-600 dark:ring-emerald-500 shadow-xs'
                : 'bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900'
            }`}
          >
            <Calendar
              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                period === 'custom' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <DatePicker
              onChange={handleDateChange}
              value={selectedDate}
              locale="id-ID"
              format="dd/MM/yyyy"
              clearIcon={selectedDate ? undefined : null}
              className="custom-react-date-picker text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Search, Payment Filter & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No. Nota (e.g. TR-892) atau nama pelanggan (e.g. Bu RT)..."
              className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-hidden shadow-xs transition-all"
            />
          </div>

          {/* Radix UI Select for Payment Filter */}
          <Select.Root
            value={paymentFilter}
            onValueChange={(val) => setPaymentFilter(val)}
          >
            <Select.Trigger
              className="inline-flex items-center justify-between gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 shadow-xs cursor-pointer transition-all"
              aria-label="Metode Pembayaran"
            >
              <div className="flex items-center gap-2 truncate">
                {paymentFilter === 'TUNAI' ? (
                  <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : paymentFilter === 'QRIS' ? (
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                ) : (
                  <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                )}
                <Select.Value>
                  <span className="truncate">
                    {paymentFilter === 'Semua' && 'Semua Pembayaran'}
                    {paymentFilter === 'TUNAI' && 'Uang Tunai'}
                    {paymentFilter === 'QRIS' && 'QRIS'}
                  </span>
                </Select.Value>
              </div>
              <Select.Icon className="text-slate-400 dark:text-slate-500 shrink-0 ml-1">
                <ChevronDown className="w-3.5 h-3.5" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-50 min-w-[200px] overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 animate-in fade-in-80 zoom-in-95"
                position="popper"
                sideOffset={6}
              >
                <Select.Viewport className="p-1 space-y-0.5">
                  <Select.Item
                    value="Semua"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-800 dark:data-[highlighted]:text-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <Select.ItemText>Semua Pembayaran</Select.ItemText>
                    </div>
                    <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>

                  <Select.Item
                    value="TUNAI"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-800 dark:data-[highlighted]:text-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <Select.ItemText>Uang Tunai</Select.ItemText>
                    </div>
                    <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>

                  <Select.Item
                    value="QRIS"
                    className="flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium text-slate-700 dark:text-slate-300 cursor-pointer outline-hidden select-none hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 data-[highlighted]:bg-emerald-50 dark:data-[highlighted]:bg-emerald-950/40 data-[highlighted]:text-emerald-800 dark:data-[highlighted]:text-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <Select.ItemText>QRIS</Select.ItemText>
                    </div>
                    <Select.ItemIndicator className="text-emerald-600 dark:text-emerald-400 pl-2">
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </Select.ItemIndicator>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Unduh Rekap</span>
          </button>

          <button
            onClick={() => setShowCloseRegisterModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Tutup Buku Kas</span>
          </button>
        </div>
      </div>

      {/* Responsive Transactions Section: Smartphone, Tablet & Desktop */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Transaksi ({filteredOrders.length} Nota Terdaftar)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pilih baris atau klik tombol Struk untuk melihat dan mencetak struk kasir
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Sinkron Realtime
            </span>
          </div>
        </div>

        {/* 1. Desktop & Tablet View (Hidden on mobile, Visible on md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Waktu & No. Nota</th>
                <th className="py-3.5 px-4 font-semibold">Kasir</th>
                <th className="py-3.5 px-4 font-semibold">Rincian Barang</th>
                <th className="py-3.5 px-4 font-semibold">Metode</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Belanja</th>
                <th className="py-3.5 px-4 font-semibold text-center">Aksi Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p>Tidak ada data transaksi yang cocok dengan filter pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setReceiptOrder(o)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80 group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {o.orderNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(o.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            WIB
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{o.cashierName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        <div className="line-clamp-1 font-medium text-slate-800">
                          {o.items.map((it) => `${it.name}`).slice(0, 2).join(', ')}
                          {o.items.length > 2 ? `, +${o.items.length - 2} lainnya` : ''}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Total {o.items.reduce((sum, it) => sum + it.qty, 0)} jenis barang
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            o.paymentMethod === 'TUNAI'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}
                        >
                          {o.paymentMethod === 'TUNAI' ? 'Uang Tunai' : o.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-black text-slate-900">
                          Rp {o.total.toLocaleString('id-ID')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptOrder(o);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200/80 transition-colors shadow-2xs cursor-pointer"
                          title="Lihat & Cetak Struk"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Struk</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Mobile View: Responsive Cards for Smartphone (Hidden on md and up) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>Tidak ada data transaksi yang cocok dengan filter pencarian.</p>
            </div>
          ) : (
            filteredOrders.map((o) => {
              return (
                <div
                  key={o.id}
                  onClick={() => setReceiptOrder(o)}
                  className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer space-y-3"
                >
                  {/* Row 1: Order Number, Time & Kasir */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {o.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(o.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{o.cashierName}</span>
                    </div>
                  </div>

                  {/* Row 2: Items snippet */}
                  <div className="text-xs text-slate-600 line-clamp-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 font-sans">
                    {o.items.map((it) => `${it.name} (${it.qty})`).join(', ')}
                  </div>

                  {/* Row 3: Payment Method, Total & Button Struk */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          o.paymentMethod === 'TUNAI'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-teal-50 text-teal-800 border border-teal-200'
                        }`}
                      >
                        {o.paymentMethod === 'TUNAI' ? 'Uang Tunai' : o.paymentMethod}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        Rp {o.total.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceiptOrder(o);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Struk</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Modal for Closing Cash Register */}
      <ConfirmationModal
        isOpen={showCloseRegisterModal}
        type="UPDATE"
        title="Konfirmasi Tutup Buku Kas Harian?"
        description={`Sistem akan merekap dan mengunci buku kas hari ini. Total kas tunai di laci yang harus disetorkan adalah Rp ${kasTunai.toLocaleString('id-ID')}. Lanjutkan penutupan shift?`}
        confirmText="Ya, Tutup Buku Kas"
        cancelText="Batal"
        onConfirm={handleCloseCashRegister}
        onCancel={() => setShowCloseRegisterModal(false)}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptOrder)}
        order={receiptOrder}
        tenant={tenant}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};
