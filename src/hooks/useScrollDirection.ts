import { useState, useEffect } from 'react';

export function useScrollDirection() {
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      
      // Set hasScrolled to true if user has scrolled more than 50px
      if (scrollY > 50) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
      
      if (Math.abs(scrollY - lastScrollY) < 5) {
        ticking = false;
        return;
      }
      
      // Show controls immediately when scrolling up, hide after 25px when scrolling down
      if (scrollY < lastScrollY) {
        setIsScrollingDown(false);
      } else if (scrollY > lastScrollY && scrollY > 25) {
        setIsScrollingDown(true);
      }
      
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

  return { isScrollingDown, lastScrollY, hasScrolled };
}