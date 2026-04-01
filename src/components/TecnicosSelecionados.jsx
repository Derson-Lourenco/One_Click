import React, { useRef, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const TecnicosSelecionados = ({
  tecnicosSelecionados,
  onRemoveTecnico,
  onUpdateTipoEquipe,
  onUpdateJornada,
  onOpenJustificativas,
  showJustificativasButton = true
}) => {
  const containerRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  // Verificar se há rolagem
  useEffect(() => {
    const checkScroll = () => {
      if (containerRef.current) {
        const hasScrollbar = containerRef.current.scrollHeight > containerRef.current.clientHeight;
        setHasScroll(hasScrollbar);
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    return () => window.removeEventListener('resize', checkScroll);
  }, [tecnicosSelecionados]);

  if (!tecnicosSelecionados || tecnicosSelecionados.length === 0) {
    return null;
  }

  const agrupado = {};
  tecnicosSelecionados.forEach(tec => {
    if (!agrupado[tec.regional]) agrupado[tec.regional] = [];
    agrupado[tec.regional].push(tec);
  });

  return (
    <div 
      ref={containerRef}
      className={`equipes-selecionadas-container ${hasScroll ? 'has-scroll' : ''}`}
      style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}
    >
      <h5>
        <i className="fas fa-check-circle"></i>
        Técnicos Selecionados ({tecnicosSelecionados.length})
      </h5>
      {Object.entries(agrupado).map(([regional, tecnicos]) => (
        <div key={regional} style={{ marginBottom: '1rem' }}>
          <div style={{ 
            fontWeight: 600, 
            color: 'var(--primary-color)', 
            marginBottom: '0.5rem',
            position: 'sticky',
            top: '48px',
            background: 'white',
            padding: '4px 0',
            zIndex: 5
          }}>
            <i className="fas fa-map-marker-alt"></i> {regional} ({tecnicos.length})
          </div>
          {tecnicos.map(tec => {
            const isSolo = tec.tipoEquipe === 'Solo';
            const isComercial = tec.jornada === 'Comercial';
            
            return (
              <div key={tec.nome} className="equipe-selecionada-bloco">
                <div className="equipe-selecionada-header">
                  <span className="equipe-selecionada-nome">
                    <i className="fas fa-user"></i> {tec.nome}
                  </span>
                  <div className="equipe-actions">
                    <div className="radio-group-relatorio">
                      <label
                        className={`radio-label-relatorio ${isSolo ? 'active' : ''}`}
                        onClick={() => onUpdateTipoEquipe(tec.nome, tec.regional, 'Solo')}
                      >
                        Solo
                      </label>
                      <label
                        className={`radio-label-relatorio ${!isSolo ? 'active' : ''}`}
                        onClick={() => onUpdateTipoEquipe(tec.nome, tec.regional, 'Dupla')}
                      >
                        Dupla
                      </label>
                    </div>
                    <div className="jornada-group">
                      <label
                        className={`jornada-option ${isComercial ? 'active' : ''}`}
                        onClick={() => onUpdateJornada(tec.nome, tec.regional, 'Comercial')}
                      >
                        Comercial
                      </label>
                      <label
                        className={`jornada-option ${!isComercial ? 'active' : ''}`}
                        onClick={() => onUpdateJornada(tec.nome, tec.regional, '12/36')}
                      >
                        12/36
                      </label>
                    </div>
                    {showJustificativasButton && (
                      <button
                        className="btn-add-justificativa"
                        onClick={() => onOpenJustificativas(tec.nome, tec.regional)}
                        title="Adicionar justificativa"
                      >
                        <i className="fas fa-plus"></i> Justif.
                      </button>
                    )}
                    <button
                      className="btn-remove-equipe"
                      onClick={() => onRemoveTecnico(tec.nome, tec.regional)}
                      title="Remover técnico"
                    >
                      <i className="fas fa-times-circle"></i>
                    </button>
                  </div>
                </div>
                <div className="equipe-selecionada-regional">{regional}</div>
              </div>
            );
          })}
        </div>
      ))}
      
      {/* Indicador visual de que há mais conteúdo (opcional) */}
      {hasScroll && tecnicosSelecionados.length > 5 && (
        <div style={{ 
          textAlign: 'center', 
          fontSize: '0.7rem', 
          color: '#94a3b8', 
          padding: '8px 0',
          borderTop: '1px dashed #e2e8f0',
          marginTop: '8px'
        }}>
          <i className="fas fa-arrow-down"></i> Role para ver mais técnicos
        </div>
      )}
    </div>
  );
};

export default TecnicosSelecionados;