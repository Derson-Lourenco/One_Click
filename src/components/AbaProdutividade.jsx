// src/components/AbaProdutividade.jsx
/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';
import { Utils } from '../utils/helpers';
import { PlanilhaProcessor } from '../utils/api';
import { TABELA_PESOS, SERVICOS_IGNORADOS } from '../utils/constants';

const AbaProdutividade = () => {
  const [data, setData] = useState('');
  const [regionais, setRegionais] = useState({});
  const [tecnicosPlanilha, setTecnicosPlanilha] = useState([]);
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]);
  const [buscaTermo, setBuscaTermo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [dadosProdutividade, setDadosProdutividade] = useState([]);
  const [metricasAgregadas, setMetricasAgregadas] = useState({
    planejamento: 0,
    execucao: 0,
    remarcacao: 0,
    cancelamento: 0,
    tratativasCS: 0,
    infraestrutura: 0,
    resolucaoN2: 0,
    totalProdutividade: 0,
    totalExecutado: 0
  });
  const [metricasPorRegional, setMetricasPorRegional] = useState({});
  const [filtroRegional, setFiltroRegional] = useState('todas');
  const [dadosPlanilha, setDadosPlanilha] = useState(null);
  const [tecnicoDetalhes, setTecnicoDetalhes] = useState(null);
  const [filtroAcionamento, setFiltroAcionamento] = useState('todos');
  
  // Refs para gráficos
  let barChartInstance = null;
  let pieChartInstance = null;
  let tecnicosChartInstance = null;
  let regionalChartInstance = null;
  
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setData(hoje);
  }, []);
  
  useEffect(() => {
    if (data) {
      carregarTecnicosPorData(data);
    }
    
    return () => {
      if (barChartInstance) barChartInstance?.destroy();
      if (pieChartInstance) pieChartInstance?.destroy();
      if (tecnicosChartInstance) tecnicosChartInstance?.destroy();
      if (regionalChartInstance) regionalChartInstance?.destroy();
    };
  }, [data]);
  
  const carregarTecnicosPorData = async (dataSelecionada) => {
    if (!dataSelecionada) return;
    
    setCarregando(true);
    setTecnicosSelecionados([]);
    setDadosProdutividade([]);
    
    try {
      const resposta = await PlanilhaProcessor.carregarDadosPorData(dataSelecionada);
      
      if (resposta.status === 'not_found' || !resposta.dados || resposta.dados.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Nenhum dado encontrado',
          text: `Nenhuma aba encontrada para ${Utils.formatarDataParaAba(dataSelecionada)}`,
          toast: true,
          timer: 3000
        });
        setRegionais({});
        setCarregando(false);
        return;
      }
      
      setDadosPlanilha(resposta.dados);
      
      let regionaisCarregadas = {};
      if (resposta.regionaisMap && Object.keys(resposta.regionaisMap).length > 0) {
        regionaisCarregadas = resposta.regionaisMap;
      } else {
        regionaisCarregadas = PlanilhaProcessor.extrairTecnicosPorRegional(resposta.dados);
      }
      
      setRegionais(regionaisCarregadas);
      
      const tecnicosList = [];
      for (let regional in regionaisCarregadas) {
        regionaisCarregadas[regional].forEach(tec => {
          tecnicosList.push({ 
            nome: tec, 
            regional,
            cargaHoraria: 'Comercial',
            tipoAcionamento: null
          });
        });
      }
      setTecnicosPlanilha(tecnicosList);
      
      Swal.fire({
        icon: 'success',
        title: 'Dados carregados!',
        text: `Aba "${Utils.formatarDataParaAba(dataSelecionada)}" carregada com sucesso`,
        timer: 2000,
        showConfirmButton: false,
        toast: true
      });
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao carregar dados. Verifique sua conexão.'
      });
    } finally {
      setCarregando(false);
    }
  };
  
  const toggleTecnico = (tecnico) => {
    const index = tecnicosSelecionados.findIndex(t => t.nome === tecnico.nome && t.regional === tecnico.regional);
    if (index === -1) {
      setTecnicosSelecionados([...tecnicosSelecionados, { ...tecnico, tipoAcionamento: null }]);
    } else {
      setTecnicosSelecionados(tecnicosSelecionados.filter((_, i) => i !== index));
    }
  };
  
  const atualizarCargaHoraria = (tecnico, novaCarga) => {
    const index = tecnicosSelecionados.findIndex(t => t.nome === tecnico.nome && t.regional === tecnico.regional);
    if (index !== -1) {
      const novos = [...tecnicosSelecionados];
      novos[index] = { ...novos[index], cargaHoraria: novaCarga };
      setTecnicosSelecionados(novos);
    }
  };
  
  const atualizarTipoAcionamento = (tecnico, novoTipo) => {
    const index = tecnicosSelecionados.findIndex(t => t.nome === tecnico.nome && t.regional === tecnico.regional);
    if (index !== -1) {
      const novos = [...tecnicosSelecionados];
      const novoTipoValue = novoTipo === 'Acionado' ? 'Acionado' : 'Comissão';
      novos[index] = { ...novos[index], tipoAcionamento: novoTipoValue };
      setTecnicosSelecionados(novos);
    }
  };
  
  const selecionarTodosTecnicos = () => {
    const tecnicosComConfig = tecnicosPlanilha.map(tec => ({
      ...tec,
      cargaHoraria: 'Comercial',
      tipoAcionamento: null
    }));
    setTecnicosSelecionados(tecnicosComConfig);
  };
  
  const desmarcarTodosTecnicos = () => {
    setTecnicosSelecionados([]);
  };
  
  const selecionarPorRegional = (regional) => {
    const tecnicosDaRegional = tecnicosPlanilha
      .filter(t => t.regional === regional)
      .map(tec => ({
        ...tec,
        cargaHoraria: 'Comercial',
        tipoAcionamento: null
      }));
    setTecnicosSelecionados(tecnicosDaRegional);
  };
  
  const calcularMeta = (cargaHoraria, tipoAcionamento, produtividade, protocolos) => {
    if (!tipoAcionamento) {
      return {
        produtividadeMin: null,
        protocolosMin: null,
        horario: cargaHoraria === 'Comercial' ? '08:00 às 17:30' : '09:00 às 21:00',
        almoco: '1 hora',
        atingiuProdutividade: null,
        atingiuProtocolos: null,
        status: '⏳ Aguardando configuração'
      };
    }
    
    const metas = {
      Comercial: {
        acionado: { produtividadeMin: 10, protocolosMin: 5, horario: '08:00 às 17:30', almoco: '1 hora' },
        comissao: { produtividadeMin: 8, protocolosMin: 4, horario: '08:00 às 17:30', almoco: '1 hora' }
      },
      '12/36': {
        acionado: { produtividadeMin: 12, protocolosMin: 7, horario: '09:00 às 21:00', almoco: '1 hora' },
        comissao: { produtividadeMin: 10, protocolosMin: 6, horario: '09:00 às 21:00', almoco: '1 hora' }
      }
    };
    
    const tipoKey = tipoAcionamento.toLowerCase() === 'acionado' ? 'acionado' : 'comissao';
    const meta = metas[cargaHoraria]?.[tipoKey] || metas.Comercial.acionado;
    const atingiuProdutividade = produtividade >= meta.produtividadeMin;
    const atingiuProtocolos = protocolos >= meta.protocolosMin;
    
    return {
      ...meta,
      atingiuProdutividade,
      atingiuProtocolos,
      status: atingiuProdutividade && atingiuProtocolos ? 'Meta Atingida' : 'Abaixo da Meta'
    };
  };
  
  const processarProdutividade = async () => {
    if (!data) {
      Swal.fire({ icon: 'warning', title: 'Selecione uma data', text: 'Primeiro selecione a data dos dados!' });
      return;
    }
    
    if (tecnicosSelecionados.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Nenhum técnico selecionado', text: 'Selecione pelo menos um técnico da lista!' });
      return;
    }
    
    if (!dadosPlanilha) {
      await carregarTecnicosPorData(data);
      if (!dadosPlanilha) return;
    }
    
    setCarregando(true);
    
    Swal.fire({
      title: 'Processando...',
      text: `Calculando produtividade para ${tecnicosSelecionados.length} técnico(s)`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    const resultados = [];
    const metricasTotal = {
      planejamento: 0,
      execucao: 0,
      remarcacao: 0,
      cancelamento: 0,
      tratativasCS: 0,
      infraestrutura: 0,
      resolucaoN2: 0,
      totalProdutividade: 0,
      totalExecutado: 0
    };
    
    const metricasPorReg = {};
    
    for (const tecnicoObj of tecnicosSelecionados) {
      const metricas = PlanilhaProcessor.processarDadosTecnicoPorRegional(
        dadosPlanilha,
        tecnicoObj.nome,
        tecnicoObj.regional,
        { TABELA_PESOS, SERVICOS_IGNORADOS, Utils }
      );
      
      const metaInfo = calcularMeta(
        tecnicoObj.cargaHoraria,
        tecnicoObj.tipoAcionamento,
        metricas.produtividade,
        metricas.execucao
      );
      
      resultados.push({
        tecnico: tecnicoObj.nome,
        regional: tecnicoObj.regional,
        cargaHoraria: tecnicoObj.cargaHoraria,
        tipoAcionamento: tecnicoObj.tipoAcionamento,
        ...metricas,
        meta: metaInfo
      });
      
      // Agregar por regional
      if (!metricasPorReg[tecnicoObj.regional]) {
        metricasPorReg[tecnicoObj.regional] = {
          planejamento: 0,
          execucao: 0,
          remarcacao: 0,
          cancelamento: 0,
          tratativasCS: 0,
          infraestrutura: 0,
          resolucaoN2: 0,
          totalProdutividade: 0,
          totalExecutado: 0,
          tecnicos: 0
        };
      }
      
      metricasPorReg[tecnicoObj.regional].planejamento += metricas.planejamento;
      metricasPorReg[tecnicoObj.regional].execucao += metricas.execucao;
      metricasPorReg[tecnicoObj.regional].remarcacao += metricas.remarcacao;
      metricasPorReg[tecnicoObj.regional].cancelamento += metricas.cancelamento;
      metricasPorReg[tecnicoObj.regional].tratativasCS += metricas.tratativasCS;
      metricasPorReg[tecnicoObj.regional].infraestrutura += metricas.infraestrutura;
      metricasPorReg[tecnicoObj.regional].resolucaoN2 += metricas.resolucaoN2;
      metricasPorReg[tecnicoObj.regional].totalProdutividade += metricas.produtividade;
      metricasPorReg[tecnicoObj.regional].totalExecutado += metricas.totalExecutado;
      metricasPorReg[tecnicoObj.regional].tecnicos += 1;
      
      metricasTotal.planejamento += metricas.planejamento;
      metricasTotal.execucao += metricas.execucao;
      metricasTotal.remarcacao += metricas.remarcacao;
      metricasTotal.cancelamento += metricas.cancelamento;
      metricasTotal.tratativasCS += metricas.tratativasCS;
      metricasTotal.infraestrutura += metricas.infraestrutura;
      metricasTotal.resolucaoN2 += metricas.resolucaoN2;
      metricasTotal.totalProdutividade += metricas.produtividade;
      metricasTotal.totalExecutado += metricas.totalExecutado;
    }
    
    setDadosProdutividade(resultados);
    setMetricasAgregadas(metricasTotal);
    setMetricasPorRegional(metricasPorReg);
    
    setTimeout(() => {
      atualizarGraficos(resultados, metricasTotal, metricasPorReg);
    }, 100);
    
    Swal.fire({
      icon: 'success',
      title: 'Processamento concluído!',
      text: `${tecnicosSelecionados.length} técnico(s) processados com sucesso`,
      timer: 3000,
      showConfirmButton: false
    });
    
    setCarregando(false);
  };
  
  const atualizarGraficos = (resultados, metricasTotal, metricasPorReg) => {
    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();
    if (tecnicosChartInstance) tecnicosChartInstance.destroy();
    if (regionalChartInstance) regionalChartInstance.destroy();
    
    const ctxBar = document.getElementById('metricasGeraisChart')?.getContext('2d');
    if (ctxBar) {
      barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: ['Planejamento', 'Execução', 'Remarcação', 'Cancelamento', 'Tratativas CS', 'Infraestrutura', 'Resolução N2'],
          datasets: [{
            label: 'Quantidade de Protocolos',
            data: [
              metricasTotal.planejamento,
              metricasTotal.execucao,
              metricasTotal.remarcacao,
              metricasTotal.cancelamento,
              metricasTotal.tratativasCS,
              metricasTotal.infraestrutura,
              metricasTotal.resolucaoN2
            ],
            backgroundColor: 'rgba(232, 70, 93, 0.8)',
            borderColor: '#E8465D',
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
      });
    }
    
    const ctxPie = document.getElementById('distribuicaoChart')?.getContext('2d');
    if (ctxPie) {
      pieChartInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: ['Planejamento', 'Execução', 'Remarcação', 'Cancelamento', 'Tratativas CS', 'Infraestrutura', 'Resolução N2'],
          datasets: [{
            data: [
              metricasTotal.planejamento,
              metricasTotal.execucao,
              metricasTotal.remarcacao,
              metricasTotal.cancelamento,
              metricasTotal.tratativasCS,
              metricasTotal.infraestrutura,
              metricasTotal.resolucaoN2
            ],
            backgroundColor: ['#E8465D', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14'],
            borderWidth: 0,
            cutout: '65%'
          }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'right' } } }
      });
    }
    
    // Gráfico por Regional
    const regionaisNomes = Object.keys(metricasPorReg);
    const produtividadeRegional = regionaisNomes.map(reg => metricasPorReg[reg].totalProdutividade);
    
    const ctxRegional = document.getElementById('regionalChart')?.getContext('2d');
    if (ctxRegional && regionaisNomes.length > 0) {
      regionalChartInstance = new Chart(ctxRegional, {
        type: 'bar',
        data: {
          labels: regionaisNomes,
          datasets: [{
            label: 'Produtividade por Regional',
            data: produtividadeRegional,
            backgroundColor: 'rgba(74, 99, 130, 0.8)',
            borderColor: '#4a6382',
            borderWidth: 2,
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: { y: { beginAtZero: true, title: { display: true, text: 'Pontos' } } }
        }
      });
    }
    
    const ctxTecnicos = document.getElementById('produtividadeTecnicosChart')?.getContext('2d');
    if (ctxTecnicos && resultados.length > 0) {
      const tecnicosNomes = resultados.map(r => r.tecnico.length > 15 ? r.tecnico.substring(0, 12) + '...' : r.tecnico);
      const produtividades = resultados.map(r => r.produtividade);
      
      tecnicosChartInstance = new Chart(ctxTecnicos, {
        type: 'bar',
        data: {
          labels: tecnicosNomes,
          datasets: [{
            label: 'Produtividade',
            data: produtividades,
            backgroundColor: resultados.map(r => {
              if (!r.tipoAcionamento) return 'rgba(108, 117, 125, 0.8)';
              return r.meta.atingiuProdutividade ? 'rgba(40, 167, 69, 0.8)' : 'rgba(232, 70, 93, 0.8)';
            }),
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: { y: { beginAtZero: true, title: { display: true, text: 'Pontos' } } }
        }
      });
    }
  };
  
  const verDetalhesTecnico = (tecnico) => {
    Swal.fire({
      title: `<i class="fas fa-chart-line" style="color: #E8465D; margin-right: 8px;"></i> Detalhamento - ${tecnico.tecnico}`,
      html: `
        <div style="text-align: left;">
          <!-- Informações Gerais -->
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #E8465D;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-info-circle" style="color: #E8465D; margin-right: 6px;"></i> Informações Gerais
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-map-marker-alt" style="color: #64748b; width: 20px;"></i> <strong>Regional:</strong> ${tecnico.regional}</div>
              <div><i class="fas fa-clock" style="color: #64748b; width: 20px;"></i> <strong>Carga:</strong> ${tecnico.cargaHoraria}</div>
              <div><i class="fas fa-briefcase" style="color: #64748b; width: 20px;"></i> <strong>Tipo:</strong> ${tecnico.tipoAcionamento || 'Não configurado'}</div>
              <div><i class="fas fa-calendar" style="color: #64748b; width: 20px;"></i> <strong>Horário:</strong> ${tecnico.meta.horario}</div>
            </div>
          </div>
          
          <!-- Métricas de Desempenho -->
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #28a745;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-chart-simple" style="color: #28a745; margin-right: 6px;"></i> Métricas de Desempenho
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-check-circle" style="color: #28a745;"></i> <strong>Protocolos Executados:</strong> ${tecnico.execucao}</div>
              <div><i class="fas fa-star" style="color: #ffc107;"></i> <strong>Produtividade:</strong> ${tecnico.produtividade.toFixed(2)} pts</div>
              ${tecnico.tipoAcionamento ? `
                <div><i class="fas fa-bullseye" style="color: #E8465D;"></i> <strong>Meta Produtividade:</strong> ${tecnico.meta.produtividadeMin} pts ${tecnico.meta.atingiuProdutividade ? '<span style="color: #28a745;">✓ Atingida</span>' : '<span style="color: #dc3545;">✗ Abaixo</span>'}</div>
                <div><i class="fas fa-list-check" style="color: #E8465D;"></i> <strong>Meta Protocolos:</strong> ${tecnico.meta.protocolosMin} prot ${tecnico.meta.atingiuProtocolos ? '<span style="color: #28a745;">✓ Atingida</span>' : '<span style="color: #dc3545;">✗ Abaixo</span>'}</div>
                <div><i class="fas fa-flag-checkered" style="color: #E8465D;"></i> <strong>Status:</strong> <span style="color: ${tecnico.meta.atingiuProdutividade && tecnico.meta.atingiuProtocolos ? '#28a745' : '#e67e22'}; font-weight: 600;">${tecnico.meta.status}</span></div>
              ` : '<div><i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> <strong>Status:</strong> Aguardando configuração de tipo de acionamento</div>'}
            </div>
          </div>
          
          <!-- Detalhamento de Protocolos -->
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #17a2b8;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-table-list" style="color: #17a2b8; margin-right: 6px;"></i> Detalhamento de Protocolos
            </h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
              <div><i class="fas fa-tasks" style="color: #E8465D;"></i> Planejamento: ${tecnico.planejamento}</div>
              <div><i class="fas fa-check-circle" style="color: #28a745;"></i> Execução: ${tecnico.execucao}</div>
              <div><i class="fas fa-exchange-alt" style="color: #ffc107;"></i> Remarcação: ${tecnico.remarcacao}</div>
              <div><i class="fas fa-ban" style="color: #dc3545;"></i> Cancelamento: ${tecnico.cancelamento}</div>
              <div><i class="fas fa-headset" style="color: #17a2b8;"></i> Tratativas CS: ${tecnico.tratativasCS}</div>
              <div><i class="fas fa-network-wired" style="color: #6f42c1;"></i> Infraestrutura: ${tecnico.infraestrutura}</div>
              <div><i class="fas fa-microchip" style="color: #fd7e14;"></i> Resolução N2: ${tecnico.resolucaoN2}</div>
            </div>
          </div>
          
          <!-- Serviços Executados -->
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 3px solid #4a6382;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-wrench" style="color: #4a6382; margin-right: 6px;"></i> Serviços Executados
            </h4>
            <div style="max-height: 200px; overflow-y: auto;">
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <th style="text-align: left; padding: 6px 0;">Serviço</th>
                    <th style="text-align: center; padding: 6px 0;">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(tecnico.mapa || {}).slice(0, 20).map(([servico, qtd]) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 0;">${servico}</td>
                      <td style="text-align: center; padding: 6px 0; font-weight: 600;">${qtd}</td>
                    </tr>
                  `).join('')}
                  ${Object.keys(tecnico.mapa || {}).length > 20 ? '<tr><td colspan="2" style="padding: 8px 0; text-align: center; color: #64748b;">... e mais serviços</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
      width: '700px',
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#E8465D',
      showCloseButton: true,
      customClass: {
        title: 'swal2-title-custom',
        htmlContainer: 'swal2-html-custom'
      }
    });
  };
  
  const exportarResultados = () => {
    if (dadosProdutividade.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Nenhum dado', text: 'Processe os técnicos primeiro!', toast: true, timer: 2000 });
      return;
    }
    
    let csvContent = 'Técnico,Regional,Carga Horária,Tipo,Planejamento,Execução,Remarcação,Cancelamento,Tratativas CS,Infraestrutura,Resolução N2,Total Executado,Produtividade,Meta Produtividade,Meta Protocolos,Status\n';
    
    dadosProdutividade.forEach(item => {
      csvContent += `"${item.tecnico}",${item.regional},${item.cargaHoraria},${item.tipoAcionamento || 'Não configurado'},${item.planejamento},${item.execucao},${item.remarcacao},${item.cancelamento},${item.tratativasCS},${item.infraestrutura},${item.resolucaoN2},${item.totalExecutado},${item.produtividade.toFixed(2)},${item.meta.produtividadeMin || '-'},${item.meta.protocolosMin || '-'},${item.meta.status}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `produtividade_${Utils.formatarData(data)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    Swal.fire({ icon: 'success', title: 'Exportado!', text: 'Arquivo CSV gerado com sucesso', toast: true, timer: 2000 });
  };
  
  const dadosFiltrados = dadosProdutividade.filter(item => {
    if (filtroAcionamento === 'todos') return true;
    if (filtroAcionamento === 'acionados') return item.tipoAcionamento === 'Acionado';
    if (filtroAcionamento === 'comissao') return item.tipoAcionamento === 'Comissão';
    return true;
  });
  
  const tecnicosFiltrados = buscaTermo
    ? tecnicosPlanilha.filter(t => t.nome.toLowerCase().includes(buscaTermo.toLowerCase()))
    : tecnicosPlanilha;
  
  const regionaisLista = ['todas', ...Object.keys(regionais)];
  
  const tecnicosSelecionadosAgrupados = {};
  tecnicosSelecionados.forEach(tec => {
    if (!tecnicosSelecionadosAgrupados[tec.regional]) {
      tecnicosSelecionadosAgrupados[tec.regional] = [];
    }
    tecnicosSelecionadosAgrupados[tec.regional].push(tec);
  });
  
  return (
    <div className="aba-conteudo ativo">
      {/* Card de Filtros */}
      <div className="card-produtividade">
        <div className="card-header-produtividade">
          <h3><i className="fas fa-chart-line"></i> Produtividade por Técnico</h3>
          <p className="card-subtitle">Selecione os técnicos e configure carga horária e tipo de acionamento</p>
        </div>
        
        <div className="filtros-row">
          <div className="filtro-group">
            <label><i className="far fa-calendar-alt"></i> Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-moderno" />
          </div>
          <div className="filtro-group">
            <label><i className="fas fa-filter"></i> Filtrar por Regional</label>
            <select value={filtroRegional} onChange={(e) => setFiltroRegional(e.target.value)} className="input-moderno">
              {regionaisLista.map(reg => (
                <option key={reg} value={reg}>{reg === 'todas' ? 'Todas as Regionais' : reg}</option>
              ))}
            </select>
          </div>
          <div className="filtro-group">
            <label><i className="fas fa-search"></i> Buscar Técnico</label>
            <input type="text" placeholder="Digite o nome..." value={buscaTermo} onChange={(e) => setBuscaTermo(e.target.value)} className="input-moderno" />
          </div>
        </div>
        
        <div className="tecnicos-buttons">
          <button onClick={selecionarTodosTecnicos} className="btn-outline-primary">
            <i className="fas fa-check-double"></i> Selecionar Todos
          </button>
          <button onClick={desmarcarTodosTecnicos} className="btn-outline-secondary">
            <i className="fas fa-times"></i> Desmarcar Todos
          </button>
          {regionaisLista.filter(r => r !== 'todas').slice(0, 5).map(reg => (
            <button key={reg} onClick={() => selecionarPorRegional(reg)} className="btn-outline-regional">
              <i className="fas fa-map-marker-alt"></i> {reg}
            </button>
          ))}
        </div>
      </div>
      
      {/* Duas colunas */}
      <div className="tecnicos-duas-colunas">
        <div className="coluna-tecnicos">
          <div className="card-lista">
            <div className="card-header-lista">
              <h4><i className="fas fa-users"></i> Técnicos da Planilha</h4>
              <span className="badge-count">{tecnicosFiltrados.length} técnicos</span>
            </div>
            <div className="tecnicos-lista-scroll">
              {carregando ? (
                <div className="loading-placeholder"><i className="fas fa-spinner fa-pulse"></i> Carregando técnicos...</div>
              ) : tecnicosFiltrados.length === 0 ? (
                <div className="empty-placeholder"><i className="fas fa-search"></i> Nenhum técnico encontrado</div>
              ) : (
                tecnicosFiltrados.map(tec => {
                  const isSelected = tecnicosSelecionados.some(t => t.nome === tec.nome && t.regional === tec.regional);
                  return (
                    <div key={`${tec.nome}-${tec.regional}`} className={`tecnico-item ${isSelected ? 'selected' : ''}`} onClick={() => toggleTecnico(tec)}>
                      <input type="checkbox" checked={isSelected} onChange={() => {}} />
                      <div className="tecnico-info">
                        <span className="tecnico-nome">{tec.nome}</span>
                        <span className="tecnico-regional">{tec.regional}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <div className="coluna-selecionados">
          <div className="card-lista">
            <div className="card-header-lista">
              <h4><i className="fas fa-check-circle"></i> Técnicos Selecionados</h4>
              <span className="badge-count-selected">{tecnicosSelecionados.length} técnicos</span>
            </div>
            <div className="tecnicos-selecionados-scroll">
              {tecnicosSelecionados.length === 0 ? (
                <div className="empty-placeholder-selected"><i className="fas fa-user-plus"></i> Selecione técnicos ao lado</div>
              ) : (
                Object.entries(tecnicosSelecionadosAgrupados).map(([regional, tecnicos]) => (
                  <div key={regional} className="regional-selecionada">
                    <div className="regional-titulo-selecionada">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{regional}</span>
                      <span className="contador">{tecnicos.length}</span>
                    </div>
                    <div className="tecnicos-selecionados-lista">
                      {tecnicos.map(tec => (
                        <div key={tec.nome} className="tecnico-selecionado-item">
                          <div className="tecnico-selecionado-header">
                            <i className="fas fa-user"></i>
                            <span className="tecnico-selecionado-nome">{tec.nome}</span>
                            <button className="btn-remove-tecnico" onClick={() => toggleTecnico(tec)}>
                              <i className="fas fa-times-circle"></i>
                            </button>
                          </div>
                          <div className="tecnico-selecionado-config">
                            <div className="radio-group-horario">
                              <label className={`radio-horario ${tec.cargaHoraria === 'Comercial' ? 'active' : ''}`}>
                                <input type="radio" name={`carga-${tec.nome}`} checked={tec.cargaHoraria === 'Comercial'} 
                                  onChange={() => atualizarCargaHoraria(tec, 'Comercial')} />
                                <span>Comercial<br/><small>08:00-17:30</small></span>
                              </label>
                              <label className={`radio-horario ${tec.cargaHoraria === '12/36' ? 'active' : ''}`}>
                                <input type="radio" name={`carga-${tec.nome}`} checked={tec.cargaHoraria === '12/36'} 
                                  onChange={() => atualizarCargaHoraria(tec, '12/36')} />
                                <span>12/36<br/><small>09:00-21:00</small></span>
                              </label>
                            </div>
                            <div className="radio-group-acionamento">
                              <label className={`radio-acionamento ${tec.tipoAcionamento === 'Acionado' ? 'active' : ''}`}>
                                <input type="radio" name={`acionamento-${tec.nome}`} checked={tec.tipoAcionamento === 'Acionado'} 
                                  onChange={() => atualizarTipoAcionamento(tec, 'Acionado')} />
                                <span>Acionado</span>
                              </label>
                              <label className={`radio-acionamento ${tec.tipoAcionamento === 'Comissão' ? 'active' : ''}`}>
                                <input type="radio" name={`acionamento-${tec.nome}`} checked={tec.tipoAcionamento === 'Comissão'} 
                                  onChange={() => atualizarTipoAcionamento(tec, 'Comissão')} />
                                <span>Comissão</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="card-footer-actions">
              <button onClick={processarProdutividade} className="btn-processar" disabled={carregando || tecnicosSelecionados.length === 0}>
                <i className="fas fa-chart-simple"></i>
                {carregando ? 'Processando...' : 'Processar Produtividade'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resultados */}
      {dadosProdutividade.length > 0 && (
        <>
          <div className="filtro-acionamento-container">
            <label><i className="fas fa-filter"></i> Filtrar por tipo:</label>
            <div className="filtro-acionamento-buttons">
              <button className={`filtro-btn ${filtroAcionamento === 'todos' ? 'active' : ''}`} onClick={() => setFiltroAcionamento('todos')}>
                Todos ({dadosProdutividade.length})
              </button>
              <button className={`filtro-btn ${filtroAcionamento === 'acionados' ? 'active' : ''}`} onClick={() => setFiltroAcionamento('acionados')}>
                <i className="fas fa-bolt"></i> Acionados ({dadosProdutividade.filter(i => i.tipoAcionamento === 'Acionado').length})
              </button>
              <button className={`filtro-btn ${filtroAcionamento === 'comissao' ? 'active' : ''}`} onClick={() => setFiltroAcionamento('comissao')}>
                <i className="fas fa-chart-line"></i> Comissão ({dadosProdutividade.filter(i => i.tipoAcionamento === 'Comissão').length})
              </button>
            </div>
          </div>
          
          <div className="summary-cards-produtividade">
            <div className="summary-card-prod">
              <div className="card-icon-prod" style={{ background: '#E8465D20' }}><i className="fas fa-tasks" style={{ color: '#E8465D' }}></i></div>
              <div className="card-info-prod">
                <h3>{metricasAgregadas.planejamento + metricasAgregadas.execucao + metricasAgregadas.remarcacao + metricasAgregadas.cancelamento + metricasAgregadas.tratativasCS + metricasAgregadas.infraestrutura + metricasAgregadas.resolucaoN2}</h3>
                <p>Total de Protocolos</p>
              </div>
            </div>
            <div className="summary-card-prod">
              <div className="card-icon-prod" style={{ background: '#28a74520' }}><i className="fas fa-check-circle" style={{ color: '#28a745' }}></i></div>
              <div className="card-info-prod"><h3>{metricasAgregadas.execucao}</h3><p>Protocolos Executados</p></div>
            </div>
            <div className="summary-card-prod">
              <div className="card-icon-prod" style={{ background: '#ffc10720' }}><i className="fas fa-chart-line" style={{ color: '#ffc107' }}></i></div>
              <div className="card-info-prod"><h3>{metricasAgregadas.totalProdutividade.toFixed(2)}</h3><p>Produtividade Total</p></div>
            </div>
          </div>
          
          {/* Gráficos */}
          <div className="charts-grid-produtividade">
            <div className="chart-card-prod">
              <div className="chart-header-prod"><i className="fas fa-chart-bar"></i><h4>Métricas por Tipo</h4></div>
              <canvas id="metricasGeraisChart" height="280"></canvas>
            </div>
            <div className="chart-card-prod">
              <div className="chart-header-prod"><i className="fas fa-chart-pie"></i><h4>Distribuição Percentual</h4></div>
              <canvas id="distribuicaoChart" height="280"></canvas>
            </div>
            <div className="chart-card-prod">
              <div className="chart-header-prod"><i className="fas fa-chart-bar"></i><h4>Produtividade por Regional</h4></div>
              <canvas id="regionalChart" height="280"></canvas>
            </div>
            <div className="chart-card-prod chart-full-width">
              <div className="chart-header-prod"><i className="fas fa-trophy"></i><h4>Produtividade por Técnico</h4></div>
              <canvas id="produtividadeTecnicosChart" height="300"></canvas>
            </div>
          </div>
          
          {/* Tabela de Resultados */}
          <div className="tabela-resultados-prod">
            <div className="tabela-header">
              <h4><i className="fas fa-table"></i> Detalhamento por Técnico</h4>
              <button onClick={exportarResultados} className="btn-exportar"><i className="fas fa-file-excel"></i> Exportar CSV</button>
            </div>
            <div className="table-responsive">
              <table className="data-table-prod">
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>Regional</th>
                    <th>Carga</th>
                    <th>Tipo</th>
                    <th>Planej.</th>
                    <th>Exec.</th>
                    <th>Remarc.</th>
                    <th>Cancel.</th>
                    <th>Produtiv.</th>
                    <th>Meta</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, idx) => (
                    <tr key={idx} className={item.tipoAcionamento && !item.meta.atingiuProdutividade && !item.meta.atingiuProtocolos ? 'meta-abaixo' : ''}>
                      <td><strong>{item.tecnico}</strong></td>
                      <td>{item.regional}</td>
                      <td><span className={`badge-carga ${item.cargaHoraria === 'Comercial' ? 'badge-comercial' : 'badge-1236'}`}>{item.cargaHoraria}</span></td>
                      <td>
                        {item.tipoAcionamento ? (
                          <span className={`badge-tipo ${item.tipoAcionamento === 'Acionado' ? 'badge-acionado' : 'badge-comissao'}`}>{item.tipoAcionamento}</span>
                        ) : (
                          <span className="badge-nao-config">Não config.</span>
                        )}
                      </td>
                      <td>{item.planejamento}</td>
                      <td><strong>{item.execucao}</strong></td>
                      <td>{item.remarcacao}</td>
                      <td>{item.cancelamento}</td>
                      <td className="produtividade-destaque">{item.produtividade.toFixed(2)}</td>
                      <td><small>{item.meta.produtividadeMin ? `${item.meta.produtividadeMin}pts / ${item.meta.protocolosMin}prot` : '-'}</small></td>
                      <td>
                        <span className={`status-badge ${item.tipoAcionamento ? (item.meta.atingiuProdutividade && item.meta.atingiuProtocolos ? 'status-success' : 'status-warning') : 'status-pending'}`}>
                          {item.meta.status}
                        </span>
                      </td>
                      <td><button className="btn-detalhes" onClick={() => verDetalhesTecnico(item)}><i className="fas fa-eye"></i> Detalhes</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan="4"><strong>TOTAIS</strong></td>
                    <td><strong>{metricasAgregadas.planejamento}</strong></td>
                    <td><strong>{metricasAgregadas.execucao}</strong></td>
                    <td><strong>{metricasAgregadas.remarcacao}</strong></td>
                    <td><strong>{metricasAgregadas.cancelamento}</strong></td>
                    <td className="produtividade-destaque"><strong>{metricasAgregadas.totalProdutividade.toFixed(2)}</strong></td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AbaProdutividade;