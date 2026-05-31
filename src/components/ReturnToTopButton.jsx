import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ReturnToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '6.5rem',
        right: '1.75rem',
        zIndex: 40,
        background: 'var(--zeal-blue, #0056b3)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '3rem',
        height: '3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transition: 'transform 0.2s, background 0.2s',
      }}
      className="return-to-top-btn"
      aria-label="Return to top"
    >
      <ArrowUp size={24} />
      <style>{`
        .return-to-top-btn:hover {
          transform: translateY(-2px);
          background: var(--zeal-red, #dc3545);
        }
      `}</style>
    </button>
  );
}
