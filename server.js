require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
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
  if (!secret) return { success: false, reason: 'recaptcha-not-configured' };
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

function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, phone, message, 'g-recaptcha-response': recaptchaToken, website } = req.body || {};

  if (website && website.trim() !== '') {
    return res.json({ success: true });
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

  const safe = (s) => validator.escape(s);

  try {
    const transporter = buildTransport();
    await transporter.sendMail({
      from: `"JMB Basements Website" <${process.env.SMTP_USER}>`,
      to: process.env.OWNER_EMAIL,
      replyTo: cleanEmail,
      subject: `New Contact Form Submission from ${cleanName}`,
      text: [
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Phone: ${cleanPhone || '(not provided)'}`,
        '',
        'Message:',
        cleanMessage,
      ].join('\n'),
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${safe(cleanName)}</p>
        <p><strong>Email:</strong> ${safe(cleanEmail)}</p>
        <p><strong>Phone:</strong> ${safe(cleanPhone) || '(not provided)'}</p>
        <p><strong>Message:</strong></p>
        <p>${safe(cleanMessage).replace(/\n/g, '<br>')}</p>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Email send failed:', err.message);
    res.status(500).json({ error: 'Failed to send message. Please try again later or call us directly.' });
  }
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`JMB Basements site running at http://localhost:${PORT}`);
});
