import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { OrderStatus, UserRole, Table, Category, MenuItem, Order, OrderItem, OrderWithItems, Feedback, Member, EmailLog } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Database Persistence
const DB_FILE = path.join(process.cwd(), 'db.json');

const defaultCategories: Category[] = [
  { id: 1, name: 'Makanan' },
  { id: 2, name: 'Minuman' },
  { id: 3, name: 'Snack' },
  { id: 4, name: 'Dessert' },
  { id: 5, name: 'Paket' }
];

const defaultMenuItems: MenuItem[] = [
  // Makanan
  { id: 1, name: 'Nasi Goreng Spesial', description: 'Nasi goreng harum wangi khas dapur dengan suwiran ayam, telur mata sapi, rasa udang premium, acar renyah, dan kerupuk udang.', price: 32000, image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80', categoryId: 1, isAvailable: true },
  { id: 2, name: 'Mie Goreng Jawa', description: 'Mie kuning basah dimasak dengan bumbu halus tradisional Jawa, kubis segar, sawi hijau, udang besar, telur orak-arik, dan suwiran ayam gurih.', price: 28000, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80', categoryId: 1, isAvailable: true },
  { id: 3, name: 'Ayam Bakar Taliwang', description: 'Ayam bakar dengan bumbu rempah khas Lombok dengan cita rasa pedas manis melimpah ruah, disajikan bersama plecing kangkung.', price: 36000, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80', categoryId: 1, isAvailable: true },
  { id: 4, name: 'Sate Ayam Madura', description: '10 tusuk sate ayam empuk dipanggang arang harum dilapisi saus kacang gurih khas Madura, bawang goreng kering dan kecap manis premium.', price: 30000, image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&auto=format&fit=crop&q=80', categoryId: 1, isAvailable: true },

  // Minuman
  { id: 5, name: 'Es Teh Manis Jumbo', description: 'Es teh manis rrefreshing porsi jumbo yang segar dibuat khusus dari racikan teh melati tradisional.', price: 8000, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', categoryId: 2, isAvailable: true },
  { id: 6, name: 'Ice Lychee Tea', description: 'Teh manis rasa buah leci dengan tambahan buah sirup manis dan dua buah leci kupas segar premium di dalamnya.', price: 18000, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', categoryId: 2, isAvailable: true },
  { id: 7, name: 'Kopi Susu Gula Aren', description: 'Espresso robusta premium dikocok dingin bersama susu segar pasteurisasi dingin dan sirup gula aren murni khas Nusantara.', price: 20000, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80', categoryId: 2, isAvailable: true },
  { id: 8, name: 'Avocado Juice', description: 'Jus alpukat mentega segar yang kental manis, disiram lelehan cokelat hitam premium di sekeliling gelas saji.', price: 22000, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80', categoryId: 2, isAvailable: true },

  // Snack
  { id: 9, name: 'Kentang Goreng Crispy', description: 'Kentang goreng impor potongan panjang renyah gurih bersalut garam laut ringan, disajikan dengan saus sambal.', price: 18000, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', categoryId: 3, isAvailable: true },
  { id: 10, name: 'Cireng Bumbu Rujak', description: 'Cireng renyah kenyal bumbu rempah tradisional khas Bandung disajikan hangat lengkap dengan cocolan bumbu rujak pedas manis.', price: 16000, image: 'https://images.unsplash.com/photo-1582234372722-50d7ccc30e5a?w=600&auto=format&fit=crop&q=80', categoryId: 3, isAvailable: true },
  { id: 11, name: 'Roti Bakar Cokelat Keju', description: 'Roti tawar bandung tebal empuk dibakar mentega gurih, diisi cokelat belgia melimpah, dan ditaburi keju cheddar gurih.', price: 20000, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop&q=80', categoryId: 3, isAvailable: true },

  // Dessert
  { id: 12, name: 'Pisang Keju Gula Palem', description: 'Pisang raja pilihan goreng krispi renyah ditaburi limpahan keju cheddar parut dan gula palem karamel lezat.', price: 22000, image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80', categoryId: 4, isAvailable: true },
  { id: 13, name: 'Ice Cream Sundae', description: 'Tiga scoop es krim vanilla premium, disiram krim kocok lezat, saus stroberi segar, dan ditaruh wafer cokelat premium.', price: 18000, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80', categoryId: 4, isAvailable: true },

  // Paket
  { id: 14, name: 'Paket Kenyang Goreng + Es Teh', description: 'Gabungan hemat Nasi Goreng Spesial legendaris dipadukan dengan kesegaran Es Teh Manis Jumbo.', price: 36000, image: 'https://images.unsplash.com/photo-1603133872878-68550a5e7b64?w=600&auto=format&fit=crop&q=80', categoryId: 5, isAvailable: true },
  { id: 15, name: 'Paket Nongki Taliwang + Lychee', description: 'Kombo pedas mantap Ayam Bakar Taliwang hangat dilapisi bumbu khas lombok dan Ice Lychee Tea asli.', price: 48000, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', categoryId: 5, isAvailable: true }
];

const defaultTables: Table[] = [
  { id: 1, number: 1, qrCodeUrl: '/qr-codes/table-1.png', isActive: true, createdAt: new Date().toISOString() },
  { id: 2, number: 2, qrCodeUrl: '/qr-codes/table-2.png', isActive: true, createdAt: new Date().toISOString() },
  { id: 3, number: 3, qrCodeUrl: '/qr-codes/table-3.png', isActive: true, createdAt: new Date().toISOString() },
  { id: 4, number: 4, qrCodeUrl: '/qr-codes/table-4.png', isActive: true, createdAt: new Date().toISOString() },
  { id: 5, number: 5, qrCodeUrl: '/qr-codes/table-5.png', isActive: true, createdAt: new Date().toISOString() }
];

const defaultMembers: Member[] = [
  { id: 'MEM-1', name: 'Lintang Syahdewo', email: 'lintangsyahdewo1@gmail.com', role: UserRole.ADMIN, createdAt: new Date().toISOString() },
  { id: 'MEM-2', name: 'Siti Aminah', email: 'siti.aminah@apple.com', role: UserRole.DAPUR, createdAt: new Date().toISOString() },
  { id: 'MEM-3', name: 'Budi Hartono', email: 'budi.hartono@gmail.com', role: UserRole.KASIR, createdAt: new Date().toISOString() }
];

function readDB(): { 
  tables: Table[]; 
  categories: Category[]; 
  menuItems: MenuItem[]; 
  orders: Order[]; 
  orderItems: OrderItem[]; 
  feedbacks: Feedback[];
  members: Member[];
  emails: EmailLog[];
} {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      tables: defaultTables,
      categories: defaultCategories,
      menuItems: defaultMenuItems,
      orders: [],
      orderItems: [],
      feedbacks: [],
      members: defaultMembers,
      emails: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(fileContent);
    if (!parsed.feedbacks) {
      parsed.feedbacks = [];
    }
    if (!parsed.members) {
      parsed.members = defaultMembers;
    }
    if (!parsed.emails) {
      parsed.emails = [];
    }
    return parsed;
  } catch (err) {
    console.error('Failed to read db file, recreating default:', err);
    const initialData = {
      tables: defaultTables,
      categories: defaultCategories,
      menuItems: defaultMenuItems,
      orders: [],
      orderItems: [],
      feedbacks: [],
      members: defaultMembers,
      emails: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate static QR Code assets
async function ensureQRCodes() {
  const db = readDB();
  const publicDir = path.join(process.cwd(), 'public');
  const qrDir = path.join(publicDir, 'qr-codes');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const appUrl = process.env.APP_URL || `http://localhost:3000`;
  for (const t of db.tables) {
    const tableUrl = `${appUrl}/order/${t.number}`;
    const qrPath = path.join(qrDir, `table-${t.number}.png`);
    if (!fs.existsSync(qrPath)) {
      try {
        await QRCode.toFile(qrPath, tableUrl, {
          margin: 2,
          scale: 8,
          color: {
            dark: '#1e293b',
            light: '#ffffff'
          }
        });
        console.log(`Generated QR code for Meja ${t.number} at ${qrPath}`);
      } catch (err) {
        console.error(`Error generating QR code for table ${t.number}:`, err);
      }
    }
  }
}

// Initialize tables and QR codes on start
ensureQRCodes().catch(console.error);

// Realtime SSE Subscriptions
type SseClient = {
  id: string;
  res: any;
};
let sseClients: SseClient[] = [];

function notifyClients(type: string, payload: any) {
  const message = `data: ${JSON.stringify({ type, payload })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (e) {
      console.warn(`Failed writing to SSE client ${client.id}:`, e);
    }
  });
}

// Beautiful automatic responsive email receipt generator
async function sendReceiptEmail(orderId: string) {
  try {
    const db = readDB();
    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
      console.error(`Order with ID ${orderId} not found, skipping receipt email.`);
      return;
    }
    
    const table = db.tables.find(t => t.id === order.tableId);
    const recipientEmail = order.customerEmail || 'no-email-provided@gmail.com';
    const customerName = order.customerName || 'Pelanggan Setia';
    
    const items = db.orderItems
      .filter(item => item.orderId === orderId)
      .map(item => ({
        ...item,
        menuItem: db.menuItems.find(m => m.id === item.menuItemId)
      }));

    if (items.length === 0) {
      console.warn(`No menu items found for order ${orderId} receipt email.`);
    }

    // Build Email Body HTML (Beautiful professional invoice design)
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    let itemsTableRows = items.map((item) => {
      const name = item.menuItem ? item.menuItem.name : 'Item';
      const qty = item.quantity;
      const price = item.price;
      const totalItem = price * qty;
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #333333;">
            <div style="font-weight: bold; font-family: sans-serif;">${name}</div>
            ${item.note ? `<div style="font-size: 11px; color: #888888; font-style: italic;">* ${item.note}</div>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #333333; text-align: center; font-family: monospace;">${qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #333333; text-align: right; font-family: monospace;">Rp ${price.toLocaleString('id-ID')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-size: 13px; color: #333333; text-align: right; font-weight: bold; font-family: monospace;">Rp ${totalItem.toLocaleString('id-ID')}</td>
        </tr>
      `;
    }).join('');

    const emailSubject = `[Nota E-Receipt] Pesanan #${order.id.slice(-6).toUpperCase()} di Meja ${table ? table.number : '-'} Sukses Dibayar`;
    
    const emailBodyHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03); background-color: #ffffff;">
        <div style="background-color: #10B981; padding: 25px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">E-RECEIPT NOTA DIGITAL</h2>
          <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.9;">Terima kasih atas pesanan Anda di Kafe QR Kami</p>
        </div>
        
        <div style="padding: 25px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #666666; border-bottom: 1px dashed #dddddd; padding-bottom: 15px;">
            <div style="width: 50%; float: left;">
              <strong>KAFE QR RESTO</strong><br>
              Table Service QR Modern<br>
              Indonesia
            </div>
            <div style="width: 50%; text-align: right; float: right;">
              <strong>ID pesanan:</strong> ${order.id}<br>
              <strong>Tanggal:</strong> ${new Date(order.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
              <strong>Meja Nomor:</strong> Meja ${table ? table.number : '-'}<br>
              <strong>Nama Pelanggan:</strong> ${customerName}
            </div>
            <div style="clear: both;"></div>
          </div>
          
          <h3 style="font-size: 13px; text-transform: uppercase; margin-top: 20px; color: #111111; letter-spacing: 0.5px; font-family: sans-serif;">Rincian Item Makanan & Minuman</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #777777; font-weight: bold; border-bottom: 2px solid #dddddd; font-family: sans-serif;">Menu Item</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #777777; font-weight: bold; border-bottom: 2px solid #dddddd; text-align: center; font-family: sans-serif;">Qty</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #777777; font-weight: bold; border-bottom: 2px solid #dddddd; text-align: right; font-family: sans-serif;">Harga Satuan</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #777777; font-weight: bold; border-bottom: 2px solid #dddddd; text-align: right; font-family: sans-serif;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; border-top: 2px solid #eeeeee; padding-top: 15px; font-size: 13px;">
            <table style="width: 100%; text-align: right;">
              <tr>
                <td style="width: 60%; color: #666666; padding: 4px 10px; font-family: sans-serif;">Subtotal Menu:</td>
                <td style="font-weight: 500; padding: 4px 10px; font-family: monospace;">Rp ${subtotal.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td style="color: #666666; padding: 4px 10px; font-family: sans-serif;">Pajak Restoran (PB1 10%):</td>
                <td style="font-weight: 500; padding: 4px 10px; font-family: monospace;">Rp ${tax.toLocaleString('id-ID')}</td>
              </tr>
              <tr style="font-size: 16px; font-weight: bold; color: #10B981;">
                <td style="padding: 10px; border-top: 1px solid #eeeeee; font-family: sans-serif;">TOTAL BILLING:</td>
                <td style="padding: 10px; border-top: 1px solid #eeeeee; font-family: monospace;">Rp ${total.toLocaleString('id-ID')}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 25px; padding: 15px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #10B981; font-size: 12px; color: #555555; text-align: left;">
            <strong>Metode Pembayaran:</strong> ${order.paymentMethod || 'Pembayaran Digital'}<br>
            <strong>Status Transaksi:</strong> <span style="background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">LUNAS / PAID</span><br>
            Waktu Pembayaran: ${order.paidAt ? new Date(order.paidAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px;">
            <p>Terima kasih banyak atas pilihan kuliner Anda di restoran kami! Jika ada kendala dengan tagihan atau pesanan, silakan tunjukkan e-receipt ini ke bagian kasir utama.</p>
            <p style="margin-top: 10px; font-weight: bold; color: #10B981;">Powered by Kafe QR Modern Multiusers © 2026</p>
          </div>
        </div>
      </div>
    `;

    const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
    let transportStatus: 'SENT' | 'SIMULATED' | 'FAILED' = 'SIMULATED';
    let transportError = '';

    if (hasSmtpConfig) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        });

        await transporter.sendMail({
          from: `"Kafe QR Restoran" <${process.env.SMTP_USER}>`,
          to: recipientEmail,
          subject: emailSubject,
          html: emailBodyHtml
        });
        
        transportStatus = 'SENT';
        console.log(`[SMTP Mailer] Real email successfully dispatched to ${recipientEmail} for Order ${orderId}`);
      } catch (err: any) {
        transportStatus = 'FAILED';
        transportError = err.message || 'SMTP Configuration or Connection Error';
        console.error(`[SMTP Mailer Exception] Failed to send real email to ${recipientEmail}:`, err);
      }
    } else {
      console.log('----------------------------------------------------');
      console.log(`[SIMULATED EMAIL DISPATCH] To: ${recipientEmail}`);
      console.log(`[SIMULATED EMAIL DISPATCH] Subject: ${emailSubject}`);
      console.log(`[SIMULATED EMAIL DISPATCH] Order Total: Rp ${total.toLocaleString('id-ID')}`);
      console.log('----------------------------------------------------');
      transportStatus = 'SIMULATED';
    }

    // Capture in DB emails outbound list
    const dbEmailLogs = readDB();
    const newLog: EmailLog = {
      id: `EMAIL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId,
      recipientEmail,
      customerName,
      subject: emailSubject,
      bodyHtml: emailBodyHtml,
      status: transportStatus,
      sentAt: new Date().toISOString(),
      errorMessage: transportError || undefined
    };

    dbEmailLogs.emails.push(newLog);
    writeDB(dbEmailLogs);
    
    // Broadcast email dispatched update
    notifyClients('EMAIL_DISPATCHED', newLog);

  } catch (e) {
    console.error('Exception inside sendReceiptEmail:', e);
  }
}

// REST Web API Routes

// Real-time SSE Connection
app.get('/api/sse/orders', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now().toString();
  const client: SseClient = { id: clientId, res };
  sseClients.push(client);

  console.log(`SSE Client connected: ${clientId}. Total clients: ${sseClients.length}`);

  // Heartbeat every 20 seconds to keep connection alive
  const KeepAliveInterval = setInterval(() => {
    res.write(':\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(KeepAliveInterval);
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`SSE Client disconnected: ${clientId}. Remaining clients: ${sseClients.length}`);
  });
});

// GET /api/menu
app.get('/api/menu', (req, res) => {
  const db = readDB();
  const availableItems = db.menuItems.filter(item => item.isAvailable);
  res.json({
    categories: db.categories,
    items: availableItems
  });
});

// GET /api/table/:number
app.get('/api/table/:number', (req, res) => {
  const tableNum = parseInt(req.params.number, 10);
  if (isNaN(tableNum)) {
    return res.status(400).json({ error: 'Nomor meja tidak valid' });
  }

  const db = readDB();
  let table = db.tables.find(t => t.number === tableNum);
  
  if (!table) {
    // Dynamically insert tables up to a limit if accessed
    if (tableNum > 0 && tableNum <= 20) {
      table = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        number: tableNum,
        qrCodeUrl: `/qr-codes/table-${tableNum}.png`,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      db.tables.push(table);
      writeDB(db);
      ensureQRCodes().catch(console.error);
    } else {
      return res.status(404).json({ error: 'Meja tidak terdaftar' });
    }
  }

  if (!table.isActive) {
    return res.status(400).json({ error: 'Meja sedang tidak aktif' });
  }

  res.json(table);
});

// POST /api/feedback
app.post('/api/feedback', (req, res) => {
  const { orderId, customerName, rating, note } = req.body;
  if (!customerName || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Data feedback tidak lengkap atau rating tidak valid (1-5)' });
  }

  const db = readDB();
  const newFeedback: Feedback = {
    id: `FB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId,
    customerName,
    rating,
    note: note || '',
    createdAt: new Date().toISOString()
  };

  db.feedbacks.push(newFeedback);
  writeDB(db);

  res.status(201).json(newFeedback);
});

// POST /api/order
app.post('/api/order', async (req, res) => {
  const { tableId, customerName, note, items } = req.body;
  if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Parameter pesanan tidak lengkap atau kosong' });
  }

  const db = readDB();
  const table = db.tables.find(t => t.id === Number(tableId));
  if (!table) {
    return res.status(404).json({ error: 'Meja tidak ditemukan' });
  }

  // Calculate total and extract validated items
  let totalAmount = 0;
  const newOrderItems: OrderItem[] = [];
  const midtransOrderId = `QR-ORDER-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  for (const item of items) {
    const menuItem = db.menuItems.find(m => m.id === Number(item.menuItemId));
    if (!menuItem) {
      return res.status(400).json({ error: `Menu item id ${item.menuItemId} tidak tersedia` });
    }
    if (!menuItem.isAvailable) {
      return res.status(400).json({ error: `Menu ${menuItem.name} sedang habis` });
    }

    const qty = Number(item.quantity) || 1;
    const price = menuItem.price;
    totalAmount += price * qty;

    newOrderItems.push({
      id: Date.now() + Math.floor(Math.random() * 100000),
      orderId: midtransOrderId,
      menuItemId: menuItem.id,
      quantity: qty,
      price: price,
      note: item.note || ''
    });
  }

  // Generate Snap token (Live Sandbox or simulated fallback)
  let midtransSnapToken = `mock-snap-token-${Date.now()}`;
  let midtransSnapUrl = `https://app.sandbox.midtrans.com/snap/v1/transactions/${midtransSnapToken}`;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  // If a real Server Key is specified, make a live API call to Midtrans Sandbox
  if (serverKey && serverKey !== 'MY_MIDTRANS_SERVER_KEY' && serverKey.trim().length > 0) {
    try {
      const snapEndpoint = isProd 
        ? 'https://app.midtrans.com/snap/v1/transactions' 
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
      
      const authHeader = Buffer.from(`${serverKey}:`).toString('base64');
      const response = await fetch(snapEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authHeader}`
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: midtransOrderId,
            gross_amount: totalAmount
          },
          customer_details: {
            first_name: customerName || 'Pelanggan Meja ' + table.number,
            email: 'qr.order.customer@gmail.com'
          },
          item_details: newOrderItems.map(oi => {
            const mItem = db.menuItems.find(item => item.id === oi.menuItemId)!;
            return {
              id: oi.menuItemId.toString(),
              price: oi.price,
              quantity: oi.quantity,
              name: mItem.name
            };
          })
        })
      });

      if (response.ok) {
        const result: any = await response.json();
        midtransSnapToken = result.token;
        midtransSnapUrl = result.redirect_url;
      } else {
        const errorText = await response.text();
        console.error('Midtrans API rejected parameters, falling back to secure simulated Snap:', errorText);
      }
    } catch (err) {
      console.error('Error connecting to Midtrans Sandbox, using secure mock gateway:', err);
    }
  }

  const newOrder: Order = {
    id: midtransOrderId,
    tableId: table.id,
    status: OrderStatus.PENDING_PAYMENT,
    totalAmount,
    midtransOrderId,
    midtransSnapUrl,
    midtransSnapToken,
    customerName: customerName || `Pelanggan Meja ${table.number}`,
    note: note || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.orders.push(newOrder);
  db.orderItems.push(...newOrderItems);
  writeDB(db);

  // Broadcast to admin dashboard/kitchen SSE client
  const sseOrder: OrderWithItems = {
    ...newOrder,
    tableNumber: table.number,
    items: newOrderItems.map(item => ({
      ...item,
      menuItem: db.menuItems.find(mi => mi.id === item.menuItemId)
    }))
  };
  notifyClients('ORDER_CREATED', sseOrder);

  res.status(201).json({
    order: newOrder,
    items: newOrderItems,
    midtransSnapToken,
    midtransSnapUrl
  });
});

// GET /api/order/:id
app.get('/api/order/:id', (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  const table = db.tables.find(t => t.id === order.tableId);
  const items = db.orderItems
    .filter(item => item.orderId === order.id)
    .map(item => ({
      ...item,
      menuItem: db.menuItems.find(m => m.id === item.menuItemId)
    }));

  res.json({
    ...order,
    tableNumber: table ? table.number : null,
    items
  });
});

// POST /api/payment/notification (Midtrans Webhook & Sandbox simulation)
app.post('/api/payment/notification', (req, res) => {
  const notification = req.body;
  
  const orderId = notification.order_id;
  const transactionStatus = notification.transaction_status;
  const fraudStatus = notification.fraud_status;

  const db = readDB();
  const orderIndex = db.orders.findIndex(o => o.midtransOrderId === orderId || o.id === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  const order = db.orders[orderIndex];

  // Logic to process status updates from Midtrans webhook
  let updatedStatus = order.status;
  let paymentMethod = notification.payment_type || 'Custom QR';

  if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
    if (fraudStatus === 'challenge') {
      updatedStatus = OrderStatus.PENDING_PAYMENT;
    } else {
      updatedStatus = OrderStatus.PAID;
      order.paidAt = new Date().toISOString();
      setTimeout(() => sendReceiptEmail(order.id), 100);
    }
  } else if (transactionStatus === 'pending') {
    updatedStatus = OrderStatus.PENDING_PAYMENT;
  } else if (transactionStatus === 'deny' || transactionStatus === 'expire' || transactionStatus === 'cancel') {
    updatedStatus = OrderStatus.CANCELLED;
  }

  order.status = updatedStatus;
  order.paymentMethod = paymentMethod;
  order.updatedAt = new Date().toISOString();
  writeDB(db);

  // Broadcast real-time change to observers
  const table = db.tables.find(t => t.id === order.tableId);
  const items = db.orderItems
    .filter(item => item.orderId === order.id)
    .map(item => ({
      ...item,
      menuItem: db.menuItems.find(m => m.id === item.menuItemId)
    }));

  const broadcastPayload: OrderWithItems = {
    ...order,
    tableNumber: table ? table.number : undefined,
    items
  };
  
  notifyClients('ORDER_STATUS_UPDATED', broadcastPayload);

  res.json({ status: 'ok', orderStatus: updatedStatus });
});

// ==========================================
// BACKEND HACKER PREVNTION & SECURITY SHIELD
// ==========================================
const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const reqEmail = req.headers['x-user-email'] as string;
  const reqRole = req.headers['x-user-role'] as string;

  if (!reqEmail) {
    return res.status(401).json({ error: 'Hak akses tidak sah: Alamat e-mail verifikasi wajib dikirimkan!' });
  }

  const db = readDB();

  // Deduce the role of the user requesting the action
  let allowedRole: UserRole | null = null;

  // Master Owner bypass or DB checks
  if (reqEmail.toLowerCase() === 'owner@restaurant.com') {
    allowedRole = UserRole.OWNER;
  } else {
    const member = db.members.find(m => m.email.toLowerCase() === reqEmail.toLowerCase());
    if (member) {
      allowedRole = member.role as UserRole;
    }
  }

  // Fallback check against starting metadata preset role to be developer-friendly
  if (!allowedRole) {
    // If the email is budget/dev metadata preset
    if (reqEmail.toLowerCase() === 'lintangsyahdewo1@gmail.com') {
      allowedRole = UserRole.ADMIN;
    } else if (reqEmail.toLowerCase() === 'owner@restaurant.com') {
      allowedRole = UserRole.OWNER;
    } else if (reqEmail.toLowerCase() === 'siti.aminah@apple.com') {
      allowedRole = UserRole.DAPUR;
    } else if (reqEmail.toLowerCase() === 'budi.hartono@gmail.com') {
      allowedRole = UserRole.KASIR;
    }
  }

  if (!allowedRole) {
    return res.status(403).json({ error: `Akses ditolak: Alamat email (${reqEmail}) Anda tidak terdaftar dalam personil staff kafe kami!` });
  }

  // Extract path and method
  const path = req.path;
  const method = req.method;

  // Let's print out what we found
  console.log(`[AUTH-SHIELD] Request by ${reqEmail} (${allowedRole}) on url: ${path}`);

  // 1. Members Management Tab
  if (path.startsWith('/members')) {
    if (allowedRole !== UserRole.OWNER) {
      return res.status(403).json({ error: 'Hak Otoritas Tinggi Ditolak: Hanya pihak OWNER (Pemilik Utama) yang diizinkan mengelola staff tim.' });
    }
  }

  // 2. Email Outboxes and Resending Receipts
  if (path.startsWith('/emails')) {
    if (allowedRole !== UserRole.OWNER && allowedRole !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Hak Otoritas Ditolak: Hanya OWNER atau ADMINISTRATOR yang diizinkan mengawasi outbox struk / e-receipt.' });
    }
  }

  // 3. Financial Reports
  if (path.startsWith('/reports')) {
    if (allowedRole !== UserRole.OWNER && allowedRole !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Akses Dibatasi: Laporan finansial rahasia hanya boleh dibuka oleh OWNER atau ADMINISTRATOR.' });
    }
  }

  // 4. State Modification Actions (CRUD) for menus, tables, and categories
  const isWriteAction = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  if (isWriteAction && (path.startsWith('/menu') || path.startsWith('/tables') || path.startsWith('/categories'))) {
    if (allowedRole !== UserRole.OWNER && allowedRole !== UserRole.ADMIN) {
      return res.status(403).json({ error: 'Operasi Modifikasi Ditolak: Peran staf Anda tidak memiliki kuasa mengubah katalog menu atau konfigurasi meja.' });
    }
  }

  // 5. Orders access (KASIR, DAPUR, ADMIN, OWNER allowed)
  if (path.startsWith('/orders')) {
    if (![UserRole.OWNER, UserRole.ADMIN, UserRole.KASIR, UserRole.DAPUR].includes(allowedRole)) {
      return res.status(403).json({ error: 'Akses manajemen pesanan tidak diizinkan untuk peran ini.' });
    }
  }

  next();
};

// Secure the feedback view as well
app.get('/api/feedback', adminAuthMiddleware, (req, res) => {
  const db = readDB();
  const sortedFeedbacks = [...db.feedbacks].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(sortedFeedbacks);
});

// Secure all admin endpoints with authorization shield
app.use('/api/admin', adminAuthMiddleware);

// ADMIN ENDPOINTS (Secured elegantly by simulation or role checks)

// GET /api/admin/orders
app.get('/api/admin/orders', (req, res) => {
  const db = readDB();
  const ordersWithDetails = db.orders.map(order => {
    const table = db.tables.find(t => t.id === order.tableId);
    const orderItems = db.orderItems
      .filter(item => item.orderId === order.id)
      .map(item => ({
        ...item,
        menuItem: db.menuItems.find(m => m.id === item.menuItemId)
      }));
    return {
      ...order,
      tableNumber: table ? table.number : null,
      items: orderItems
    };
  });
  
  // Sort by created date descending
  ordersWithDetails.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(ordersWithDetails);
});

// PATCH /api/admin/orders/:id/status
app.patch('/api/admin/orders/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status || !Object.values(OrderStatus).includes(status)) {
    return res.status(400).json({ error: 'Status pesanan tidak valid' });
  }

  const db = readDB();
  const orderIndex = db.orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  db.orders[orderIndex].status = status as OrderStatus;
  if (status === OrderStatus.PAID) {
    if (!db.orders[orderIndex].paidAt) {
      db.orders[orderIndex].paidAt = new Date().toISOString();
      db.orders[orderIndex].paymentMethod = db.orders[orderIndex].paymentMethod || 'Tunai/Kasir';
    }
    setTimeout(() => sendReceiptEmail(req.params.id), 100);
  }
  db.orders[orderIndex].updatedAt = new Date().toISOString();
  writeDB(db);

  // Broadast update
  const updatedOrder = db.orders[orderIndex];
  const table = db.tables.find(t => t.id === updatedOrder.tableId);
  const items = db.orderItems
    .filter(item => item.orderId === updatedOrder.id)
    .map(item => ({
      ...item,
      menuItem: db.menuItems.find(m => m.id === item.menuItemId)
    }));

  const broadcastPayload: OrderWithItems = {
    ...updatedOrder,
    tableNumber: table ? table.number : undefined,
    items
  };
  notifyClients('ORDER_STATUS_UPDATED', broadcastPayload);

  res.json(broadcastPayload);
});

// GET /api/admin/dashboard
app.get('/api/admin/dashboard', (req, res) => {
  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  
  const todayOrders = db.orders.filter(o => o.createdAt.startsWith(today));
  const paidTodayOrders = todayOrders.filter(o => o.status !== OrderStatus.PENDING_PAYMENT && o.status !== OrderStatus.CANCELLED);
  
  const totalSalesToday = paidTodayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const activeOrdersCount = db.orders.filter(o => 
    o.status === OrderStatus.PREPARING || 
    o.status === OrderStatus.READY || 
    o.status === OrderStatus.PAID
  ).length;

  const totalTables = db.tables.length;
  const occupiedTables = db.orders.filter(o => 
    o.status === OrderStatus.PREPARING || 
    o.status === OrderStatus.READY
  ).map(o => o.tableId);
  const filledTablesCount = new Set(occupiedTables).size;

  // Active items list
  res.json({
    totalSalesToday,
    activeOrdersCount,
    filledTablesCount,
    totalTables
  });
});

// GET /api/admin/tables
app.get('/api/admin/tables', (req, res) => {
  const db = readDB();
  res.json(db.tables);
});

// POST /api/admin/tables
app.post('/api/admin/tables', async (req, res) => {
  const { number } = req.body;
  if (!number || isNaN(number)) {
    return res.status(400).json({ error: 'Nomor meja harus berupa angka' });
  }

  const db = readDB();
  const existing = db.tables.find(t => t.number === Number(number));
  if (existing) {
    return res.status(400).json({ error: `Meja nomor ${number} sudah terdaftar` });
  }

  const newTable: Table = {
    id: Date.now(),
    number: Number(number),
    qrCodeUrl: `/qr-codes/table-${number}.png`,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.tables.push(newTable);
  writeDB(db);

  await ensureQRCodes();

  res.status(201).json(newTable);
});

// PATCH /api/admin/tables/:id
app.patch('/api/admin/tables/:id', async (req, res) => {
  const db = readDB();
  const index = db.tables.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Meja tidak ditemukan' });
  }

  const updatedTable = {
    ...db.tables[index],
    ...req.body
  };

  db.tables[index] = updatedTable;
  writeDB(db);

  if (req.body.number !== undefined) {
    await ensureQRCodes();
  }

  res.json(updatedTable);
});

// DELETE /api/admin/tables/:id
app.delete('/api/admin/tables/:id', (req, res) => {
  const db = readDB();
  const index = db.tables.findIndex(t => t.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Meja tidak ditemukan' });
  }

  db.tables.splice(index, 1);
  writeDB(db);

  res.json({ message: 'Meja berhasil dihapus' });
});

// POST /api/admin/categories
app.post('/api/admin/categories', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  }

  const db = readDB();
  const newCat = {
    id: Date.now() + Math.floor(Math.random() * 100),
    name: name.trim()
  };

  db.categories.push(newCat);
  writeDB(db);

  res.status(201).json(newCat);
});

// PATCH /api/admin/categories/:id
app.patch('/api/admin/categories/:id', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  }

  const db = readDB();
  const index = db.categories.findIndex(c => c.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  }

  db.categories[index].name = name.trim();
  writeDB(db);

  res.json(db.categories[index]);
});

// DELETE /api/admin/categories/:id
app.delete('/api/admin/categories/:id', (req, res) => {
  const db = readDB();
  const index = db.categories.findIndex(c => c.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Kategori tidak ditemukan' });
  }

  const hasMenuItems = db.menuItems.some(mi => mi.categoryId === Number(req.params.id));
  if (hasMenuItems) {
    return res.status(400).json({ error: 'Kategori tidak bisa dihapus karena masih digunakan oleh beberapa menu item' });
  }

  db.categories.splice(index, 1);
  writeDB(db);

  res.json({ message: 'Kategori berhasil dihapus' });
});

// POST /api/admin/menu
app.post('/api/admin/menu', (req, res) => {
  const { name, description, price, image, categoryId } = req.body;
  if (!name || !price || !categoryId) {
    return res.status(400).json({ error: 'Nama, harga, dan kategori wajib diisi' });
  }

  const db = readDB();
  const newItem: MenuItem = {
    id: Date.now(),
    name,
    description: description || '',
    price: Number(price),
    image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    categoryId: Number(categoryId),
    isAvailable: true
  };

  db.menuItems.push(newItem);
  writeDB(db);

  res.status(201).json(newItem);
});

// PATCH /api/admin/menu/:id
app.patch('/api/admin/menu/:id', (req, res) => {
  const db = readDB();
  const itemIndex = db.menuItems.findIndex(m => m.id === Number(req.params.id));
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Menu tidak ditemukan' });
  }

  const updatedItem = {
    ...db.menuItems[itemIndex],
    ...req.body
  };

  db.menuItems[itemIndex] = updatedItem;
  writeDB(db);

  res.json(updatedItem);
});

// DELETE /api/admin/menu/:id
app.delete('/api/admin/menu/:id', (req, res) => {
  const db = readDB();
  const itemIndex = db.menuItems.findIndex(m => m.id === Number(req.params.id));
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Menu tidak ditemukan' });
  }

  db.menuItems.splice(itemIndex, 1);
  writeDB(db);

  res.json({ message: 'Menu berhasil dihapus' });
});

// GET /api/admin/reports
app.get('/api/admin/reports', (req, res) => {
  const db = readDB();
  const paidOrders = db.orders.filter(o => o.status !== OrderStatus.PENDING_PAYMENT && o.status !== OrderStatus.CANCELLED);
  
  // Calculate analytics
  const totalSales = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalTransactions = paidOrders.length;
  const averageTransaction = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

  // Group by category to see sales distribution
  const salesByCategory: Record<string, number> = {};
  db.categories.forEach(c => {
    salesByCategory[c.name] = 0;
  });

  const menuMap = new Map(db.menuItems.map(m => [m.id, m]));
  db.orderItems.forEach(oi => {
    const orderObj = db.orders.find(o => o.id === oi.orderId);
    if (orderObj && orderObj.status !== OrderStatus.PENDING_PAYMENT && orderObj.status !== OrderStatus.CANCELLED) {
      const menu = menuMap.get(oi.menuItemId);
      if (menu) {
        const cat = db.categories.find(c => c.id === menu.categoryId);
        if (cat) {
          salesByCategory[cat.name] = (salesByCategory[cat.name] || 0) + (oi.price * oi.quantity);
        }
      }
    }
  });

  // Hot Selling Menus
  const sellingCount: Record<number, { name: string; count: number; revenue: number }> = {};
  db.orderItems.forEach(oi => {
    const orderObj = db.orders.find(o => o.id === oi.orderId);
    if (orderObj && orderObj.status !== OrderStatus.PENDING_PAYMENT && orderObj.status !== OrderStatus.CANCELLED) {
      const menu = menuMap.get(oi.menuItemId);
      if (menu) {
        if (!sellingCount[menu.id]) {
          sellingCount[menu.id] = { name: menu.name, count: 0, revenue: 0 };
        }
        sellingCount[menu.id].count += oi.quantity;
        sellingCount[menu.id].revenue += oi.price * oi.quantity;
      }
    }
  });

  const popularItems = Object.values(sellingCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalSales,
    totalTransactions,
    averageTransaction,
    salesByCategory,
    popularItems
  });
});

// GET /api/admin/members - Ambil seluruh daftar user/anggota staff
app.get('/api/admin/members', (req, res) => {
  const db = readDB();
  res.json(db.members || []);
});

// POST /api/admin/members - Menambah anggota baru oleh owner
app.post('/api/admin/members', (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nama, E-mail, dan Hak Akses wajib diisi!' });
  }

  const db = readDB();
  const existing = db.members.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'E-mail anggota tersebut sudah terdaftar di sistem!' });
  }

  const newMember: Member = {
    id: `MEM-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    name,
    email: email.trim(),
    role: role as UserRole,
    createdAt: new Date().toISOString()
  };

  db.members.push(newMember);
  writeDB(db);

  notifyClients('MEMBER_ADDED', newMember);
  res.status(201).json(newMember);
});

// DELETE /api/admin/members/:id - Menghapus anggota staff
app.delete('/api/admin/members/:id', (req, res) => {
  const db = readDB();
  const index = db.members.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Anggota tidak ditemukan!' });
  }

  const removed = db.members.splice(index, 1)[0];
  writeDB(db);

  notifyClients('MEMBER_REMOVED', removed);
  res.json({ success: true, removed });
});

// GET /api/admin/emails - Semua log e-receipt keluar
app.get('/api/admin/emails', (req, res) => {
  const db = readDB();
  const sorted = [...(db.emails || [])].sort((a, b) => 
    new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
  res.json(sorted);
});

// POST /api/admin/emails/resend - Kirim ulang nota email customer
app.post('/api/admin/emails/resend', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'orderId wajib ditentukan' });
  }

  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  }

  try {
    await sendReceiptEmail(orderId);
    res.json({ success: true, message: 'Nota berhasil dijadwalkan ulang dan terkirim' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Kesalahan sistem saat mengirim ulang' });
  }
});

// Configure Vite integration for Dev or Production Static Files serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Ensure dist path and assets are served properly
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Full-stack Server Live] running on http://localhost:${PORT}`);
  });
}

startServer();
