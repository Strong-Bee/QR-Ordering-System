import { useState, useEffect } from 'react';
import { 
  Coffee, ChefHat, TableProperties, Sparkles, LayoutDashboard, 
  ArrowRight, HeartHandshake, UtensilsCrossed, Maximize, Minimize 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Component imports
import CustomerOrder from './components/CustomerOrder';
import CustomerCart from './components/CustomerCart';
import CustomerSuccess from './components/CustomerSuccess';
import KitchenDisplay from './components/KitchenDisplay';
import AdminPanel from './components/AdminPanel';

import { MenuItem } from './types';
import { useAuth, UserRole } from './components/AuthContext';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

export default function App() {
  const { user, triggerAuthWithRestriction, logout } = useAuth();

  // Full Screen State & Support
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen mode not permitted because of iframe/sandbox constraints:", err);
      // Give fallback feedback just in case
      alert("Mode Layar Penuh (Fullscreen) terhalang oleh pembatasan iframe. Silakan klik tombol 'Buka Tab Baru' di kanan atas layar browser Anda / Settings untuk akses penuh.");
    }
  };

  // Simple Router State: 'launcher' | 'customer' | 'kitchen' | 'admin'
  const [view, setView] = useState<'launcher' | 'customer' | 'kitchen' | 'admin'>('launcher');
  const [tableNumber, setTableNumber] = useState<number>(1);
  
  // Customer flow: 'menu' | 'cart' | 'success'
  const [customerFlow, setCustomerFlow] = useState<'menu' | 'cart' | 'success'>('menu');
  const [placedOrderId, setPlacedOrderId] = useState<string>('');

  // Local-persisted cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Parse path or hash on mount/location changes to support exact requested URLs
  const parseCurrentUrl = () => {
    const pathname = window.location.pathname;
    const hash = window.location.hash;

    // Check pathname: /order/3
    const orderPathMatch = pathname.match(/\/order\/(\{?\d+\}?)/);
    const orderHashMatch = hash.match(/#\/order\/(\d+)/);

    if (orderPathMatch) {
      const tableNum = parseInt(orderPathMatch[1].replace(/[{}]/g, ''), 10);
      if (!isNaN(tableNum)) {
        setTableNumber(tableNum);
        setView('customer');
        setCustomerFlow('menu');
        return;
      }
    } else if (orderHashMatch) {
      const tableNum = parseInt(orderHashMatch[1], 10);
      if (!isNaN(tableNum)) {
        setTableNumber(tableNum);
        setView('customer');
        setCustomerFlow('menu');
        return;
      }
    }

    if (pathname === '/kitchen' || hash === '#/kitchen') {
      setView('kitchen');
    } else if (pathname === '/admin/dashboard' || hash === '#/admin' || pathname.startsWith('/admin')) {
      setView('admin');
    } else {
      setView('launcher');
    }
  };

  useEffect(() => {
    // Initial parse
    parseCurrentUrl();

    // Listen on popstate
    const handlePopState = () => {
      parseCurrentUrl();
    };
    window.addEventListener('popstate', handlePopState);
    
    // Load existing cart if any
    try {
      const stored = localStorage.getItem('qr_restaurant_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to restore cart from localStorage:', e);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync cart to localStorage whenever changed
  const handleSetCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('qr_restaurant_cart', JSON.stringify(newCart));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigate = (targetView: 'launcher' | 'customer' | 'kitchen' | 'admin', tableNo?: number) => {
    if (targetView === 'customer' && tableNo) {
      setTableNumber(tableNo);
      setCustomerFlow('menu');
      window.history.pushState({}, '', `/order/${tableNo}`);
      setView(targetView);
    } else if (targetView === 'kitchen') {
      if (user && (user.role === UserRole.DAPUR || user.role === UserRole.ADMIN || user.role === UserRole.OWNER)) {
        window.history.pushState({}, '', '/kitchen');
        setView(targetView);
      } else {
        triggerAuthWithRestriction(UserRole.DAPUR, () => {
          window.history.pushState({}, '', '/kitchen');
          setView('kitchen');
        });
      }
    } else if (targetView === 'admin') {
      if (user && (user.role === UserRole.ADMIN || user.role === UserRole.KASIR || user.role === UserRole.OWNER)) {
        window.history.pushState({}, '', '/admin/dashboard');
        setView(targetView);
      } else {
        triggerAuthWithRestriction(UserRole.ADMIN, () => {
          window.history.pushState({}, '', '/admin/dashboard');
          setView('admin');
        });
      }
    } else {
      window.history.pushState({}, '', '/');
      setView(targetView);
    }
  };

  const handleOrderPlaced = (orderId: string) => {
    setPlacedOrderId(orderId);
    setCart([]); // Clear cart
    localStorage.removeItem('qr_restaurant_cart');
    setCustomerFlow('success');
  };

  const renderActiveView = () => {
    switch (view) {
      case 'customer':
        if (customerFlow === 'menu') {
          return (
            <CustomerOrder
              tableNumber={tableNumber}
              cart={cart}
              setCart={handleSetCart}
              onGoToCart={() => setCustomerFlow('cart')}
            />
          );
        } else if (customerFlow === 'cart') {
          return (
            <CustomerCart
              tableNumber={tableNumber}
              cart={cart}
              setCart={handleSetCart}
              onBackToMenu={() => setCustomerFlow('menu')}
              onOrderPlaced={handleOrderPlaced}
            />
          );
        } else {
          return (
            <CustomerSuccess
              orderId={placedOrderId}
              tableNumber={tableNumber}
              onDone={() => setCustomerFlow('menu')}
            />
          );
        }

      case 'kitchen':
        return <KitchenDisplay />;

      case 'admin':
        return <AdminPanel />;

      case 'launcher':
      default:
        return (
          <div className="min-h-screen bg-darkest text-[#E0E0E0] flex flex-col justify-center relative overflow-hidden font-sans">
            {/* Elegant Floating Top Navigation Header */}
            <div className="absolute top-0 inset-x-0 p-4 md:px-12 flex items-center justify-between z-20">
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="h-5 w-5 text-brand" />
                <span className="font-mono font-extrabold text-[#E0E0E0] tracking-wider uppercase text-xs">QR Resto & Cafe</span>
              </div>
              
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-dark-card hover:bg-white/10 text-white rounded-full border border-white/15 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                  title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh Kiosk"}
                >
                  {isFullscreen ? <Minimize className="h-4 w-4 text-brand" /> : <Maximize className="h-4 w-4 text-brand" />}
                </button>

                {user ? (
                  <div className="flex items-center space-x-3 bg-dark-card border border-white/10 p-1.5 pl-3.5 pr-2 rounded-full shadow-sm">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-white block leading-none">{user.displayName}</span>
                      <span className={`text-[8px] font-mono tracking-wider font-semibold block uppercase mt-0.5 ${
                        user.role === UserRole.OWNER ? 'text-purple-400 font-bold' : 'text-brand'
                      }`}>{user.role}</span>
                    </div>
                    <img
                      src={user.photoURL}
                      alt=""
                      className="h-8.5 w-8.5 rounded-full border border-white/10 object-cover"
                    />
                    <button
                      onClick={() => logout()}
                      className="text-[9px] uppercase font-black tracking-wider text-rose-400 hover:text-rose-300 ml-1 bg-white/5 py-1 px-2.5 rounded-lg border border-white/5 active:scale-95 transition-all cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => triggerAuthWithRestriction(null)}
                    className="px-4.5 py-1.5 bg-brand/10 border border-brand/20 hover:bg-brand hover:text-black font-extrabold text-xs tracking-wider rounded-full transition-all text-brand uppercase cursor-pointer"
                  >
                    Masuk Akun
                  </button>
                )}
              </div>
            </div>

            {/* Ambient gradients */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl translate-x-[-20%] translate-y-[-20%]"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl translate-x-[20%] translate-y-[20%]"></div>
            
            <div className="max-w-4xl w-full mx-auto px-6 py-12 z-10 space-y-12">
              
              {/* Branding Section */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center space-x-2 bg-brand/10 border border-brand/20 px-3.5 py-1.5 rounded-full text-brand">
                  <Sparkles className="h-4.5 w-4.5 animate-spin-slow text-brand" />
                  <span className="text-[10px] uppercase tracking-widest font-black leading-none">QR Cafe & Cashier Suite</span>
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-2xl mx-auto">
                  Sistem Kasir QR Ordering <br className="hidden md:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-amber-500">&amp; Payment Gateway</span>
                </h1>
                
                <p className="text-xs md:text-sm text-white/50 max-w-lg mx-auto font-light leading-relaxed">
                  Platform digitalisasi resto end-to-end. Scan meja, pesan via e-menu digital, checkout lunas otomatis dengan simulasi Midtrans Snap, antrean live KDS dapur, dan reports dashboard admin.
                </p>
              </div>

              {/* Roles Launch Portal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                
                {/* 1. Customer Card */}
                <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-6 hover:border-brand/45 hover:bg-dark-card transition-all flex flex-col justify-between h-72">
                  <div>
                    <div className="h-11 w-11 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand mb-4">
                      <Coffee className="h-5.5 w-5.5" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Layanan Pembeli</h3>
                    <p className="text-[11px] text-white/40 font-light mt-1.5 leading-relaxed">
                      Lakukan simulasi scan QR code menu digital dari sisi pembeli. Tambahkan makanan ke keranjang, lunas instan, pantau pesanan Anda.
                    </p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <span className="text-[9px] uppercase font-black text-white/30 tracking-wider block">Pilih Meja Untuk Memulai</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((no) => (
                        <button
                          key={no}
                          onClick={() => handleNavigate('customer', no)}
                          className="flex-1 py-1.5 bg-white/5 hover:bg-brand hover:text-black hover:border-brand border border-white/5 rounded-lg text-xs font-black transition-all cursor-pointer text-white"
                        >
                          M{no}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Kitchen KDS Card */}
                <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-6 hover:border-brand/45 hover:bg-dark-card transition-all flex flex-col justify-between h-72">
                  <div>
                    <div className="h-11 w-11 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand mb-4">
                      <ChefHat className="h-5.5 w-5.5" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kitchen Display (KDS)</h3>
                    <p className="text-[11px] text-white/40 font-light mt-1.5 leading-relaxed">
                      Monitor pesanan di dapur secara real-time. Terdapat chime sound alert saat ada pesanan baru sukses lunas. Mulai memasak dan sajikan hidangan dalam sekali klik!
                    </p>
                  </div>

                  <button
                    onClick={() => handleNavigate('kitchen')}
                    className="w-full py-3 bg-white/5 hover:bg-brand hover:text-black border border-white/5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all text-white cursor-pointer"
                  >
                    <span>Masuk Monitor Dapur</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* 3. Cashier BackOffice Card */}
                <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-6 hover:border-brand/45 hover:bg-dark-card transition-all flex flex-col justify-between h-72">
                  <div>
                    <div className="h-11 w-11 rounded-xl bg-brand/10 border border-brand/25 flex items-center justify-center text-brand mb-4">
                      <LayoutDashboard className="h-5.5 w-5.5" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kasir & Admin Panel</h3>
                    <p className="text-[11px] text-white/40 font-light mt-1.5 leading-relaxed">
                      Kendalikan rincian omset restoran. Kelola CRUD menu makanan, datakan meja makan baru, cetak laporan omset otomatis, dan bypass status bayar kasir langsung.
                    </p>
                  </div>

                  <button
                    onClick={() => handleNavigate('admin')}
                    className="w-full py-3 bg-white/5 hover:bg-brand hover:text-black border border-white/5 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all text-white cursor-pointer"
                  >
                    <span>Buka Portal Admin</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Specs & Info bar */}
              <div className="max-w-xl mx-auto p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center flex items-center justify-center gap-2.5 text-xs text-white/40">
                <HeartHandshake className="h-4.5 w-4.5 text-brand shrink-0" />
                <span>Tekan tombol <b>Sinkronisasi</b> atau navigasi di sidebar info kapan saja demi menyatukan visual state.</span>
              </div>

            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-darkest text-[#E0E0E0] font-sans">
      {/* Dynamic Dev top Bar showing active mode only if NOT in root launcher mode to easily return */}
      {view !== 'launcher' && (
        <div className="bg-[#0A0A0A] border-b border-white/10 text-white p-3.5 px-6 flex items-center justify-between text-xs font-medium z-30 relative shrink-0">
          <div className="flex items-center space-x-2">
            <UtensilsCrossed className="h-4 w-4 text-brand animate-pulse" />
            <span>Mode Aktif: <b className="text-brand tracking-wide uppercase">{view === 'customer' ? `Pelanggan Meja ${tableNumber}` : view === 'kitchen' ? 'KDS Monitor Dapur' : 'Admin & Kasir Panel'}</b></span>
          </div>
          
          <div className="flex items-center space-x-3.5">
            {user && (
              <div className="hidden sm:flex items-center space-x-2 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover shrink-0 border border-white/10"
                />
                <span className="text-[10px] text-white/70 max-w-28 truncate">{user.displayName}</span>
                <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                  user.role === UserRole.OWNER 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                    : 'bg-brand/20 text-brand'
                }`}>{user.role}</span>
              </div>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer border border-white/10 flex items-center gap-1.5 shrink-0"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5 text-brand" /> : <Maximize className="h-3.5 w-3.5 text-brand" />}
              <span className="hidden md:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
            </button>

            <button
              onClick={() => handleNavigate('launcher')}
              className="px-3 py-1.5 bg-white/5 hover:bg-brand hover:text-black text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer border border-white/10"
            >
              Kembali Ke Beranda
            </button>
          </div>
        </div>
      )}

      {renderActiveView()}
    </div>
  );
}
