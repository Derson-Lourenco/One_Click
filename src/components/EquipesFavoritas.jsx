import React from 'react';
import Swal from 'sweetalert2';

const EquipesFavoritas = ({ equipes, onAplicarEquipe, onRemoverEquipe, aba }) => {
  if (!equipes || equipes.length === 0) {
    return <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Nenhuma equipe salva</span>;
  }
  
  return (
    <>
      {equipes.map(equipe => (
        <div
          key={equipe.id}
          className="favorito-badge"
          onClick={() => onAplicarEquipe(equipe.id, aba)}
          title={`${equipe.tecnicos.length} técnico(s)`}
        >
          <i className="fas fa-users"></i>
          {equipe.nome}
          <i
            className="fas fa-times-circle"
            onClick={(e) => {
              e.stopPropagation();
              onRemoverEquipe(equipe.id, aba);
            }}
          />
        </div>
      ))}
    </>
  );
};

export default EquipesFavoritas;