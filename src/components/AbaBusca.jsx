import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';
import { Utils } from '../utils/helpers';
import { PlanilhaProcessor } from '../utils/api';

const AbaBusca = () => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dadosBusca, setDadosBusca] = useState([]);
  const [metricas, setMetricas] = useState({
    planejamento: 0,
    execucao: 0,
    remarcacao: 0,
    cancelamento: 0,
    tratativasCS: 0,
    infraestrutura: 0,
    resolucaoN2: 0
  });
  const [carregando, setCarregando] = useState(false);
  
  let metricasChartInstance = null;
  let distribuicaoChartInstance = null;
  
  useEffect(() => {
    const hoje = new Date();
    const semanaAtras = new Date();
    semanaAtras.setDate(hoje.getDate() - 7);
    
    setDataInicio(semanaAtras.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);
  }, []);
  
  const buscarDados = async () => {
    if (!dataInicio || !dataFim) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos obrigatórios',
        text: 'Selecione a data inicial e final!',
        toast: true,
        timer: 2000
      });
      return;
    }
    
    setCarregando(true);
    
    Swal.fire({
      title: 'Buscando dados...',
      text: `Carregando dados de ${Utils.formatarData(dataInicio)} a ${Utils.formatarData(dataFim)}`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const dadosAcumulados = [];
    const metricasTotais = {
      planejamento: 0,
      execucao: 0,
      remarcacao: 0,
      cancelamento: 0,
      tratativasCS: 0,
      infraestrutura: 0,
      resolucaoN2: 0
    };
    
    // Gerar array de datas
    const datas = [];
    let currentDate = new Date(dataInicio);
    const endDate = new Date(dataFim);
    
    while (currentDate <= endDate) {
      const dataISO = currentDate.toISOString().split('T')[0];
      datas.push(dataISO);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Buscar dados para cada data
    for (const data of datas) {
      try {
        const resposta = await PlanilhaProcessor.carregarDadosPorData(data);
        
        if (resposta.dados && resposta.dados.length > 0) {
          const regionaisTemp = PlanilhaProcessor.extrairTecnicosPorRegional(resposta.dados);
          const tecnicosTemp = [];
          
          for (let regional in regionaisTemp) {
            regionaisTemp[regional].forEach(tecnico => {
              tecnicosTemp.push({ nome: tecnico, regional });
            });
          }
          
          for (const tecnicoObj of tecnicosTemp) {
            const metricasDia = PlanilhaProcessor.processarDadosTecnicoPorRegional(
              resposta.dados, tecnicoObj.nome, tecnicoObj.regional,
              { TABELA_PESOS: {}, SERVICOS_IGNORADOS: [], Utils }
            );
            
            metricasTotais.planejamento += metricasDia.planejamento;
            metricasTotais.execucao += metricasDia.execucao;
            metricasTotais.remarcacao += metricasDia.remarcacao;
            metricasTotais.cancelamento += metricasDia.cancelamento;
            metricasTotais.tratativasCS += metricasDia.tratativasCS;
            metricasTotais.infraestrutura += metricasDia.infraestrutura;
            metricasTotais.resolucaoN2 += metricasDia.resolucaoN2;
          }
          
          dadosAcumulados.push({
            data,
            metricas: { ...metricasTotais }
          });
        }
      } catch (error) {
        console.error(`Erro ao carregar dados para ${data}:`, error);
      }
    }
    
    setDadosBusca(dadosAcumulados);
    setMetricas(metricasTotais);
    atualizarGraficos(metricasTotais);
    atualizarTabela(dadosAcumulados);
    
    Swal.fire({
      icon: 'success',
      title: 'Busca concluída!',
      text: `Foram processados ${dadosAcumulados.length} dias`,
      timer: 3000,
      showConfirmButton: false
    });
    
    setCarregando(false);
  };
  
  const atualizarGraficos = (metricasTotais) => {
    const ctx1 = document.getElementById('metricasChart')?.getContext('2d');
    const ctx2 = document.getElementById('distribuicaoChart')?.getContext('2d');
    
    if (!ctx1 || !ctx2) return;
    
    const labels = ['Planejamento', 'Execução', 'Remarcação', 'Cancelamento', 'Tratativas CS', 'Infraestrutura', 'Resolução N2'];
    const valores = [
      metricasTotais.planejamento,
      metricasTotais.execucao,
      metricasTotais.remarcacao,
      metricasTotais.cancelamento,
      metricasTotais.tratativasCS,
      metricasTotais.infraestrutura,
      metricasTotais.resolucaoN2
    ];
    
    // Destruir gráficos existentes
    if (metricasChartInstance) metricasChartInstance.destroy();
    if (distribuicaoChartInstance) distribuicaoChartInstance.destroy();
    
    // Gráfico de Barras
    const gradient = ctx1.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(232, 70, 93, 0.9)');
    gradient.addColorStop(0.5, 'rgba(232, 70, 93, 0.6)');
    gradient.addColorStop(1, 'rgba(232, 70, 93, 0.3)');
    
    metricasChartInstance = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Quantidade de Protocolos',
          data: valores,
          backgroundColor: gradient,
          borderColor: '#E8465D',
          borderWidth: 2,
          borderRadius: 16,
          barPercentage: 0.7,
          categoryPercentage: 0.85
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12, weight: '600' } }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                return `${context.raw} protocolos`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { 
              stepSize: Math.ceil(Math.max(...valores, 1) / 5) || 1,
              font: { size: 11 }
            }
          },
          x: {
            ticks: { 
              font: { size: 10 },
              maxRotation: 35,
              minRotation: 35
            }
          }
        }
      }
    });
    
    // Gráfico de Doughnut
    const doughnutColors = [
      'rgba(232, 70, 93, 0.9)',
      'rgba(40, 167, 69, 0.9)',
      'rgba(255, 193, 7, 0.9)',
      'rgba(220, 53, 69, 0.9)',
      'rgba(23, 162, 184, 0.9)',
      'rgba(111, 66, 193, 0.9)',
      'rgba(253, 126, 20, 0.9)'
    ];
    
    distribuicaoChartInstance = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: valores,
          backgroundColor: doughnutColors,
          borderWidth: 0,
          hoverOffset: 20,
          cutout: '65%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 10, weight: '600' } }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: function(context) {
                const total = valores.reduce((a, b) => a + b, 0);
                const percent = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${context.raw} (${percent}%)`;
              }
            }
          }
        }
      }
    });
    
    // Adicionar texto central
    const total = valores.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const originalDraw = distribuicaoChartInstance.draw;
      distribuicaoChartInstance.draw = function() {
        originalDraw.apply(this, arguments);
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        ctx.restore();
        const fontSize = (height / 150).toFixed(2);
        ctx.font = `600 ${fontSize * 1.2}rem 'Inter'`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1e293b';
        const text = total;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;
        ctx.fillText(text, textX, textY);
        ctx.save();
      };
      distribuicaoChartInstance.update();
    }
  };
  
  const atualizarTabela = (dados) => {
    const tbody = document.getElementById('tabela-body');
    if (!tbody) return;
    
    if (dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum resultado encontrado</td></tr>';
      return;
    }
    
    let html = '';
    dados.forEach(item => {
      html += `
        <tr>
          <td>${Utils.formatarData(item.data)}</td>
          <td>${item.metricas.planejamento}</td>
          <td>${item.metricas.execucao}</td>
          <td>${item.metricas.remarcacao}</td>
          <td>${item.metricas.cancelamento}</td>
          <td>${item.metricas.tratativasCS}</td>
          <td>${item.metricas.infraestrutura}</td>
          <td>${item.metricas.resolucaoN2}</td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
  };
  
  const exportarResultados = () => {
    if (dadosBusca.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nenhum dado',
        text: 'Realize uma busca primeiro!',
        toast: true,
        timer: 2000
      });
      return;
    }
    
    let csvContent = 'Data,Planejamento,Execução,Remarcação,Cancelamento,Tratativas CS,Infraestrutura,Resolução N2\n';
    
    dadosBusca.forEach(item => {
      csvContent += `${Utils.formatarData(item.data)},${item.metricas.planejamento},${item.metricas.execucao},${item.metricas.remarcacao},${item.metricas.cancelamento},${item.metricas.tratativasCS},${item.metricas.infraestrutura},${item.metricas.resolucaoN2}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${dataInicio}_a_${dataFim}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: 'Exportado!',
      text: 'Arquivo CSV gerado com sucesso',
      toast: true,
      timer: 2000
    });
  };
  
  return (
    <div id="aba-busca" className="aba-conteudo ativo">
      <div className="card">
        <div className="filtros-busca">
          <div className="filtro-item">
            <label>
              <i className="far fa-calendar-alt me-1 text-danger"></i> Data Inicial
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="form-control rounded-4 py-2"
            />
          </div>
          <div className="filtro-item">
            <label>
              <i className="far fa-calendar-alt me-1 text-danger"></i> Data Final
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="form-control rounded-4 py-2"
            />
          </div>
          <div className="btn-item">
            <button onClick={buscarDados} className="btn btn-buscar-premium px-4 py-2" disabled={carregando}>
              <i className="fas fa-search me-2"></i>
              <span>{carregando ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </div>
        </div>
        
        <hr />
        
        {/* Cards de Resumo */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-tasks"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.planejamento}</h3>
              <p>Protocolos Planejamento</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-check-circle"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.execucao}</h3>
              <p>Protocolos Execução</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-exchange-alt"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.remarcacao}</h3>
              <p>Protocolos Remarcação</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-ban"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.cancelamento}</h3>
              <p>Protocolos Cancelamento</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-headset"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.tratativasCS}</h3>
              <p>Protocolos Tratativas CS</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-network-wired"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.infraestrutura}</h3>
              <p>Protocolos Infraestrutura</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-icon"><i className="fas fa-microchip"></i></div>
            <div className="summary-card-info">
              <h3>{metricas.resolucaoN2}</h3>
              <p>Protocolos Resolução N2</p>
            </div>
          </div>
        </div>
        
        <hr />
        
        {/* Gráficos */}
        <div className="charts-container">
          <div className="chart-card">
            <div className="chart-header">
              <i className="fas fa-chart-bar"></i>
              <h4>Métricas por Tipo</h4>
            </div>
            <canvas id="metricasChart" width="400" height="300"></canvas>
          </div>
          <div className="chart-card">
            <div className="chart-header">
              <i className="fas fa-chart-pie"></i>
              <h4>Distribuição Percentual</h4>
            </div>
            <canvas id="distribuicaoChart" width="400" height="300"></canvas>
          </div>
        </div>
        
        <hr />
        
        {/* Tabela de Resultados */}
        <div className="resultados-busca">
          <div className="resultados-header">
            <h5><i className="fas fa-table"></i> Resultados por Data</h5>
            <button onClick={exportarResultados} className="btn-export">
              <i className="fas fa-file-excel"></i> Exportar
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Planejamento</th>
                  <th>Execução</th>
                  <th>Remarcação</th>
                  <th>Cancelamento</th>
                  <th>Tratativas CS</th>
                  <th>Infraestrutura</th>
                  <th>Resolução N2</th>
                </tr>
              </thead>
              <tbody id="tabela-body">
                <tr>
                  <td colSpan="8" className="text-center">Nenhum resultado encontrado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbaBusca;