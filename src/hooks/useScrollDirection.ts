import { useState, useEffect } from 'react';

export function useScrollDirection() {
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      
      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }
      
      setIsScrollingDown(scrollY > lastScrollY && scrollY > 100);
      setLastScrollY(scrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScrollY]);

  return { isScrollingDown, lastScrollY };
}