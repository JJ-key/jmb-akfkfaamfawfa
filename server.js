require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["'self'", "https://www.google.com", "https://www.google.com/maps/"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/config', (req, res) => {
  res.json({
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
  });
});

async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { success: true, reason: 'recaptcha-not-configured' };
  if (!token) return { success: false, reason: 'missing-token' };

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.append('remoteip', remoteIp);

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await response.json();
    return { success: !!data.success, reason: data['error-codes']?.join(',') };
  } catch (err) {
    return { success: false, reason: 'verification-failed' };
  }
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, phone, message, 'g-recaptcha-response': recaptchaToken, website, company } = req.body || {};

  if ((website && website.trim() !== '') || (company && company.trim() !== '')) {
    return res.json({ ok: true });
  }

  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid input.' });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanPhone = (phone || '').trim();
  const cleanMessage = message.trim();

  if (cleanName.length < 2 || cleanName.length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
  }
  if (!validator.isEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (cleanPhone && !validator.isMobilePhone(cleanPhone, 'any', { strictMode: false })) {
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  }
  if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
    return res.status(400).json({ error: 'Message must be between 10 and 2000 characters.' });
  }

  const recaptcha = await verifyRecaptcha(recaptchaToken, req.ip);
  if (!recaptcha.success) {
    return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
  }

  const esc = (s = '') => validator.escape(String(s));

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `JM Basements <${process.env.CONTACT_FROM}>`,
        to: [process.env.CONTACT_TO],
        reply_to: cleanEmail,
        subject: `New website enquiry from ${cleanName}`,
        html: `<h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${esc(cleanName)}</p>
          <p><strong>Email:</strong> ${esc(cleanEmail)}</p>
          <p><strong>Phone:</strong> ${esc(cleanPhone || '—')}</p>
          <p><strong>Message:</strong><br>${esc(cleanMessage).replace(/\n/g, '<br>')}</p>`,
      }),
    });

    if (!r.ok) {
      console.error('Resend error:', await r.text());
      return res.status(502).json({ error: 'Could not send right now. Please try again.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later or call us directly.' });
  }
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`JMB Basements site running at http://localhost:${PORT}`);
});
