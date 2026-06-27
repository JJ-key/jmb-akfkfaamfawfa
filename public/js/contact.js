(async function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const recaptchaContainer = document.getElementById('recaptcha-container');

  let recaptchaWidgetId = null;

  try {
    const res = await fetch('/api/config');
    const config = await res.json();

    if (config.recaptchaSiteKey) {
      const renderWhenReady = () => {
        if (window.grecaptcha && window.grecaptcha.render) {
          recaptchaWidgetId = window.grecaptcha.render(recaptchaContainer, {
            sitekey: config.recaptchaSiteKey,
            theme: 'dark',
          });
        } else {
          setTimeout(renderWhenReady, 200);
        }
      };
      renderWhenReady();
    } else {
      recaptchaContainer.innerHTML =
        '<p style="color:var(--muted);font-size:0.9rem;">reCAPTCHA not configured yet. Form will still submit.</p>';
    }
  } catch (err) {
    console.error('Config load failed', err);
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'form-status ' + type;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.className = 'form-status';
    statusEl.textContent = '';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (window.grecaptcha && recaptchaWidgetId !== null) {
      payload['g-recaptcha-response'] = window.grecaptcha.getResponse(recaptchaWidgetId);
      if (!payload['g-recaptcha-response']) {
        showStatus('Please complete the reCAPTCHA before submitting.', 'error');
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showStatus('Thanks! Your message has been sent. We\'ll be in touch shortly.', 'success');
        form.reset();
        if (window.grecaptcha && recaptchaWidgetId !== null) {
          window.grecaptcha.reset(recaptchaWidgetId);
        }
      } else {
        showStatus(data.error || 'Something went wrong. Please try again.', 'error');
        if (window.grecaptcha && recaptchaWidgetId !== null) {
          window.grecaptcha.reset(recaptchaWidgetId);
        }
      }
    } catch (err) {
      showStatus('Network error. Please check your connection and try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
})();
