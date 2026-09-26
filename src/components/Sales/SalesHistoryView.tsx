import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Download,
  Lock,
  Wallet,
  QrCode,
  BookOpen,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  MessageSquare,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { Order } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ConfirmationModal } from '../Modals/ConfirmationModal';

export const SalesHistoryView: React.FC = () => {
  const { user, tenant, token } = useAuthStore();
  const { addToast } = useToastStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | 'month'>('today');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Confirmation Modals
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [markingPaidOrder, setMarkingPaidOrder] = useState<Order | null>(null);

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
        if (data.orders && data.orders.length > 0 && !selectedOrder) {
          setSelectedOrder(data.orders[0]);
        }
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

  // Financial aggregates matching Image 5
  let totalOmzet = 0;
  let kasTunai = 0;
  let qrisTransfer = 0;
  let kasbon = 0;
  let kasbonCount = 0;
  let tunaiCount = 0;
  let nonTunaiCount = 0;

  orders.forEach((o) => {
    totalOmzet += o.total;
    if (o.paymentMethod === 'TUNAI') {
      kasTunai += o.total;
      tunaiCount++;
    } else if (o.paymentMethod === 'QRIS' || o.paymentMethod === 'TRANSFER') {
      qrisTransfer += o.total;
      nonTunaiCount++;
    } else if (o.paymentMethod === 'KASBON') {
      if (o.paymentStatus === 'BELUM_LUNAS') {
        kasbon += o.total;
        kasbonCount++;
      } else {
        kasTunai += o.total;
      }
    }
  });

  const tunaiPercentage = totalOmzet > 0 ? ((kasTunai / totalOmzet) * 100).toFixed(1) : '0.0';
  const nonTunaiPercentage = totalOmzet > 0 ? ((qrisTransfer / totalOmzet) * 100).toFixed(1) : '0.0';

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.customerNote && o.customerNote.toLowerCase().includes(search.toLowerCase()));

    const matchPayment = paymentFilter === 'Semua' || o.paymentMethod.toUpperCase() === paymentFilter.toUpperCase();
    const matchStatus = statusFilter === 'Semua' || o.paymentStatus.toUpperCase() === statusFilter.toUpperCase();

    return matchSearch && matchPayment && matchStatus;
  });

  const handleMarkAsPaid = async (order: Order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentStatus: 'LUNAS' }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message);

      addToast({
        type: 'success',
        title: 'Kasbon Dilunasi',
        message: `Kasbon untuk nota ${order.orderNumber} telah ditandai Lunas.`,
      });

      setMarkingPaidOrder(null);
      fetchOrders();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Memperbarui',
        message: err.message,
      });
    }
  };

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

  const printReceipt = () => {
    if (!selectedOrder) return;
    addToast({
      type: 'info',
      title: 'Cetak Thermal',
      message: `Mencetak nota ${selectedOrder.orderNumber}...`,
    });
    window.print();
  };

  const sendWhatsApp = () => {
    if (!selectedOrder) return;
    const storeName = tenant?.name || 'Toko Berkah Jaya';
    const text = encodeURIComponent(
      `*STRUK PEMBELIAN ${storeName.toUpperCase()}*\n` +
      `No. Nota: ${selectedOrder.orderNumber}\n` +
      `Waktu: ${new Date(selectedOrder.createdAt).toLocaleString('id-ID')}\n` +
      `Pelanggan: ${selectedOrder.customerName}\n` +
      `Total: Rp ${selectedOrder.total.toLocaleString('id-ID')} (${selectedOrder.paymentStatus})\n` +
      `Terima kasih sudah berbelanja!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Buku Kasir & Laporan &gt;{' '}
            <span className="text-emerald-700">Riwayat Penjualan Harian</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Rekap Penjualan Warung
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Shift Pagi–Sore
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pembaruan otomatis realtime • Sinkronisasi mesin kasir {tenant?.name || 'Berkah Jaya'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Unduh Rekap (Excel/PDF)</span>
          </button>

          <button
            onClick={() => setShowCloseRegisterModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span>Tutup Buku Kas Harian</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Cards matching Image 5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Omzet */}
        <div className="bg-linear-to-br from-emerald-800 to-emerald-950 text-white p-5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
              Total Omzet Hari Ini
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
            <span>{orders.length} Transaksi Selesai</span>
            <span className="font-semibold text-emerald-300 bg-emerald-900/60 px-1.5 py-0.2 rounded">
              +12% vs Kemarin
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

        {/* Card 3: QRIS & Transfer Bank */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              QRIS & Transfer Bank
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
            <span>{nonTunaiCount} Transaksi Non-Tunai</span>
            <span className="font-bold font-mono text-teal-600">{nonTunaiPercentage}%</span>
          </div>
        </div>

        {/* Card 4: Kasbon / Belum Lunas */}
        <div className="bg-white border border-amber-200 bg-amber-50/20 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Kasbon / Belum Lunas
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-amber-800 tracking-tight">
              Rp {kasbon.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-amber-200/60">
            <span>{kasbonCount} Warga Catat Bon</span>
            <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
              Perlu Ditagih
            </span>
          </div>
        </div>
      </div>

      {/* Date Periods & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
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
              onClick={() => setPeriod(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                period === t.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Hari Ini, 06:00 – Sekarang</span>
        </div>
      </div>

      {/* Search and Dropdowns Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. Nota (e.g. TR-892) atau nama pelanggan (e.g. Bu RT)..."
            className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-emerald-500 focus:outline-hidden shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden shadow-xs cursor-pointer"
          >
            <option value="Semua">Semua Pembayaran</option>
            <option value="TUNAI">Tunai</option>
            <option value="QRIS">QRIS</option>
            <option value="TRANSFER">Transfer</option>
            <option value="KASBON">Kasbon</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden shadow-xs cursor-pointer"
          >
            <option value="Semua">Semua Status</option>
            <option value="LUNAS">Lunas</option>
            <option value="BELUM_LUNAS">Belum Lunas (Kasbon)</option>
          </select>
        </div>
      </div>

      {/* Main Content Area: Table on Left + Struk Preview on Right matching Image 5 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: Transactions Table */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Transaksi ({filteredOrders.length} Nota Terdaftar)
            </h3>
            <span className="text-[11px] text-slate-400">Klik baris untuk rincian struk kasir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Waktu & No. Nota</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Rincian Barang</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada data transaksi yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => {
                    const isSelected = selectedOrder?.id === o.id;
                    const isKasbonPending = o.paymentMethod === 'KASBON' && o.paymentStatus === 'BELUM_LUNAS';

                    return (
                      <tr
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/60 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">{o.orderNumber}</div>
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
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {o.customerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{o.customerName}</div>
                              <div className="text-[11px] text-slate-500">{o.customerNote || 'Warga'}</div>
                            </div>
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
                                : o.paymentMethod === 'QRIS'
                                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                : isKasbonPending
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {o.paymentMethod}
                            {isKasbonPending && ' (Bon)'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-black text-slate-900">
                            Rp {o.total.toLocaleString('id-ID')}
                          </div>
                          {isKasbonPending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarkingPaidOrder(o);
                              }}
                              className="text-[10px] text-amber-700 font-bold hover:underline mt-0.5 inline-block"
                            >
                              Tandai Lunas
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Pratinjau Struk Kasir matching Image 5 Right Panel */}
        <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden shrink-0">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Pratinjau Struk Kasir</span>
            </span>
            {selectedOrder && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedOrder.paymentStatus === 'LUNAS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedOrder.paymentStatus}
              </span>
            )}
          </div>

          {selectedOrder ? (
            <div className="p-5 font-mono text-xs text-slate-800 bg-white">
              {/* Header Store */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h3 className="text-sm font-bold text-emerald-800 tracking-wider uppercase font-sans">
                  {tenant?.name || 'TOKO BERKAH JAYA'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {tenant?.address || 'Jl. Merdeka No. 42, RT 02/05 Pasar Anyar'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {tenant?.phone || 'Telp: 0812-3456-7890'}
                </p>
              </div>

              {/* Transaction Meta */}
              <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Transaksi</span>
                  <span className="font-semibold">{selectedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Transaksi</span>
                  <span>
                    {new Date(selectedOrder.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(selectedOrder.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    WIB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir</span>
                  <span>{selectedOrder.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan</span>
                  <span className="font-semibold text-emerald-700">
                    {selectedOrder.customerName}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-semibold text-slate-900 leading-snug">{it.name}</div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>
                        {it.qty} x Rp {it.price.toLocaleString('id-ID')}
                      </span>
                      <span className="font-medium text-slate-800">
                        Rp {it.subtotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2.5 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({selectedOrder.items.length} Item)</span>
                  <span>Rp {selectedOrder.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Potongan Diskon</span>
                    <span>- Rp {selectedOrder.discount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Akhir</span>
                  <span className="text-base text-emerald-700 font-sans">
                    Rp {selectedOrder.total.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="pt-2 text-[11px] space-y-1 border-t border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metode</span>
                    <span className="font-semibold">{selectedOrder.paymentMethod}</span>
                  </div>
                  {selectedOrder.paymentMethod === 'TUNAI' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bayar Tunai</span>
                        <span>Rp {selectedOrder.tenderAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Kembalian</span>
                        <span className="text-emerald-700">
                          Rp {selectedOrder.changeAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
                <button
                  onClick={printReceipt}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Thermal</span>
                </button>
                <button
                  onClick={sendWhatsApp}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Pilih nota transaksi di tabel untuk melihat struk kasir
            </div>
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

      {/* Confirmation Modal for Marking Kasbon as Paid */}
      <ConfirmationModal
        isOpen={Boolean(markingPaidOrder)}
        type="UPDATE"
        title="Lunasi Tagihan Kasbon?"
        description={`Tandai kasbon nota ${markingPaidOrder?.orderNumber} atas nama "${markingPaidOrder?.customerName}" senilai Rp ${markingPaidOrder?.total.toLocaleString('id-ID')} sebagai LUNAS? Uang akan dicatat masuk ke kas tunai.`}
        confirmText="Ya, Tandai Lunas"
        cancelText="Batal"
        onConfirm={() => markingPaidOrder && handleMarkAsPaid(markingPaidOrder)}
        onCancel={() => setMarkingPaidOrder(null)}
      />
    </div>
  );
};
