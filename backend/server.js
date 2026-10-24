require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const OWNER = process.env.OWNER_EMAIL || 'jvalix.ai@gmail.com';
const PHONE = '+91 77383 33329';

// Render sits behind a proxy. Trust it so rate limiting can use the real client IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Allow the GitHub Pages/custom-domain frontend to call this API.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'jvalix-api' }));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.post('/api/schedule', limiter, async (req, res) => {
  const { name, email, phone, company, category, website } = req.body || {};
  if (website) return res.json({ ok: true }); // honeypot: bots only

  const clean = (v, n = 120) => String(v || '').trim().slice(0, n);
  const d = {
    name: clean(name),
    email: clean(email, 160),
    phone: clean(phone, 20),
    company: clean(company),
    category: clean(category),
  };

  if (!d.name || !/^\S+@\S+\.\S+$/.test(d.email) || d.phone.replace(/\D/g, '').length < 10 || !d.company || !d.category) {
    return res.status(400).json({ error: 'Please fill all fields correctly.' });
  }

  const row = (k, v) => `<tr><td style="padding:6px 14px 6px 0;color:#666">${k}</td><td><b>${esc(v)}</b></td></tr>`;
  const table = `<table>${row('Name', d.name)}${row('Email', d.email)}${row('Phone', d.phone)}${row('Company', d.company)}${row('Category', d.category)}</table>`;

  try {
    await Promise.all([
      transporter.sendMail({
        from: `"Jvalix Website" <${process.env.GMAIL_USER}>`,
        to: OWNER,
        replyTo: d.email,
        subject: `New consultation request – ${d.name} (${d.company})`,
        html: `<h2>New lead 🎯</h2>${table}<p>Reply within 24 hours for best conversion.</p>`,
      }),
      transporter.sendMail({
        from: `"Jvalix" <${process.env.GMAIL_USER}>`,
        to: d.email,
        replyTo: OWNER,
        subject: 'Thanks for contacting Jvalix – we will call you soon',
        html: `<p>Hi ${esc(d.name)},</p>
<p>Thank you for your interest in <b>${esc(d.category)}</b>. Our team will contact you shortly to schedule your consultation.</p>
${table}
<p>Need us sooner? Call <a href="tel:+917738333329">${PHONE}</a> or reply to this email.</p>
<p>– Team Jvalix<br>${esc(OWNER)}</p>`,
      }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    res.status(500).json({ error: `Could not send right now. Please call ${PHONE}.` });
  }
});

app.listen(port, () => console.log(`Jvalix API listening on port ${port}`));
