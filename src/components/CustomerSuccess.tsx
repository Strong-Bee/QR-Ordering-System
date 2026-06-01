import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle2, Ticket, ChevronRight, RefreshCw, ShoppingBag, Bell, Coffee, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { OrderStatus, OrderWithItems, OrderItem } from '../types';

interface CustomerSuccessProps {
  orderId: string;
  tableNumber: number;
  onDone: () => void;
}

export default function CustomerSuccess({ orderId, tableNumber, onDone }: CustomerSuccessProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customer Star Feedback States
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackSubmitError, setFeedbackSubmitError] = useState<string | null>(null);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setFeedbackSubmitError('Silakan pilih rating bintang terlebih dahulu.');
      return;
    }
    setSubmittingFeedback(true);
    setFeedbackSubmitError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order?.id || orderId,
          customerName: order?.customerName || 'Pelanggan Setia',
          rating: rating,
          note: feedbackNote
        })
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
      } else {
        const errData = await res.json();
        setFeedbackSubmitError(errData.error || 'Gagal mengirimkan feedback');
      }
    } catch (err) {
      console.error(err);
      setFeedbackSubmitError('Kesalahan koneksi internet saat mengirim feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const res = await fetch(`/api/order/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setError(null);
      } else {
        setError('Gagal memuat status pesanan');
      }
    } catch (err) {
      console.error(err);
      setError('Kesalahan koneksi internet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();

    // 1. Live Real-time SSE listener
    const sse = new EventSource('/api/sse/orders');
    
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ORDER_STATUS_UPDATED' && data.payload.id === orderId) {
          console.log('SSE status update received:', data.payload);
          setOrder(data.payload);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    sse.onerror = (err) => {
      console.warn('SSE disconnected, continuing with polling fallback...', err);
    };

    // 2. Poll fallback every 5 seconds
    const interval = setInterval(() => {
      fetchOrderDetails();
    }, 5000);

    return () => {
      sse.close();
      clearInterval(interval);
    };
  }, [orderId]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(p);
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="text-xs text-slate-500 font-bold mt-2">Memuat struk pesanan...</span>
      </div>
    );
  }

  // Set default steps
  const steps = [
    { title: 'Menunggu Pembayaran', desc: 'Melakukan pembayaran via Snap', status: [OrderStatus.PENDING_PAYMENT] },
    { title: 'Pembayaran Diterima', desc: 'Pesanan masuk antrean kasir', status: [OrderStatus.PAID] },
    { title: 'Dapur Menyiapkan', desc: 'Koki mempersiapkan pesanan Anda', status: [OrderStatus.PREPARING] },
    { title: 'Siap Disajikan', desc: 'Pesanan siap diantar pelayan', status: [OrderStatus.READY] },
    { title: 'Selesai Disajikan', desc: 'Sedang dinikmati customer', status: [OrderStatus.SERVED] }
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === OrderStatus.PENDING_PAYMENT) return 0;
    if (status === OrderStatus.PAID) return 1;
    if (status === OrderStatus.PREPARING) return 2;
    if (status === OrderStatus.READY) return 3;
    if (status === OrderStatus.SERVED) return 4;
    return 1; // Fallback
  };

  const currentStepIdx = order ? getStepIndex(order.status) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-850">
      
      {/* Upper Success Header Banner */}
      <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-center py-10 px-4 rounded-b-[2.5rem] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative max-w-sm mx-auto flex flex-col items-center">
          
          <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 animate-bounce mb-3">
            <CheckCircle2 className="h-9 w-9 text-amber-300" />
          </div>
          
          <h1 className="text-lg font-black tracking-tight">TRANSAKSI SUKSES!</h1>
          <p className="text-xs mt-1 text-emerald-100 max-w-xs font-light">
            Terima kasih {order?.customerName}! Pembayaran telah diverifikasi, silakan menunggu pesanan Anda selesai disiapkan.
          </p>

          <div className="mt-5 bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center justify-between gap-5 border border-white/10">
            <div className="text-left">
              <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">ID Pesanan</span>
              <span className="text-xs font-mono font-bold text-white tracking-widest">{order?.id.split('-')[2] || order?.id}</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="text-right">
              <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Meja Makan</span>
              <span className="text-xs font-extrabold text-white">Meja #{tableNumber}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
        
        {/* Real-time Order Tracker Stepper */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-emerald-600 animate-pulse" />
              Tracker Antrean Real-time
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {order ? order.status : 'Awaiting'}
            </span>
          </div>

          <div className="relative pl-10 space-y-6">
            {/* Guide line */}
            <div className="absolute left-[13.5px] top-2 bottom-2 w-[3px] bg-slate-100 rounded-full">
              <div 
                className="w-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ height: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((step, idx) => {
              const isPast = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              const isFuture = currentStepIdx < idx;

              return (
                <div key={idx} className="relative flex flex-col">
                  {/* Indicator Point */}
                  <div className={`absolute -left-10 top-0.5 h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                    isPast ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/25' :
                    isCurrent ? 'bg-amber-500 border-amber-500 text-white animate-pulse' :
                    'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <ChefHat className="h-3.5 w-3.5" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    )}
                  </div>

                  {/* Text details */}
                  <div className="pl-1">
                    <h4 className={`text-xs font-black transition-colors ${
                      isCurrent ? 'text-slate-900 font-extrabold' : 
                      isPast ? 'text-slate-650' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </h4>
                    <p className={`text-[10px] leading-relaxed mt-0.5 ${
                      isCurrent ? 'text-slate-500 font-medium' : 'text-slate-400'
                    }`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Dishes summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-black text-slate-800 tracking-wide uppercase flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-emerald-600" />
              Detail Rincian Belanja
            </span>
            <button 
              onClick={fetchOrderDetails}
              className="text-slate-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 px-5">
            {order?.items.map((item: any, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-black text-slate-800">
                    {item.menuItem?.name || 'Menu Pilihan'}
                    <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-md p-1.5 py-0.5 ml-2 font-bold select-none">
                      x{item.quantity}
                    </span>
                  </h5>
                  {item.note && (
                    <p className="text-[10px] text-slate-400 italic mt-0.5">"{item.note}"</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {formatPrice((item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="p-5 bg-slate-50/50 border-t border-slate-100 space-y-2.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal Item</span>
              <span>{order ? formatPrice(order.totalAmount / 1.1) : 'Rp 0'}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pb-2 border-b border-dashed border-slate-200">
              <span>Pajak (PB1 Restoran 10%)</span>
              <span>{order ? formatPrice(order.totalAmount - (order.totalAmount / 1.1)) : 'Rp 0'}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-black text-slate-800 pt-1">
              <span>Grand Total</span>
              <span className="text-emerald-700 font-extrabold text-sm">{order ? formatPrice(order.totalAmount) : 'Rp 0'}</span>
            </div>
          </div>
        </div>

        {/* Feedback & Star Rating Form Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60 transition-all duration-300">
          {!feedbackSubmitted ? (
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  Beri Nilai Sajian & Layanan
                </span>
                <span className="text-[10px] font-bold text-slate-400">Feedback Anda</span>
              </div>

              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Seberapa puas Anda dengan sajian kami?</span>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isLit = (hoveredRating || rating) >= starVal;
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRating(starVal)}
                        onMouseEnter={() => setHoveredRating(starVal)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 focus:outline-none cursor-pointer transition-transform hover:scale-125 duration-150 active:scale-95"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors duration-150 ${
                            isLit ? 'text-amber-400 fill-amber-350' : 'text-slate-200 fill-transparent'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {rating > 0 && (
                  <span className="text-xs font-extrabold text-amber-600 tracking-wide mt-1 animate-pulse">
                    {rating === 5 ? 'Sempurna! Sangat Puas 😍' :
                     rating === 4 ? 'Sangat Enak & Puas 😊' :
                     rating === 3 ? 'Cukup Baik & Lumayan OK 🙂' :
                     rating === 2 ? 'Butuh Sedikit Peningkatan 😕' :
                     'Kurang Memuaskan / Kecewa 😞'}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase block">Catatan Pendek / Pengalaman Kuliner</label>
                <textarea
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Contoh: Nasi gorengnya wangi sekali, porsinya pas! Terima kasih pelayanan ramah."
                  rows={3}
                  className="w-full bg-slate-50 hover:bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all duration-150 placeholder:text-slate-400 font-semibold"
                />
              </div>

              {feedbackSubmitError && (
                <p className="text-[10px] text-rose-500 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                  {feedbackSubmitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tracking-wider uppercase rounded-xl transition-all shadow-md hover:shadow-emerald-600/10 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submittingFeedback ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Kirim Ulasan</span>
                )}
              </button>
            </form>
          ) : (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-6 px-4 space-y-3"
            >
              <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-100 shadow-sm">
                <Star className="h-6 w-6 fill-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ulasan Berhasil Dikirim!</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                  Terima kasih banyak atas dukungannya! Kritik dan ulasan berharga Anda telah kami rekam untuk meningkatkan kualitas pelayanan kami.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom CTA Call Buttons */}
        <div className="space-y-3">
          <button
            onClick={onDone}
            className="w-full py-4 bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-250 active:scale-[0.98] font-black text-xs rounded-2xl flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Pesan Makanan Tambahan</span>
          </button>
        </div>

      </div>

    </div>
  );
}
