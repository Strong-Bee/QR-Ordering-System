import { useState, useEffect } from 'react';
import { ChevronLeft, ShoppingBag, Plus, Minus, Trash2, User, CreditCard, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem } from '../types';
import { useAuth } from './AuthContext';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note: string;
}

interface CustomerCartProps {
  tableNumber: number;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  onBackToMenu: () => void;
  onOrderPlaced: (orderId: string) => void;
}

export default function CustomerCart({ tableNumber, cart, setCart, onBackToMenu, onOrderPlaced }: CustomerCartProps) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (user) {
      if (!customerName) {
        setCustomerName(user.displayName);
      }
      if (!customerEmail) {
        setCustomerEmail(f => f || user.email);
      }
    }
  }, [user]);
  const [orderNote, setOrderNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation overlay
  const [showSimulatedSnap, setShowSimulatedSnap] = useState(false);
  const [simulatedSnapToken, setSimulatedSnapToken] = useState('');
  const [simulatedOrderId, setSimulatedOrderId] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<'QRIS' | 'GOPAY' | 'BANK'>('QRIS');

  useEffect(() => {
    const clientKey = (import.meta as any).env.VITE_MIDTRANS_CLIENT_KEY;
    if (clientKey) {
      const snapScriptUrl = (import.meta as any).env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';

      const scriptId = 'midtrans-snap-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = snapScriptUrl;
        script.setAttribute('data-client-key', clientKey);
        document.body.appendChild(script);
      }
    }
  }, []);

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p);
  };

  const updateQuantity = (itemId: number, delta: number) => {
    const updated = cart.map(item => {
      if (item.menuItem.id === itemId) {
        const nextQty = item.quantity + delta;
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(updated);
  };

  const removeItem = (itemId: number) => {
    setCart(cart.filter(item => item.menuItem.id !== itemId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch table metadata from table endpoint
      const tableRes = await fetch(`/api/table/${tableNumber}`);
      if (!tableRes.ok) {
        const errorData = await tableRes.json();
        throw new Error(errorData.error || 'Meja tidak terdaftar di sistem');
      }
      const tableData = await tableRes.json();

      // 2. Create the Order in our DB
      const orderPayload = {
        tableId: tableData.id,
        customerName: customerName.trim() || `Pelanggan Meja ${tableNumber}`,
        customerEmail: customerEmail.trim() || undefined,
        note: orderNote.trim(),
        items: cart.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          note: item.note
        }))
      };

      const res = await fetch(`/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal memproses pesanan di server');
      }

      const data = await res.json();
      const snapToken = data.midtransSnapToken;
      const orderId = data.order.id;

      setSimulatedOrderId(orderId);
      setSimulatedSnapToken(snapToken);

      // Check for real snap object on window (if script loaded successfully outside iframe)
      if (typeof window !== 'undefined' && (window as any).snap && (window as any).snap.pay) {
        setLoading(false);
        (window as any).snap.pay(snapToken, {
          onSuccess: async (result: any) => {
            console.log('Payment success:', result);
            // Inform server of success
            await fetch('/api/payment/notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: orderId,
                transaction_status: 'settlement',
                fraud_status: 'accept',
                payment_type: result.payment_type || 'credit_card'
              })
            });
            onOrderPlaced(orderId);
          },
          onPending: () => {
            onOrderPlaced(orderId);
          },
          onError: (err: any) => {
            console.error('Snap payment error:', err);
            setError('Pembayaran gagal, silakan coba lagi');
          },
          onClose: () => {
            // Re-open simulator or stay
            setShowSimulatedSnap(true);
          }
        });
      } else {
        // Fallback to fully immersive sandbox payment UI
        setLoading(false);
        setShowSimulatedSnap(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Koneksi gagal atau bermasalah');
      setLoading(false);
    }
  };

  const handleSimulatedPaymentSuccess = async () => {
    setLoading(true);
    try {
      // Call mock webhook of payments notification
      const mockPayInfo = {
        order_id: simulatedOrderId,
        transaction_status: 'settlement',
        fraud_status: 'accept',
        payment_type: paymentChoice
      };

      const res = await fetch('/api/payment/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayInfo)
      });

      if (res.ok) {
        setShowSimulatedSnap(false);
        onOrderPlaced(simulatedOrderId);
      } else {
        setError('Gagal memperbarui status pembayaran simulasi');
      }
    } catch (err) {
      setError('Kesalahan jaringan saat simulasi pembayaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-darkest pb-20 text-[#E0E0E0]">
      
      {/* App bar header */}
      <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 shadow-lg px-4 py-4 z-20">
        <div className="mx-auto max-w-md flex items-center justify-between">
          <button 
            onClick={onBackToMenu}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors shrink-0 cursor-pointer text-white"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <span className="font-extrabold text-sm text-white">Review Keranjang Anda</span>
          <div className="w-8" /> {/* Balance */}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 mt-5 space-y-5">
        
        {/* Cart Listing */}
        <div className="bg-[#0E0E0E] rounded-xl shadow-sm border border-white/[0.04] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <span className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-brand" />
              Menu Terpilih ({cart.length})
            </span>
            <button 
              onClick={onBackToMenu}
              className="text-xs text-brand font-extrabold hover:underline cursor-pointer"
            >
              + Tambah Menu
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <ShoppingBag className="h-10 w-10 text-white/30 mb-2" />
              <p className="text-white/40 text-xs font-semibold">Keranjang belanja Anda kosong</p>
              <button 
                onClick={onBackToMenu}
                className="mt-3 px-4 py-2 bg-brand text-black font-extrabold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Lihat Menu Makanan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {cart.map((item) => (
                <div key={item.menuItem.id} className="p-4 flex items-start gap-3">
                  <img
                    src={item.menuItem.image}
                    alt={item.menuItem.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-white/5 bg-white/5"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-white truncate leading-snug">{item.menuItem.name}</h4>
                    <span className="text-xs font-bold text-white/40 block mt-0.5 font-mono">{formatPrice(item.menuItem.price)}</span>
                    {item.note && (
                      <span className="text-[10px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md inline-block mt-1 font-medium italic">
                        Catatan: "{item.note}"
                      </span>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      {/* Trash action */}
                      <button 
                        onClick={() => removeItem(item.menuItem.id)}
                        className="text-white/40 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="flex items-center space-x-2.5 bg-white/5 rounded-lg p-0.5 border border-white/5">
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          className="h-6 w-6 bg-white/5 text-white rounded-md flex items-center justify-center hover:bg-brand hover:text-black transition-all text-xs font-bold"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-extrabold text-white w-4 text-center font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          className="h-6 w-6 bg-white/5 text-white rounded-md flex items-center justify-center hover:bg-brand hover:text-black transition-all text-xs font-bold"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <>
            {/* Customer Details Form */}
            <div className="bg-[#0E0E0E] rounded-xl p-5 shadow-sm border border-white/[0.04] space-y-4">
              <span className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                <User className="h-4 w-4 text-brand" />
                Informasi Pemesan
              </span>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/50 block">Nama Customer</label>
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:bg-white/[0.08] focus:border-brand outline-none transition-all font-medium"
                  placeholder="Masukkan nama Anda (Contoh: Lintang, Syahdewo)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/50 block flex items-center justify-between">
                  <span>E-mail Penerima Nota</span>
                  <span className="text-[9px] text-brand/80 lowercase">otomatis mengirim PDF</span>
                </label>
                <input
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:bg-white/[0.08] focus:border-brand outline-none transition-all font-medium"
                  placeholder="Masukkan e-mail Anda (Contoh: lintang@gmail.com)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
                <p className="text-[9px] text-white/30 leading-snug">Nota digital (e-receipt PDF) akan dikirimkan secara otomatis setelah pembayaran sukses terverifikasi.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/50 block">Catatan Tambahan Meja</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:bg-white/[0.08] focus:border-brand outline-none transition-all min-h-16 resize-none font-medium"
                  placeholder="Gelas piring dipisah, sendok tambah, tisu..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>
            </div>

            {/* Error panel */}
            {error && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-xs text-rose-400 font-bold">
                ⚠️ Kesalahan: {error}
              </div>
            )}

            {/* Billing summary */}
            <div className="bg-[#0E0E0E] rounded-xl p-5 shadow-sm border border-white/[0.04] space-y-3.5 font-mono">
              <span className="text-xs font-black text-white tracking-wide uppercase block font-sans">
                Struktur Tagihan Anda
              </span>
              
              <div className="flex justify-between text-xs text-white/40 font-medium">
                <span className="font-sans">Subtotal Menu ({cart.length} item)</span>
                <span>{formatPrice(totalCartPrice)}</span>
              </div>
              <div className="flex justify-between text-xs text-white/40 font-medium pb-2 border-b border-dashed border-white/5">
                <span className="font-sans">Pajak (PB1 Restoran 10%)</span>
                <span>{formatPrice(totalCartPrice * 0.1)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-white pt-1">
                <span className="font-sans">Grand Total</span>
                <span className="text-base text-brand">{formatPrice(totalCartPrice * 1.1)}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <div className="pt-2">
              <button
                onClick={handleCheckout}
                disabled={loading}
                className={`w-full py-4 rounded-xl font-black text-xs text-black shadow-md uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  loading
                    ? 'bg-brand/50 cursor-not-allowed'
                    : 'bg-brand hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Memproses Transaksi...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4.5 w-4.5 text-black" />
                    <span>Pesan & Bayar ({formatPrice(totalCartPrice * 1.1)})</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Simulated Snap Dialog Layer */}
      <AnimatePresence>
        {showSimulatedSnap && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col border border-white/10"
            >
              {/* Fake Snap Header */}
              <div className="bg-[#0A0A0A] text-white p-5 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <div className="h-6.5 w-6.5 rounded bg-brand flex items-center justify-center font-black text-xs shadow-inner text-black">
                    M
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-wider uppercase text-white">Midtrans Sandbox</h3>
                    <span className="text-[9px] text-white/40 block font-semibold leading-none">SNAP GATEWAY SIMULATOR</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowSimulatedSnap(false)}
                  className="text-white/40 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {/* Transaction billing info */}
              <div className="p-5 bg-white/[0.02] border-b border-white/5 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-sans">ID Transaksi</span>
                  <span className="text-white/80 font-semibold">{simulatedOrderId}</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-white/5">
                  <span className="text-white/40 font-semibold font-sans">Total Pembayaran</span>
                  <span className="text-base font-black text-brand">{formatPrice(totalCartPrice * 1.1)}</span>
                </div>
              </div>

              {/* Payment Methods Choice & QRIS */}
              <div className="p-5 flex-1 space-y-5">
                <div className="flex bg-white/5 rounded-xl p-1 justify-between border border-white/5">
                  {(['QRIS', 'GOPAY', 'BANK'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentChoice(method)}
                      className={`flex-1 py-1.5 rounded font-black text-xs transition-all uppercase cursor-pointer ${
                        paymentChoice === method
                          ? 'bg-brand text-black shadow-sm'
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {paymentChoice === 'QRIS' && (
                  <div className="flex flex-col items-center justify-center space-y-3 py-1">
                    <div className="bg-white border border-white/10 p-3.5 rounded-xl shadow-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(simulatedOrderId)}`}
                        alt="Simulated QRIS Code"
                        referrerPolicy="no-referrer"
                        className="w-40 h-40"
                      />
                    </div>
                    <span className="text-[10px] text-white/40 font-bold text-center uppercase tracking-wider block max-w-[250px] leading-relaxed">
                      Silakan Pindai QR di atas untuk menyelesaikan Pembayaran
                    </span>
                  </div>
                )}

                {paymentChoice === 'GOPAY' && (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand font-black text-lg border border-white/10">
                      G
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">Hubungkan akun GoPay</p>
                      <p className="text-[10px] text-white/40 mt-1">Saldo akan dipotong otomatis setelah otorisasi e-wallet disimulasikan.</p>
                    </div>
                  </div>
                )}

                {paymentChoice === 'BANK' && (
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3 font-mono text-[#E0E0E0]">
                    <p className="text-xs font-black text-white font-sans">Nomor Virtual Account</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                        8077 1234 5678 9011
                      </span>
                      <span className="text-[10px] font-black text-brand font-sans">Bank Mandiri</span>
                    </div>
                    <p className="text-[9px] text-white/45 leading-normal font-sans">Transfer tepat sesuai nominal Grand Total agar sistem langsung mendeteksi tagihan otomatis.</p>
                  </div>
                )}
              </div>

              {/* Action Button: Trigger Webhook Callback */}
              <div className="p-5 bg-white/[0.02] border-t border-white/5 space-y-3">
                <button
                  onClick={handleSimulatedPaymentSuccess}
                  disabled={loading}
                  className="w-full py-3.5 bg-brand text-black font-extrabold text-xs rounded-xl shadow-md uppercase flex items-center justify-center space-x-1.5 cursor-pointer font-bold"
                >
                  <Sparkles className="h-4 w-4 text-black" />
                  <span>Simulasi Bayar Berhasil ({paymentChoice})</span>
                </button>
                <button
                  onClick={() => setShowSimulatedSnap(false)}
                  className="w-full py-2.5 bg-white/5 border border-white/10 text-white/60 font-bold text-xs rounded-xl hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  Tutup Simulator
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
