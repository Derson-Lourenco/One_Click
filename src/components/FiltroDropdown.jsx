import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

const FiltroDropdown = ({
  regionais,
  tecnicosSelecionados,
  onAtivarFiltro,
  onDesativarFiltro,
  onExcluirFiltro,
  onEditarFiltro,
  filtroAtivo,
  equipesFiltradas
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const previewListRef = useRef(null);
  const [hasScroll, setHasScroll] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Verificar se há rolagem na lista de preview
  useEffect(() => {
    const checkScroll = () => {
      if (previewListRef.current) {
        const hasScrollbar = previewListRef.current.scrollHeight > previewListRef.current.clientHeight;
        setHasScroll(hasScrollbar);
      }
    };
    
    if (isOpen && filtroAtivo && equipesFiltradas?.length > 0) {
      setTimeout(checkScroll, 100);
      window.addEventListener('resize', checkScroll);
    }
    
    return () => window.removeEventListener('resize', checkScroll);
  }, [isOpen, filtroAtivo, equipesFiltradas]);
  
  const getStatusText = () => {
    if (filtroAtivo && equipesFiltradas?.length > 0) {
      return 'Filtro Ativo';
    }
    return 'Filtro Inativo';
  };
  
  const getFilterInfo = () => {
    if (filtroAtivo && equipesFiltradas?.length > 0) {
      return {
        className: 'filter-info filter-active-info',
        icon: 'fa-check-circle',
        text: `Filtro ativo com ${equipesFiltradas.length} técnico(s)`
      };
    }
    return {
      className: 'filter-info',
      icon: 'fa-info-circle',
      text: 'Nenhum filtro ativo'
    };
  };
  
  const filterInfo = getFilterInfo();
  
  return (
    <div className="filter-dropdown-container" ref={dropdownRef}>
      <button
        className={`filter-main-btn ${filtroAtivo ? 'filter-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <i className="fas fa-filter"></i>
        <span id="filterStatusText">{getStatusText()}</span>
        <i className="fas fa-chevron-down"></i>
      </button>
      
      <div className={`filter-dropdown-menu ${isOpen ? 'show' : ''}`}>
        <div className="filter-dropdown-header">
          <i className="fas fa-sliders-h"></i>
          <span>Gerenciar Filtro de Equipes</span>
        </div>
        <div className="filter-dropdown-body">
          <div className={filterInfo.className}>
            <i className={`fas ${filterInfo.icon}`}></i>
            <span>{filterInfo.text}</span>
          </div>
          <div className="filter-actions">
            {!filtroAtivo && (
              <button
                className="filter-action-btn"
                onClick={() => {
                  onAtivarFiltro();
                  setIsOpen(false);
                }}
              >
                <i className="fas fa-play"></i>
                <span>Ativar Filtro</span>
              </button>
            )}
            {filtroAtivo && (
              <button
                className="filter-action-btn"
                onClick={() => {
                  onDesativarFiltro();
                  setIsOpen(false);
                }}
              >
                <i className="fas fa-stop"></i>
                <span>Desativar Filtro</span>
              </button>
            )}
            <button
              className="filter-action-btn filter-danger"
              onClick={() => {
                onExcluirFiltro();
                setIsOpen(false);
              }}
            >
              <i className="fas fa-trash-alt"></i>
              <span>Excluir Filtro</span>
            </button>
            <button
              className="filter-action-btn filter-edit"
              onClick={() => {
                onEditarFiltro();
                setIsOpen(false);
              }}
            >
              <i className="fas fa-edit"></i>
              <span>Editar Filtro</span>
            </button>
          </div>
          
          {filtroAtivo && equipesFiltradas?.length > 0 && (
            <div className="filter-preview">
              <div className="filter-preview-title">
                <i className="fas fa-users"></i>
                <span>Técnicos no filtro:</span>
                <span className="contador" style={{ 
                  background: 'rgba(0,0,0,0.1)', 
                  padding: '2px 8px', 
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  marginLeft: '8px'
                }}>
                  {equipesFiltradas.length}
                </span>
              </div>
              <div 
                ref={previewListRef}
                className={`filter-preview-list ${hasScroll ? 'has-scroll' : ''}`}
                style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto',
                  padding: '4px',
                  scrollBehavior: 'smooth'
                }}
              >
                {equipesFiltradas.map(tec => (
                  <div key={tec.nome} className="filter-preview-item">
                    <i className="fas fa-user"></i>
                    {tec.nome}
                  </div>
                ))}
              </div>
              {/* Indicador visual de que há mais conteúdo */}
              {hasScroll && equipesFiltradas.length > 8 && (
                <div style={{ 
                  textAlign: 'center', 
                  fontSize: '0.65rem', 
                  color: '#94a3b8', 
                  padding: '6px 0 2px 0',
                  borderTop: '1px dashed #e2e8f0',
                  marginTop: '4px'
                }}>
                  <i className="fas fa-arrow-down"></i> Role para ver mais ({equipesFiltradas.length - 8} restantes)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiltroDropdown;