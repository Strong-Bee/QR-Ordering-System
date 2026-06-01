import { useState, useEffect, useRef } from 'react';
import { ChefHat, Check, Clock, Volume2, VolumeX, Flame, ShoppingBag, Coffee, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderStatus, OrderWithItems } from '../types';
import { useAuth, UserRole } from './AuthContext';

export default function KitchenDisplay() {
  const { user, triggerAuthWithRestriction } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous order IDs to know when to play sound for new incoming orders
  const previousOrderIds = useRef<string[]>([]);

  // Authorized shadow fetch to prevent hacker attempts
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = {
      ...(init?.headers || {}),
      'x-user-email': user?.email || '',
      'x-user-role': user?.role || ''
    };
    return window.fetch(input, { ...init, headers });
  };

  if (!user || (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN && user.role !== UserRole.DAPUR)) {
    return (
      <div className="min-h-screen bg-darkest text-[#E0E0E0] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#0E0E0E] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-450">
            <ChefHat className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Akses KDS Terbatas</h2>
            <p className="text-xs text-white/40 leading-relaxed">
              Halaman Kitchen Display System (KDS) ini diamankan secara ketat dari penyusup. Silakan verifikasi akun tim dapur (<span className="text-brand font-bold">DAPUR</span> atau <span className="text-brand font-bold">ADMIN / OWNER</span>) untuk memantau pengerjaan menu.
            </p>
          </div>
          <button
            onClick={() => triggerAuthWithRestriction(UserRole.DAPUR)}
            className="w-full py-3 bg-brand hover:bg-brand/90 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer font-sans"
          >
            Verifikasi & Login Staff Dapur
          </button>
        </div>
      </div>
    );
  }

  // Synthesize audial alert using HTML5 Web Audio API
  const playAlertSound = () => {
    if (muted) return;
    try {
      const AudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Make a beautiful triple-chime kitchen alert
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = AudioCtx.createOscillator();
        const gain = AudioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(AudioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = AudioCtx.currentTime;
      playTone(523.25, now, 0.2); // C5
      playTone(659.25, now + 0.15, 0.2); // E5
      playTone(783.99, now + 0.3, 0.4); // G5
    } catch (e) {
      console.warn('AudioContext beep blocked or unsupported:', e);
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      const res = await fetch(`/api/admin/orders`);
      if (res.ok) {
        const data = await res.json();
        // Filter orders relevant to the kitchen: PAID, PREPARING, or READY
        const kitchenFiltered = (data as OrderWithItems[]).filter(o => 
          o.status === OrderStatus.PAID || 
          o.status === OrderStatus.PREPARING || 
          o.status === OrderStatus.READY
        );

        // Sort by status priority: PREPARING first, then PAID, then READY. Oldest first for speed
        const sorted = kitchenFiltered.sort((a, b) => {
          const statusOrder = {
            [OrderStatus.PREPARING]: 1,
            [OrderStatus.PAID]: 2,
            [OrderStatus.READY]: 3,
            [OrderStatus.PENDING_PAYMENT]: 4,
            [OrderStatus.SERVED]: 5,
            [OrderStatus.CANCELLED]: 6,
          };
          
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        // Detect new incoming orders and ring bell
        const currentIds = sorted.map(o => o.id);
        if (previousOrderIds.current.length > 0) {
          const hasNew = currentIds.some(id => !previousOrderIds.current.includes(id));
          if (hasNew) {
            playAlertSound();
          }
        }
        previousOrderIds.current = currentIds;

        setOrders(sorted);
        setError(null);
      } else {
        setError('Gagal sinkronisasi data dapur');
      }
    } catch (err) {
      console.error(err);
      setError('Masalah jaringan KDS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();

    // 1. Establish live Server-Side Events subscription
    const sse = new EventSource('/api/sse/orders');
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE signal in Kitchen Display:', data.type);
        // Refresh kitchen whenever there is any update
        fetchKitchenOrders();
      } catch (err) {
        console.error('Failed to process message from KDS SSE:', err);
      }
    };

    sse.onerror = () => {
      console.warn('Kitchen KDS SSE connection dropped, falling back to polling...');
    };

    // 2. Poll fallback every 4 seconds to catch up
    const interval = setInterval(() => {
      fetchKitchenOrders();
    }, 4000);

    return () => {
      sse.close();
      clearInterval(interval);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus = OrderStatus.PREPARING;
    if (currentStatus === OrderStatus.PAID) nextStatus = OrderStatus.PREPARING;
    else if (currentStatus === OrderStatus.PREPARING) nextStatus = OrderStatus.READY;
    else if (currentStatus === OrderStatus.READY) nextStatus = OrderStatus.SERVED;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        // Success update
        fetchKitchenOrders();
      } else {
        alert('Gagal memperbarui status masakan');
      }
    } catch (err) {
      console.error(err);
      alert('Masalah koneksi server saat mengubah status');
    }
  };

  const getMinuteDiff = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    return diffMin;
  };

  return (
    <div className="min-h-screen bg-darkest text-[#E0E0E0] flex flex-col font-sans">
      
      {/* KDS Header */}
      <header className="bg-[#0A0A0A] border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-brand/20 border border-brand/35 flex items-center justify-center text-brand">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-brand">Kitchen Display System (KDS)</h1>
            <span className="text-[10px] text-white/40 font-semibold block leading-tight">MONITOR ANTRIAN PERSIPAN DAPUR</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mute alerts */}
          <button
            onClick={() => setMuted(!muted)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              muted 
                ? 'bg-rose-950/20 border-rose-900/30 text-rose-450 hover:bg-rose-950/30' 
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            title={muted ? 'Buka suara notifikasi' : 'Senapkan suara notifikasi'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          
          <button 
            onClick={fetchKitchenOrders}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-all font-bold text-xs cursor-pointer"
          >
            Refresh ({orders.length})
          </button>
        </div>
      </header>

      {/* Main Board view */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-[#0E0E0E] border border-white/[0.04] rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-950/10 border border-rose-900/30 rounded-xl text-center max-w-lg mx-auto mt-16 text-rose-400 font-bold text-sm">
            ❌ {error} - Menghubungkan ulang...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center bg-white/[0.01] border border-white/[0.04] rounded-2xl max-w-xl mx-auto">
            <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/30 mb-4 shadow-inner">
              <ChefHat className="h-8 w-8" />
            </div>
            <p className="text-white/60 font-bold text-base">Antrean Dapur Kosong</p>
            <p className="text-white/30 text-xs mt-1.5 max-w-xs px-4 leading-relaxed">Tidak ada piring yang perlu dimasak saat ini. Silakan bersantai atau tata inventaris.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {orders.map((order) => {
                const totalMinutes = getMinuteDiff(order.createdAt);
                
                // Color card headers based on urgent timer and status code
                let headerBg = 'bg-[#0E0E0E] border-white/5';
                let indicatorColor = 'bg-amber-500';

                if (order.status === OrderStatus.PAID) {
                  headerBg = 'bg-white/[0.01] border-white/[0.04] text-white';
                  indicatorColor = 'bg-blue-400';
                } else if (order.status === OrderStatus.PREPARING) {
                  headerBg = 'bg-amber-950/15 border-amber-900/20 text-amber-250';
                  indicatorColor = 'bg-brand animate-pulse';
                } else if (order.status === OrderStatus.READY) {
                  headerBg = 'bg-emerald-950/15 border-emerald-900/20 text-emerald-250';
                  indicatorColor = 'bg-emerald-400';
                }

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-[#0E0E0E] rounded-xl flex flex-col shadow-xl overflow-hidden border border-white/[0.04] group"
                  >
                    {/* Header bar card */}
                    <div className={`p-4 border-b flex items-start justify-between ${headerBg}`}>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${indicatorColor}`} />
                          <h3 className="font-extrabold text-sm tracking-wide text-white">Meja {order.tableNumber || '?'}</h3>
                        </div>
                        <span className="text-[10px] text-white/40 block mt-1 font-semibold">
                          {order.customerName || 'Pelanggan'}
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="flex items-center text-[10px] text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                          <Clock className="h-3 w-3 mr-1 text-white/40" />
                          <span className="font-extrabold font-mono">{totalMinutes} Mnt</span>
                        </div>
                        <span className="text-[9px] text-white/30 block mt-1.5 font-mono">
                          #{order.id.split('-')[2] || order.id.slice(-6)}
                        </span>
                      </div>
                    </div>

                    {/* Order Memo note if any */}
                    {order.note && (
                      <div className="bg-amber-950/10 text-amber-400 border-b border-white/5 px-4 py-2 text-[10px] font-extrabold leading-normal">
                        📝 Catatan Meja: "{order.note}"
                      </div>
                    )}

                    {/* Food Items List */}
                    <div className="p-4 flex-1 divide-y divide-white/5 overflow-y-auto space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-start pt-3 first:pt-0">
                          <div className="flex-1 pr-2">
                            <h4 className="text-white text-xs font-black tracking-wide leading-relaxed">
                              {item.menuItem?.name || 'Menu Pilihan'}
                            </h4>
                            {item.note && (
                              <p className="text-[10px] text-brand/80 font-bold mt-0.5">
                                • {item.note}
                              </p>
                            )}
                          </div>
                          
                          <span className="font-bold text-xs text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20 leading-none shrink-0 self-start font-mono">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Status Controllers */}
                    <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between gap-3">
                      <div className="text-left shrink-0 font-sans">
                        <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold block">Status Tiket</span>
                        <span className="text-xs font-extrabold pb-0.5 inline-block text-white">
                          {order.status === OrderStatus.PAID && 'Pesanan Masuk'}
                          {order.status === OrderStatus.PREPARING && 'Sedang Dimasak'}
                          {order.status === OrderStatus.READY && 'Matang/Siap'}
                        </span>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id, order.status)}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-1.5 shadow-md active:scale-95 transition-all text-black cursor-pointer font-bold ${
                          order.status === OrderStatus.PAID
                            ? 'bg-brand text-black hover:bg-brand/90'
                            : order.status === OrderStatus.PREPARING
                            ? 'bg-amber-500 text-black hover:bg-amber-600 shadow-amber-950/15'
                            : 'bg-emerald-500 text-black hover:bg-emerald-600'
                        }`}
                      >
                        <span>
                          {order.status === OrderStatus.PAID && 'Mulai Masak'}
                          {order.status === OrderStatus.PREPARING && 'Selesai Masak'}
                          {order.status === OrderStatus.READY && 'Sajikan Meja'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

    </div>
  );
}
