const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

document.querySelectorAll('.project-card .project-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.project-card');
    const panel = card.querySelector('.project-photos');
    const isOpen = card.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    panel.hidden = !isOpen;
    if (isOpen) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const fadeTargets = document.querySelectorAll('.service-card');
if (fadeTargets.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  fadeTargets.forEach(el => observer.observe(el));
} else {
  fadeTargets.forEach(el => el.classList.add('visible'));
}
