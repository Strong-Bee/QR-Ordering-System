import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Plus, Minus, ArrowRight, TableProperties, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, Category } from '../types';
import { useAuth } from './AuthContext';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

interface CustomerOrderProps {
  tableNumber: number;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onGoToCart: () => void;
}

export default function CustomerOrder({ tableNumber, cart, setCart, onGoToCart }: CustomerOrderProps) {
  const { user, triggerAuthWithRestriction, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // For item detail modal
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [detailNote, setDetailNote] = useState('');

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`/api/menu`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
          setMenuItems(data.items);
          if (data.categories.length > 0) {
            setSelectedCategory(data.categories[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  const handleAddToCart = (item: MenuItem, qty: number, note: string) => {
    const existingIndex = cart.findIndex(c => c.menuItem.id === item.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += qty;
      if (note) {
        updated[existingIndex].note = updated[existingIndex].note 
          ? `${updated[existingIndex].note}, ${note}` 
          : note;
      }
      setCart(updated);
    } else {
      setCart([...cart, { menuItem: item, quantity: qty, note }]);
    }
    setSelectedItemForDetail(null);
    setDetailQuantity(1);
    setDetailNote('');
  };

  const updateQuantityDirect = (itemId: number, delta: number) => {
    const existingIndex = cart.findIndex(c => c.menuItem.id === itemId);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += delta;
      if (updated[existingIndex].quantity <= 0) {
        updated.splice(existingIndex, 1);
      }
      setCart(updated);
    } else if (delta > 0) {
      const item = menuItems.find(m => m.id === itemId);
      if (item) {
        setCart([...cart, { menuItem: item, quantity: 1, note: '' }]);
      }
    }
  };

  const getItemQuantityInCart = (itemId: number) => {
    const found = cart.find(c => c.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === null || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p);
  };

  return (
    <div className="min-h-screen bg-darkest pb-28 text-[#E0E0E0]">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0A0A] via-[#101010] to-[#050505] px-4 py-8 text-white border-b border-white/10 shadow-lg">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-brand/10 blur-xl"></div>
        <div className="absolute left-1/4 bottom-0 h-24 w-24 translate-y-12 rounded-full bg-brand/5 blur-lg"></div>
        
        <div className="relative mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-brand" />
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-md text-brand">
                QR ordering
              </span>
            </div>
            <div className="flex items-center space-x-1.5 bg-black/40 px-3 py-1.5 rounded-xl shadow-inner border border-white/10">
              <TableProperties className="h-4 w-4 text-brand" />
              <span className="font-bold text-sm text-white">Meja {tableNumber}</span>
            </div>
          </div>
          
          <h1 className="mt-4 text-2xl font-black tracking-tight font-sans text-white">
            Kasir QR Resto
          </h1>
          <p className="mt-1 text-sm text-white/50 font-light">
            Silakan pilih menu favorit Anda. Pesanan langsung diproses otomatis di dapur restoran setelah pembayaran berhasil!
          </p>
        </div>
      </div>

      {/* Loyal Customer multi-user header bar */}
      <div className="mx-auto max-w-md px-4 mt-4">
        {user ? (
          <div className="bg-dark-card border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3">
              <img
                src={user.photoURL}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-brand/30 shrink-0"
              />
              <div>
                <h4 className="text-xs font-black text-white leading-tight">Halo, {user.displayName}!</h4>
                <p className="text-[10px] text-brand font-semibold tracking-wide">Loyalty Partner ({user.providerId === 'google.com' ? 'Gmail' : 'Apple'})</p>
              </div>
            </div>
            
            <button
              onClick={() => logout()}
              className="px-2.5 py-1 text-[9px] uppercase font-black text-white/40 hover:text-rose-400 bg-white/5 hover:bg-white/10 rounded-lg border border-white/15 transition-all outline-none"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#120B05] to-[#0A0A0A] border border-brand/20 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-white leading-tight">Gunakan Loyalitas Digitalku</h4>
              <p className="text-[9px] text-white/50 leading-relaxed max-w-[215px] font-semibold">
                Klik login dengan akun <b>Gmail atau Apple</b> untuk mengumpulkan riwayat poin belanja dsb!
              </p>
            </div>
            <button
              onClick={() => triggerAuthWithRestriction(null)}
              className="px-3.5 py-2 bg-brand hover:bg-brand/90 transition-colors text-black font-extrabold text-[10px] uppercase rounded-xl shadow cursor-pointer outline-none shrink-0"
            >
              Login Akun
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-md px-4 mt-6">
        
        {/* Search Bar */}
        <div className="relative mb-5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-5 w-5 text-white/45" />
          </span>
          <input
            type="text"
            className="w-full bg-white/5 pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand outline-none text-sm placeholder-white/30 font-medium text-white transition-all"
            placeholder="Cari menu makanan atau minuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-none snap-x -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-250 snap-start shadow-sm border ${
              selectedCategory === null
                ? 'bg-brand text-black border-transparent'
                : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            Semua Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-250 snap-start shadow-sm border ${
                selectedCategory === cat.id
                  ? 'bg-brand text-black border-transparent'
                  : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Listings */}
        {loading ? (
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 p-3 bg-white/5 rounded-2xl shadow-sm animate-pulse border border-white/5">
                <div className="w-24 h-24 bg-white/15 rounded-xl" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-white/15 rounded w-2/3" />
                  <div className="h-3 bg-white/15 rounded w-5/6" />
                  <div className="h-4 bg-white/15 rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center text-white/30 mb-3">
              <Search className="h-7 w-7" />
            </div>
            <p className="text-white/50 font-medium text-sm">Tidak menemukan menu yang cocok</p>
            <p className="text-white/30 text-xs mt-1">Coba masukkan kata kunci pencarian yang berbeda</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {filteredItems.map((item) => {
              const cartQty = getItemQuantityInCart(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 p-3 bg-[#0E0E0E] rounded-xl shadow-sm border border-white/[0.04] hover:border-brand/35 transition-all group"
                >
                  <div 
                    className="relative w-24 h-24 rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedItemForDetail(item);
                      setDetailQuantity(1);
                      setDetailNote('');
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold bg-rose-600 px-1.5 py-0.5 rounded-full uppercase">Habis</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedItemForDetail(item);
                        setDetailQuantity(1);
                        setDetailNote('');
                      }}
                    >
                      <h3 className="font-bold text-[#E0E0E0] text-sm leading-snug group-hover:text-brand transition-colors">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-white/40 font-light mt-0.5 line-clamp-2 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-2 font-mono">
                      <span className="font-extrabold text-sm text-white">
                        {formatPrice(item.price)}
                      </span>
                      
                      {item.isAvailable && (
                        <div className="font-sans">
                          {cartQty > 0 ? (
                            <div className="flex items-center space-x-2.5 bg-brand/10 rounded-lg p-1 border border-brand/20">
                              <button
                                onClick={() => updateQuantityDirect(item.id, -1)}
                                className="h-6 w-6 bg-white/5 text-white rounded-md flex items-center justify-center hover:bg-brand hover:text-black active:scale-90 transition-all font-bold shadow-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-xs font-extrabold text-white w-4 text-center">
                                {cartQty}
                              </span>
                              <button
                                onClick={() => updateQuantityDirect(item.id, 1)}
                                className="h-6 w-6 bg-white/5 text-white rounded-md flex items-center justify-center hover:bg-brand hover:text-black active:scale-90 transition-all font-bold shadow-sm"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedItemForDetail(item);
                                setDetailQuantity(1);
                                setDetailNote('');
                              }}
                              className="px-3.5 py-1.5 bg-brand hover:bg-brand hover:scale-105 active:scale-95 text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow-sm transition-all"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Tambah</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Item Detail Sheet/Modal */}
      <AnimatePresence>
        {selectedItemForDetail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
            {/* Backdrop click */}
            <div className="absolute inset-0" onClick={() => setSelectedItemForDetail(null)} />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-dark-card rounded-t-2xl border-t border-white/10 shadow-xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
            >
              <div className="relative h-56 w-full">
                <img
                  src={selectedItemForDetail.image}
                  alt={selectedItemForDetail.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedItemForDetail(null)}
                  className="absolute right-4 top-4 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 font-semibold"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white">{selectedItemForDetail.name}</h2>
                  <span className="text-brand font-extrabold text-base block mt-1">
                    {formatPrice(selectedItemForDetail.price)}
                  </span>
                  {selectedItemForDetail.description && (
                    <p className="text-xs text-white/40 font-light leading-relaxed mt-2.5">
                      {selectedItemForDetail.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/5">
                  <label className="text-xs font-bold text-white/50 block mb-2">Catatan Tambahan (Opsional)</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:border-brand focus:bg-white/10 outline-none min-h-16 resize-none transition-all"
                    placeholder="Contoh: Sangat pedas, es dikurangi, telur matang..."
                    value={detailNote}
                    onChange={(e) => setDetailNote(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-xs font-bold text-white/40">Kuantitas</span>
                  <div className="flex items-center space-x-4 bg-white/5 border border-white/5 rounded-xl p-1.5">
                    <button
                      onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                      className="h-8 w-8 bg-white/5 text-white rounded-lg flex items-center justify-center hover:bg-brand hover:text-black active:scale-90 font-bold shadow-sm transition-all"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-extrabold text-white w-6 text-center">
                      {detailQuantity}
                    </span>
                    <button
                      onClick={() => setDetailQuantity(detailQuantity + 1)}
                      className="h-8 w-8 bg-white/5 text-white rounded-lg flex items-center justify-center hover:bg-brand hover:text-black active:scale-90 font-bold shadow-sm transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col font-mono">
                  <span className="text-[10px] text-white/40 uppercase font-semibold font-sans">Subtotal</span>
                  <span className="text-sm font-black text-white">
                    {formatPrice(selectedItemForDetail.price * detailQuantity)}
                  </span>
                </div>
                <button
                  onClick={() => handleAddToCart(selectedItemForDetail, detailQuantity, detailNote)}
                  className="px-6 py-3 bg-brand hover:scale-[1.02] active:scale-[0.98] text-black font-extrabold text-xs rounded-xl flex items-center space-x-2 shadow-md transition-all cursor-pointer font-bold"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Masukkan Keranjang</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Cart Bar */}
      <AnimatePresence>
        {totalCartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 bg-darkest/60 backdrop-blur-md px-4 py-4 z-40 border-t border-white/10"
          >
            <div className="mx-auto max-w-md">
              <button
                onClick={onGoToCart}
                className="w-full bg-brand text-black hover:scale-[1.01] active:scale-[0.99] px-5 py-3.5 rounded-xl flex items-center justify-between shadow-lg shadow-brand/10 transition-all cursor-pointer font-bold"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative bg-black/10 h-10 w-10 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-black" />
                    <span className="absolute -top-1.5 -right-1.5 bg-white text-black px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none">
                      {totalCartCount}
                    </span>
                  </div>
                  <div className="text-left font-sans">
                    <span className="text-[10px] text-black/60 uppercase tracking-widest block font-bold leading-none mb-1">Keranjang Belanja</span>
                    <span className="text-sm font-extrabold font-mono">{formatPrice(totalCartPrice)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-black font-extrabold pb-0.5">
                  <span className="text-xs font-black">Lanjut Bayar</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
