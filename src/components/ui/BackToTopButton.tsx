import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackToTopButtonProps {
  threshold?: number;
}

export function BackToTopButton({ threshold = 800 }: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-24 right-4 z-50 h-12 w-12 rounded-full bg-gradient-to-r from-cta-primary to-cta-primary-glow text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-cta-primary/50 animate-fade-in"
      aria-label="Back to top"
    >
      <ArrowUp className="h-6 w-6" />
    </Button>
  );
}
