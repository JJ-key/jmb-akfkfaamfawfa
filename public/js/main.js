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

const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach(card => {
  const btn = card.querySelector('.project-toggle');
  const panel = card.querySelector('.project-photos');
  btn.addEventListener('click', () => {
    const willOpen = !card.classList.contains('is-open');

    projectCards.forEach(other => {
      if (other === card) return;
      other.classList.remove('is-open');
      const otherBtn = other.querySelector('.project-toggle');
      const otherPanel = other.querySelector('.project-photos');
      otherBtn.setAttribute('aria-expanded', 'false');
      otherPanel.hidden = true;
    });

    card.classList.toggle('is-open', willOpen);
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    panel.hidden = !willOpen;

    if (willOpen) {
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
