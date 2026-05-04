import React from 'react';

type ResponsibilityAgreementProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const ResponsibilityAgreement: React.FC<ResponsibilityAgreementProps> = ({ checked, onChange }) => {
  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(245,158,11,0.05))',
      border: '1px solid rgba(239,68,68,0.15)',
      marginBottom: '1rem',
      padding: '1rem'
    }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          style={{ marginTop: '0.25rem' }}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
        />
        <div>
          <strong style={{ color: 'var(--danger)' }}>Kullanıcı Sorumluluk Sözleşmesi</strong>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.5' }}>
            Kundiva platformunda paylaştığım tüm içeriklerin sorumluluğunun bana ait olduğunu kabul ediyorum. 
            Uygunsuz, hakaret içeren, argo barındıran veya eğitim amacı dışında (spam, zorbalık vb.) yapılan tüm paylaşımların tespit edilmesi halinde hakkımda 
            <a href="https://zbaal.meb.k12.tr/icerikler/ortaogretimkurumlaridisiplinyonetmeligi_15399304.html" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold', margin: '0 4px' }}>
              MEB Ortaöğretim Kurumları Disiplin Yönetmeliği
            </a>
            kapsamında resmi disiplin işlemi uygulanabileceğini okudum ve anladım.
          </p>
        </div>
      </label>
    </div>
  );
};
