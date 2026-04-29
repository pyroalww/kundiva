import { NavBar } from './NavBar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell">
      <div className="app-backdrop">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-overlay" />
      </div>
      <NavBar />
      <main className="app-content">{children}</main>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">Kundiva</span>
            <p>Öğrenciler ile gönüllü öğretmenleri ve yapay zekâyı aynı çatı altında buluşturan eğitim platformu.</p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul className="footer-links">
              <li><a href="/">Ana Sayfa</a></li>
              <li><a href="/questions/discover">Soru Havuzu</a></li>
              <li><a href="/leaderboard">Liderlik</a></li>
              <li><a href="/support">Destek</a></li>
            </ul>
          </div>
          <div>
            <h4>Proje</h4>
            <ul className="footer-links">
              <li>Şeyh İsa Anadolu Lisesi</li>
              <li>TÜBİTAK 4006 Bilim Fuarı</li>
              <li>Yazılım: Çağan DOĞAN & Ömer BÜKE</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Kundiva — Tüm hakları saklıdır.</span>
        </div>
      </footer>
    </div>
  );
};
