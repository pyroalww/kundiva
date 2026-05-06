import { useEffect, useState, useCallback } from 'react';

type ImageLightboxProps = {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt = '', className, style }) => {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const apiBase = (import.meta as any).env?.VITE_API_URL || '';
  const resolvedSrc = src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')
    ? src
    : `${apiBase.replace(/\/api$/, '')}${src.startsWith('/') ? '' : '/'}${src}`;

  return (
    <>
      <img
        src={resolvedSrc}
        alt={alt}
        className={className}
        style={{
          cursor: 'zoom-in',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          borderRadius: '12px',
          maxWidth: '100%',
          ...style
        }}
        onClick={() => setOpen(true)}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />
      {open && (
        <div
          className="lightbox-backdrop"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fade-in 0.2s ease',
            cursor: 'zoom-out',
            padding: '2rem'
          }}
        >
          <img
            src={resolvedSrc}
            alt={alt}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '16px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              animation: 'fade-slide-up 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
