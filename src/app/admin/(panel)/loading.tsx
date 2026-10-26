// Esqueleto que se ve al instante al cambiar de pestaña del panel, mientras la página consulta sus datos.
export default function PanelLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div>
        <div className="skeleton" style={{ height: 34, width: 190 }} />
        <div className="skeleton" style={{ height: 14, width: 'min(420px, 80%)', marginTop: 12 }} />
      </div>
      <div className="skeleton" style={{ height: 52, width: 'min(420px, 100%)' }} />
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </div>
  );
}
