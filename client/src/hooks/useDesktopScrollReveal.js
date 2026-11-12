import { useEffect } from 'react';

/**
 * Observes `.web-reveal` elements inside `containerRef` when `enabled` is true
 * (desktop web views) and applies `.is-visible` cleanly upon viewport entry.
 */
export function useDesktopScrollReveal(containerRef, enabled, deps = []) {
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef?.current;
    if (!root) return;

    const elements = Array.from(root.querySelectorAll('.web-reveal'));
    if (elements.length === 0) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const revealVisibleNow = () => {
      const vh = window.innerHeight || 800;
      elements.forEach((el) => {
        if (el.classList.contains('is-visible')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.96 && rect.bottom > 0) {
          el.classList.add('is-visible');
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -28px 0px' }
    );

    elements.forEach((el) => {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });

    const rafId = window.requestAnimationFrame(revealVisibleNow);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, containerRef, ...deps]);
}
