import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <section className="card" style={{ maxWidth: '480px', margin: '2rem auto', textAlign: 'center' }}>
      <h1>Sayfa bulunamadı</h1>
      <p>Aradığınız içeriği bulamadık.</p>
      <Link className="button" to="/">
        Ana sayfaya dön
      </Link>
    </section>
  );
};
