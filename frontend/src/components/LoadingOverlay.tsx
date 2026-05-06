import { useEffect, useState } from 'react';

type LoadingOverlayProps = {
  message?: string;
  fullscreen?: boolean;
  subtle?: boolean;
};

const TIPS = [
  'Sorularını düzenli tekrar et, başarı seni bulacaktır! 📖',
  'KundivaAI ile benzer sorular çözerek antrenman yapabilirsin! 🤖',
  'Doğru çözümler 10 puan ve 1 AI kredisi kazandırır! ⭐',
  'Arkadaşlarınla yarışarak öğrenmeyi eğlenceli hale getir! 🏆',
  'Profil sayfandan istatistiklerini takip edebilirsin! 📊',
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Yükleniyor...',
  fullscreen = false,
  subtle = false
}) => {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    if (subtle) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [subtle]);

  if (subtle) {
    return (
      <div className="loading-subtle">
        <div className="skeleton-shimmer" />
        <div className="skeleton-shimmer" style={{ width: '75%' }} />
        <div className="skeleton-shimmer" style={{ width: '50%' }} />
      </div>
    );
  }

  return (
    <div className={`loading-overlay-v2 ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="loader-card-v2">
        <div className="loader-ring">
          <div className="loader-ring-inner" />
          <div className="loader-ring-glow" />
          <span className="loader-ring-icon">K</span>
        </div>
        <div className="loader-text-v2">
          <strong>{message}</strong>
          <span className="loader-tip fade-in" key={tipIndex}>{TIPS[tipIndex]}</span>
        </div>
        <div className="loader-progress">
          <div className="loader-progress-bar" />
        </div>
      </div>
    </div>
  );
};
