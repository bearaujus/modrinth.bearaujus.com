/* Scroll reveal: add .is-in when an element scrolls into view.
   CSS handles the transition; reduced-motion users get everything
   visible immediately (see global.css). */

function init() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!els.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }

  // Keep anything already in the viewport visible before enabling the hidden
  // state. If this module ever fails to load, CSS leaves all content visible.
  const viewportEdge = window.innerHeight * 0.96;
  const visible: HTMLElement[] = [];

  // Batch geometry reads before class writes to avoid repeated synchronous
  // layout as the reveal state is initialized.
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    if (rect.top < viewportEdge && rect.bottom > 0) visible.push(el);
  }
  visible.forEach((el) => el.classList.add('is-in'));
  document.documentElement.classList.add('reveal-ready');

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('is-in');
          obs.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  els.filter((el) => !el.classList.contains('is-in')).forEach((el) => io.observe(el));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
