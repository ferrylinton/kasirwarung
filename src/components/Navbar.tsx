import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ScanBarcode,
  ShoppingCart,
  Menu,
  X,
  Loader2,
  Package,
  Plus,
  ArrowRight,
  Boxes,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { Product } from '../types';

export interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigateToPOS: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToConfiguration?: () => void;
  onNavigateToCatalog?: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  showSearchBar?: boolean;
  currentTab?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNavigateToPOS,
  onNavigateToCatalog,
  onSearchChange,
  searchQuery,
  showSearchBar = true,
  currentTab,
}) => {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const { getItemCount, addItem } = useCartStore();
  const { addToast } = useToastStore();
  const itemCount = getItemCount();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global F2 keyboard shortcut to focus search input (standard POS barcode scan shortcut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSearchBar) return;
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsDropdownOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchBar]);

  // Ensure dropdown and results are cleared when search bar is hidden
  useEffect(() => {
    if (!showSearchBar) {
      setIsDropdownOpen(false);
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [showSearchBar]);

  // Saat pindah halaman/tab:
  // 1. Live Auto-suggest dropdown tidak diaktifkan (ditutup)
  // 2. Hasil pencarian dikosongkan
  // 3. Search Bar Navbar direset (dikosongkan)
  // 4. Fokus input dilepaskan (blur)
  useEffect(() => {
    setIsDropdownOpen(false);
    setSearchResults([]);
    setIsLoading(false);
    onSearchChange('');
    inputRef.current?.blur();
  }, [currentTab]);

  // Debounced backend search query
  useEffect(() => {
    if (!showSearchBar) {
      setIsDropdownOpen(false);
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsLoading(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}&limit=8`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (showSearchBar) {
            setSearchResults(data.products || []);
            setIsDropdownOpen(true);
          }
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Failed to search products:', err);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, token, showSearchBar]);

  const handleClear = () => {
    onSearchChange('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const success = addItem(product, 1);
    if (success) {
      setAddedProductId(product.id);
      setTimeout(() => setAddedProductId(null), 1200);
      addToast({
        type: 'success',
        title: 'Ditambahkan ke Pesanan',
        message: `${product.name} (1 ${product.unit || 'pcs'}) dimasukkan ke kasir.`,
        duration: 3000,
      });
    } else {
      addToast({
        type: 'warning',
        title: 'Stok Tidak Cukup',
        message: `Stok produk ${product.name} tidak mencukupi untuk ditambahkan.`,
      });
    }
  };

  const handleSelectProduct = (product: Product) => {
    setIsDropdownOpen(false);
    setSearchResults([]);
    onSearchChange('');
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    }
  };

  const handleViewAllInCatalog = () => {
    setIsDropdownOpen(false);
    setSearchResults([]);
    onSearchChange('');
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    }
  };

  // Keyboard navigation inside search dropdown
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchResults.length === 0) {
      if (e.key === 'Enter') {
        handleViewAllInCatalog();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        const item = searchResults[selectedIndex];
        handleAddToCart(e as any, item);
      } else {
        handleViewAllInCatalog();
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleBarcodeClick = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
    setIsDropdownOpen(true);
    addToast({
      type: 'info',
      title: 'Scan Barcode Aktif',
      message: 'Gunakan scanner barcode fisik atau ketik kode SKU pada kolom pencarian.',
      duration: 3500,
    });
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-3 md:px-6 transition-colors">
      {/* Left: Mobile hamburger & Global Fast Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar Container */}
        {showSearchBar && (
          <div ref={containerRef} className="relative flex-1">
            <div className="relative">
              {isLoading ? (
                <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-primary animate-spin" />
              ) : (
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              )}

            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={t('nav.searchPlaceholder', 'Cari produk cepat (nama sembako atau scan barcode)...')}
              className="w-full pl-9 pr-16 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-900 focus:border-theme-primary focus:outline-hidden transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs"
            />

            {/* Clear & Barcode Action Buttons inside Input */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleBarcodeClick}
                className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-theme-primary hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={t('nav.scanBarcode', 'Tekan F2 untuk Scan Barcode')}
              >
                <ScanBarcode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Search Dropdown Panel */}
          {isDropdownOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] sm:min-w-[460px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in-80 zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Hasil Pencarian Produk
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    {searchResults.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="hidden sm:inline">Navigasi: ↑↓ Enter</span>
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Body: Product List or Empty state */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoading && searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-theme-primary animate-spin" />
                    <span>Mencari di database sembako...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tidak Ada Produk Ditemukan
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Tidak ada produk sembako yang cocok dengan kata kunci &quot;{searchQuery}&quot;. Periksa kembali ejaan atau SKU barcode.
                    </p>
                  </div>
                ) : (
                  searchResults.map((product, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isJustAdded = addedProductId === product.id;
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = !isOutOfStock && product.stock <= product.minStock;

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`flex items-center justify-between p-3 gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-theme-light dark:bg-slate-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Product Image & Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback icon on broken image
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {product.name}
                              </span>
                              {product.category && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                  {product.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="font-mono text-slate-400 dark:text-slate-500">
                                {product.sku}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span
                                className={`font-semibold ${
                                  isOutOfStock
                                    ? 'text-rose-500'
                                    : isLowStock
                                    ? 'text-amber-500'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {isOutOfStock
                                  ? 'Habis'
                                  : `Stok: ${product.stock} ${product.unit || 'pcs'}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Action Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              Rp {product.price.toLocaleString('id-ID')}
                            </span>
                            {product.unit && (
                              <span className="block text-[10px] text-slate-400">
                                /{product.unit}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => handleAddToCart(e, product)}
                            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                              isJustAdded
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isOutOfStock
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-theme-primary text-white hover:opacity-90 shadow-xs'
                            }`}
                            title={isOutOfStock ? 'Stok habis' : 'Tambah ke pesanan kasir'}
                          >
                            {isJustAdded ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer: View in Catalog action */}
              {searchResults.length > 0 && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850">
                  <button
                    type="button"
                    onClick={handleViewAllInCatalog}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Semua Hasil di Katalog Produk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Right Controls: Cart / Pesanan Flyout button */}
      <div className="flex items-center gap-2 pl-2">
        <button
          onClick={() => {
            setIsDropdownOpen(false);
            setSearchResults([]);
            onSearchChange('');
            onNavigateToPOS();
          }}
          className="relative flex items-center gap-2 py-1.5 px-3 bg-theme-light hover:opacity-90 border border-theme-border text-theme-text rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 text-theme-primary" />
          <span className="hidden xs:inline">{t('nav.orders', 'Pesanan')}</span>
          {itemCount > 0 && (
            <span className="bg-amber-500 text-white text-[11px] px-1.5 py-0.2 rounded-full font-mono">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
