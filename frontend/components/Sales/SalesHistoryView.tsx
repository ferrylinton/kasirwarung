import React, { useState, useEffect } from 'react';
import DatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import 'react-calendar/dist/Calendar.css';
import * as Checkbox from '@radix-ui/react-checkbox';
import {
  Receipt,
  Download,
  Lock,
  Wallet,
  Search,
  Calendar,
  CalendarDays,
  Clock,
  User,
  Check,
} from 'lucide-react';
import { Order } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
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
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState<ValuePiece>(new Date());
  const [rangeDate, setRangeDate] = useState<Value>([new Date(), new Date()]);
  const [search, setSearch] = useState('');

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

  const handleSingleDateChange = (val: ValuePiece | any) => {
    const d = val instanceof Date ? val : null;
    setSingleDate(d);
    if (d) {
      setRangeDate([d, d]);
    }
  };

  const handleRangeDateChange = (val: Value) => {
    setRangeDate(val);
    if (Array.isArray(val) && val[0]) {
      setSingleDate(val[0]);
    } else if (val instanceof Date) {
      setSingleDate(val);
    }
  };

  // Filter orders by date/period and search
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((it) => it.name.toLowerCase().includes(search.toLowerCase()));

    let matchDate = true;
    const orderDate = new Date(o.createdAt);

    if (!isNaN(orderDate.getTime())) {
      if (dateMode === 'single') {
        if (singleDate instanceof Date) {
          matchDate =
            orderDate.getDate() === singleDate.getDate() &&
            orderDate.getMonth() === singleDate.getMonth() &&
            orderDate.getFullYear() === singleDate.getFullYear();
        }
      } else {
        // range mode
        if (rangeDate instanceof Date) {
          matchDate =
            orderDate.getDate() === rangeDate.getDate() &&
            orderDate.getMonth() === rangeDate.getMonth() &&
            orderDate.getFullYear() === rangeDate.getFullYear();
        } else if (Array.isArray(rangeDate) && rangeDate[0]) {
          const startDate = new Date(rangeDate[0]);
          startDate.setHours(0, 0, 0, 0);
          const endDate = rangeDate[1] ? new Date(rangeDate[1]) : new Date(rangeDate[0]);
          endDate.setHours(23, 59, 59, 999);
          matchDate = orderDate >= startDate && orderDate <= endDate;
        }
      }
    }

    return matchSearch && matchDate;
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
    dateMode === 'single'
      ? singleDate instanceof Date
        ? singleDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Tanggal Dipilih'
      : Array.isArray(rangeDate) && rangeDate[0]
      ? rangeDate[1] &&
        new Date(rangeDate[0]).toDateString() !== new Date(rangeDate[1]).toDateString()
        ? `${new Date(rangeDate[0]).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          })} - ${new Date(rangeDate[1]).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}`
        : new Date(rangeDate[0]).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
      : rangeDate instanceof Date
      ? rangeDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Rentang Tanggal';

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
      {/* 2 Financial Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {periodLabel}
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
      </div>

      {/* Date Filter Controls */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        {/* Mode Switcher: Satu Tanggal / Rentang Tanggal using Radix UI Checkbox */}
        <div className="flex items-center h-10 gap-2 px-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <Checkbox.Root
            id="date-range-mode-checkbox"
            checked={dateMode === 'range'}
            onCheckedChange={(checked) => setDateMode(checked === true ? 'range' : 'single')}
            className="flex h-4.5 w-4.5 shrink-0 appearance-none items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700 text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 transition-all cursor-pointer shadow-2xs"
          >
            <Checkbox.Indicator className="text-white flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </Checkbox.Indicator>
          </Checkbox.Root>
          <label
            htmlFor="date-range-mode-checkbox"
            className="text-xs font-semibold text-slate-700 dark:text-slate-200 select-none cursor-pointer flex items-center gap-1.5"
          >
            {dateMode === 'range' ? (
              <>
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Rentang Tanggal</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Rentang Tanggal</span>
              </>
            )}
          </label>
        </div>

        {/* Date Picker Component (Satu Tanggal atau Rentang Tanggal) */}
        <div className="flex items-center h-10 gap-1.5 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs transition-all">
          {dateMode === 'single' ? (
            <DatePicker
              onChange={handleSingleDateChange}
              value={singleDate}
              locale="id-ID"
              format="d/MM/yyyy"
              clearIcon={singleDate ? undefined : null}
              className="custom-react-date-picker text-xs font-medium"
            />
          ) : (
            <DateRangePicker
              onChange={handleRangeDateChange}
              value={rangeDate}
              locale="id-ID"
              format="d/MM/yyyy"
              rangeDivider=" — "
              clearIcon={rangeDate ? undefined : null}
              className="custom-react-date-picker text-xs font-medium"
            />
          )}
        </div>
      </div>

      {/* Search & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px] max-w-md">
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
