import React, { useState, useEffect, useRef } from 'react';

const TecnicosList = ({
  regionais,
  tecnicosSelecionados,
  onToggleTecnico,
  searchTerm = '',
  disabled = false
}) => {
  const [filteredRegionais, setFilteredRegionais] = useState({});
  const containerRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);

  useEffect(() => {
    if (!regionais) {
      setFilteredRegionais({});
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredRegionais(regionais);
      return;
    }

    const termo = searchTerm.toLowerCase().trim();
    const filtradas = {};
    for (let regional in regionais) {
      const tecnicosFiltrados = regionais[regional].filter(tec =>
        tec.toLowerCase().includes(termo)
      );
      if (tecnicosFiltrados.length > 0) {
        filtradas[regional] = tecnicosFiltrados;
      }
    }
    setFilteredRegionais(filtradas);
  }, [regionais, searchTerm]);

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
  }, [filteredRegionais]);

  const isSelected = (nome, regional) => {
    return tecnicosSelecionados.some(t => t.nome === nome && t.regional === regional);
  };

  if (!regionais || Object.keys(regionais).length === 0) {
    return (
      <div className="loading-tecnicos">
        <i className="fas fa-spinner fa-pulse"></i> Carregando técnicos...
      </div>
    );
  }

  if (Object.keys(filteredRegionais).length === 0 && searchTerm) {
    return (
      <div className="loading-tecnicos">
        <i className="fas fa-search"></i> Nenhum técnico encontrado para "{searchTerm}"
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`tecnicos-lista-container ${hasScroll ? 'has-scroll' : ''}`}
      style={{ maxHeight: '500px', overflowY: 'auto' }}
    >
      {Object.entries(filteredRegionais).map(([regional, tecnicos]) => (
        <div key={regional} className="regional-bloco">
          <div className="regional-titulo">
            <i className="fas fa-map-marker-alt"></i>
            <span>{regional}</span>
            <span className="contador">{tecnicos.length} técnicos</span>
          </div>
          <div className="tecnicos-lista">
            {tecnicos.map(tec => (
              <div
                key={tec}
                className={`tecnico-checkbox-item ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && onToggleTecnico(tec, regional)}
              >
                <input
                  type="checkbox"
                  checked={isSelected(tec, regional)}
                  onChange={() => {}}
                  disabled={disabled}
                />
                <label>{tec}</label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TecnicosList;