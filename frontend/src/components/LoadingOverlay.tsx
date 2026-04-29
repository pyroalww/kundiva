type LoadingOverlayProps = {
  message?: string;
  fullscreen?: boolean;
  subtle?: boolean;
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Yükleniyor...',
  fullscreen = false,
  subtle = false
}) => {
  return (
    <div className={`loading-overlay ${fullscreen ? 'fullscreen' : ''} ${subtle ? 'subtle' : ''}`}>
      <div className="loader-card">
        <div className="loader-spinner" />
        <div className="loader-text">
          <strong>{message}</strong>
          {!subtle && <span>Bu işlem güvenli kuyruğumuzda işleniyor.</span>}
        </div>
      </div>
    </div>
  );
};
