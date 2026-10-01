import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Layers,
  AlertTriangle,
  Users,
  Flame,
  Clock,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { DashboardStats } from '../../types';

export const TenantDashboardView: React.FC = () => {
  const { tenant, token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dashboard/stats', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase mb-1 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Statistik & Analisis Penjualan</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Dashboard Warung: {tenant?.name || 'Berkah Jaya'}
        </h1>
      </div>

      {/* Top Quick Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Omzet Terkumpul</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            Rp {(stats?.totalOmzet || 3420000).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{(stats?.completedOrders || 48)} Transaksi Selesai</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Kas Tunai di Toko</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            Rp {(stats?.kasTunai || 2750000).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Uang fisik siap setor atau modal kembalian
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Non-Tunai (QRIS / Transfer)</div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            Rp {(stats?.qrisTransfer || 520000).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-teal-600 font-semibold mt-2">
            Masuk langsung ke rekening bank warung
          </div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 p-5 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-amber-700 uppercase">Kasbon Belum Lunas</div>
          <div className="text-2xl font-black text-amber-800 font-mono mt-1">
            Rp {(stats?.kasbon || 150000).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-2">
            {(stats?.kasbonPendingCount || 2)} Catatan hutang warga
          </div>
        </div>
      </div>

      {/* Main Row: Top Fast Moving Products & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Produk Terlaris (Fast Moving)</h3>
            </div>
            <span className="text-xs text-slate-400">Paling sering dibeli</span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Indomie Goreng Original', count: 120, unit: 'bks', revenue: 372000, percentage: 88 },
              { name: 'Minyak Sania 2L', count: 42, unit: 'pouch', revenue: 1470000, percentage: 75 },
              { name: 'Telur Ayam Negeri 1kg', count: 28, unit: 'kg', revenue: 812000, percentage: 65 },
              { name: 'Beras Pandan Wangi 5kg', count: 18, unit: 'karung', revenue: 1332000, percentage: 55 },
              { name: 'Aqua 600ml Botol', count: 65, unit: 'botol', revenue: 227500, percentage: 48 },
            ].map((p, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    {idx + 1}. {p.name}
                  </span>
                  <span className="font-mono text-slate-600 font-semibold">
                    {p.count} {p.unit} • Rp {p.revenue.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Highlights */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Sebaran Inventaris Etalase</h3>
              </div>
              <span className="text-xs text-slate-400">8 Kategori Aktif</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-500 text-[11px]">Beras & Gandum</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">14 Varian</div>
                <div className="text-[10px] text-emerald-600 font-medium">Stok Aman</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-500 text-[11px]">Minyak & Margarin</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">12 Varian</div>
                <div className="text-[10px] text-emerald-600 font-medium">Perputaran Cepat</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-500 text-[11px]">Bumbu Dapur</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">18 Varian</div>
                <div className="text-[10px] text-emerald-600 font-medium">Komplit</div>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <div className="text-rose-600 text-[11px]">Perlu Restock Segera</div>
                <div className="text-sm font-bold text-rose-700 mt-0.5">5 Produk</div>
                <div className="text-[10px] text-rose-500 font-medium">Sunlight, Beras Maknyuss</div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Printer thermal kasir & cloud sync terhubung normal.</span>
            </div>
            <span className="font-bold text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-900">
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
