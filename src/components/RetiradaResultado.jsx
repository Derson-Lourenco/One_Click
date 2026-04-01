import React from 'react';
import Swal from 'sweetalert2';

const RetiradaResultado = ({ conteudo, onCopiar }) => {
  const handleCopy = () => {
    if (!conteudo || !conteudo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nada para copiar',
        text: 'Gere um relatório primeiro!',
        toast: true,
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    
    navigator.clipboard.writeText(conteudo).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copiado!',
        text: 'Texto copiado para a área de transferência',
        toast: true,
        timer: 1500,
        showConfirmButton: false
      });
    });
  };
  
  return (
    <div className="card-resultado">
      <div className="card-resultado-header">
        <div className="card-header-icon">
          <i className="fas fa-hourglass-half"></i>
        </div>
        <h3>RETIRADA DE TEMPO</h3>
        <button onClick={handleCopy} className="btn-copy-modern">
          <i className="fas fa-copy"></i> Copiar
        </button>
      </div>
      <div className="card-resultado-body">
        <div className="retirada-resultado">
          {conteudo || 'As retiradas de tempo aparecerão aqui após gerar o relatório'}
        </div>
      </div>
    </div>
  );
};

export default RetiradaResultado;