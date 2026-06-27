# JMB Basements Website

Marketing site for JM Basements (Auburn Hills, MI) with a photo gallery, services overview, and a secure contact form that emails submissions to the owner.

## Stack

- Node.js + Express
- Helmet (security headers / CSP)
- express-rate-limit (5 submissions per IP per hour)
- Nodemailer (SMTP)
- Google reCAPTCHA v2 (bot prevention)
- Validator (server-side input validation)
- Static HTML / CSS / vanilla JS frontend

## Getting started

```bash
npm install
cp .env.example .env
# edit .env and fill in the values below
npm start
```

Open http://localhost:3000

## Required environment variables

Edit `.env` and set these:

### SMTP (for sending contact emails)

The site uses Gmail by default. To send through Gmail you need an **App Password**:

1. Enable 2-Step Verification on the Google account
2. Visit https://myaccount.google.com/apppasswords
3. Create an app password named "JMB Website"
4. Put the generated password in `SMTP_PASS`

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sending-email@gmail.com
SMTP_PASS=your-app-password
OWNER_EMAIL=jesusmachen@gmail.com
```

Any other SMTP provider (SendGrid, Mailgun, Postmark, your hosting provider) works the same way — just plug in their host, port, and credentials.

### reCAPTCHA v2 keys

1. Go to https://www.google.com/recaptcha/admin/create
2. Choose **reCAPTCHA v2** -> **"I'm not a robot" Checkbox**
3. Add your domain(s). For local testing, add `localhost`
4. Copy the **Site Key** to `RECAPTCHA_SITE_KEY`
5. Copy the **Secret Key** to `RECAPTCHA_SECRET_KEY`

If reCAPTCHA keys are missing, the form will still submit but bots will not be blocked.

## Project structure

```
.
├── server.js             # Express server, API routes, email sending
├── package.json
├── .env.example          # Template for environment variables
├── public/
│   ├── index.html        # Homepage (hero, services, gallery, about)
│   ├── contact.html      # Contact form page with map
│   ├── css/style.css
│   ├── js/
│   │   ├── main.js       # Navbar toggle, scroll animations, footer year
│   │   └── contact.js    # Form submission, reCAPTCHA handling
│   └── images/           # All 40 project photos
```

## Security features

- All inputs validated and length-limited server-side
- HTML escaping on every form value sent in email
- Rate limit: 5 submissions per IP per hour
- Honeypot field to catch dumb bots
- reCAPTCHA v2 to catch smarter bots
- Helmet security headers + strict Content Security Policy
- `.env` is gitignored — secrets never get committed
- 10 KB request body cap

## Deploying

For production, point a domain at the server, run behind HTTPS (Nginx / Caddy / a platform like Render / Fly / Railway), and set the same environment variables in your host's dashboard. Add the production domain to the reCAPTCHA admin console.
