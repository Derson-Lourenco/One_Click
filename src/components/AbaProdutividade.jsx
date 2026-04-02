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
  
  // Estados para métricas
  const [metricasAgregadas, setMetricasAgregadas] = useState({
    planejamento: 0, execucao: 0, remarcacao: 0, cancelamento: 0,
    tratativasCS: 0, infraestrutura: 0, resolucaoN2: 0,
    totalProdutividade: 0, totalExecutado: 0,
    acionamentoPlanejamento: 0, acionamentoExecucao: 0, acionamentoRemarcacao: 0, acionamentoCancelamento: 0,
    acionamentoTratativasCS: 0, acionamentoInfraestrutura: 0, acionamentoResolucaoN2: 0,
    acionamentoTotalProdutividade: 0, acionamentoTotalExecutado: 0,
    normalPlanejamento: 0, normalExecucao: 0, normalRemarcacao: 0, normalCancelamento: 0,
    normalTratativasCS: 0, normalInfraestrutura: 0, normalResolucaoN2: 0,
    normalTotalProdutividade: 0, normalTotalExecutado: 0
  });
  
  const [metricasPorRegional, setMetricasPorRegional] = useState({});
  const [filtroRegional, setFiltroRegional] = useState('todas');
  const [dadosPlanilha, setDadosPlanilha] = useState(null);
  const [filtroTipoTecnico, setFiltroTipoTecnico] = useState('todos'); // Filtro por tipo do técnico
  const [filtroTipoProtocolo, setFiltroTipoProtocolo] = useState('todos');
  
  // Refs para os canvases
  const metricasChartRef = useRef(null);
  const distribuicaoChartRef = useRef(null);
  const regionalChartRef = useRef(null);
  const tecnicosChartRef = useRef(null);
  
  // Refs para as instâncias dos gráficos
  const chartInstances = useRef({
    metricas: null,
    distribuicao: null,
    regional: null,
    tecnicos: null
  });
  
  // Tipos de regime do técnico
  const TIPOS_TECNICO = ['12/36', 'Comercial', 'Acionamento', 'Ação de Ativação'];
  
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setData(hoje);
  }, []);
  
  useEffect(() => {
    if (data) {
      carregarTecnicosPorData(data);
    }
    
    return () => {
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) {
          chart.destroy();
        }
      });
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
            tipoTecnico: null // Agora é o tipo do técnico (12/36, Comercial, Acionamento, Ação de Ativação)
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
      setTecnicosSelecionados([...tecnicosSelecionados, { ...tecnico, tipoTecnico: null }]);
    } else {
      setTecnicosSelecionados(tecnicosSelecionados.filter((_, i) => i !== index));
    }
  };
  
  const atualizarTipoTecnico = (tecnico, novoTipo) => {
    const index = tecnicosSelecionados.findIndex(t => t.nome === tecnico.nome && t.regional === tecnico.regional);
    if (index !== -1) {
      const novos = [...tecnicosSelecionados];
      novos[index] = { ...novos[index], tipoTecnico: novoTipo };
      setTecnicosSelecionados(novos);
    }
  };
  
  const selecionarTodosTecnicos = () => {
    const tecnicosComConfig = tecnicosPlanilha.map(tec => ({
      ...tec,
      tipoTecnico: null
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
        tipoTecnico: null
      }));
    setTecnicosSelecionados(tecnicosDaRegional);
  };
  
  const configurarPadraoParaSelecionados = (tipoPadrao) => {
    if (tecnicosSelecionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Nenhum técnico selecionado',
        text: 'Selecione os técnicos primeiro!',
        toast: true,
        timer: 2000
      });
      return;
    }
    
    const novosSelecionados = tecnicosSelecionados.map(tec => ({
      ...tec,
      tipoTecnico: tipoPadrao
    }));
    setTecnicosSelecionados(novosSelecionados);
    
    Swal.fire({
      icon: 'success',
      title: 'Configurado!',
      text: `Todos os ${tecnicosSelecionados.length} técnicos configurados como: ${tipoPadrao}`,
      toast: true,
      timer: 2000
    });
  };
  
  const calcularMeta = (tipoTecnico, produtividade, protocolos) => {
    if (!tipoTecnico) {
      return {
        produtividadeMin: null,
        protocolosMin: null,
        horario: null,
        atingiuProdutividade: null,
        atingiuProtocolos: null,
        status: 'Aguardando configuração'
      };
    }
    
    // Metas por tipo de técnico
    const metas = {
      'Comercial': { produtividadeMin: 10, protocolosMin: 5, horario: '08:00 às 17:30' },
      '12/36': { produtividadeMin: 12, protocolosMin: 7, horario: '09:00 às 21:00' },
      'Acionamento': { produtividadeMin: 8, protocolosMin: 4, horario: 'Plantão' },
      'Ação de Ativação': { produtividadeMin: 8, protocolosMin: 4, horario: 'Plantão' }
    };
    
    const meta = metas[tipoTecnico] || metas.Comercial;
    const atingiuProdutividade = produtividade >= meta.produtividadeMin;
    const atingiuProtocolos = protocolos >= meta.protocolosMin;
    
    let status = '';
    if (atingiuProdutividade && atingiuProtocolos) {
      status = '✓ Meta Atingida';
    } else if (!atingiuProdutividade && !atingiuProtocolos) {
      status = '✗ Abaixo das duas metas';
    } else if (!atingiuProdutividade) {
      status = '⚠ Abaixo da meta de produtividade';
    } else {
      status = '⚠ Abaixo da meta de protocolos';
    }
    
    return {
      ...meta,
      atingiuProdutividade,
      atingiuProtocolos,
      status
    };
  };
  
  const destruirTodosGraficos = () => {
    Object.keys(chartInstances.current).forEach(key => {
      if (chartInstances.current[key]) {
        try {
          chartInstances.current[key].destroy();
        } catch (e) {
          console.warn(`Erro ao destruir gráfico ${key}:`, e);
        }
        chartInstances.current[key] = null;
      }
    });
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
      planejamento: 0, execucao: 0, remarcacao: 0, cancelamento: 0,
      tratativasCS: 0, infraestrutura: 0, resolucaoN2: 0,
      totalProdutividade: 0, totalExecutado: 0,
      acionamentoPlanejamento: 0, acionamentoExecucao: 0, acionamentoRemarcacao: 0, acionamentoCancelamento: 0,
      acionamentoTratativasCS: 0, acionamentoInfraestrutura: 0, acionamentoResolucaoN2: 0,
      acionamentoTotalProdutividade: 0, acionamentoTotalExecutado: 0,
      normalPlanejamento: 0, normalExecucao: 0, normalRemarcacao: 0, normalCancelamento: 0,
      normalTratativasCS: 0, normalInfraestrutura: 0, normalResolucaoN2: 0,
      normalTotalProdutividade: 0, normalTotalExecutado: 0
    };
    
    const metricasPorReg = {};
    
    for (const tecnicoObj of tecnicosSelecionados) {
      const metricas = PlanilhaProcessor.processarDadosTecnicoComTipos(
        dadosPlanilha,
        tecnicoObj.nome,
        tecnicoObj.regional,
        { TABELA_PESOS, SERVICOS_IGNORADOS, Utils }
      );
      
      const metaInfo = calcularMeta(
        tecnicoObj.tipoTecnico,
        metricas.produtividade,
        metricas.execucao
      );
      
      resultados.push({
        tecnico: tecnicoObj.nome,
        regional: tecnicoObj.regional,
        tipoTecnico: tecnicoObj.tipoTecnico,
        ...metricas,
        meta: metaInfo
      });
      
      if (!metricasPorReg[tecnicoObj.regional]) {
        metricasPorReg[tecnicoObj.regional] = {
          planejamento: 0, execucao: 0, remarcacao: 0, cancelamento: 0,
          tratativasCS: 0, infraestrutura: 0, resolucaoN2: 0,
          totalProdutividade: 0, totalExecutado: 0, tecnicos: 0,
          acionamentoPlanejamento: 0, acionamentoExecucao: 0, acionamentoRemarcacao: 0, acionamentoCancelamento: 0,
          acionamentoTratativasCS: 0, acionamentoInfraestrutura: 0, acionamentoResolucaoN2: 0,
          acionamentoTotalProdutividade: 0, acionamentoTotalExecutado: 0,
          normalPlanejamento: 0, normalExecucao: 0, normalRemarcacao: 0, normalCancelamento: 0,
          normalTratativasCS: 0, normalInfraestrutura: 0, normalResolucaoN2: 0,
          normalTotalProdutividade: 0, normalTotalExecutado: 0
        };
      }
      
      // Acumular totais
      metricasTotal.planejamento += metricas.planejamento;
      metricasTotal.execucao += metricas.execucao;
      metricasTotal.remarcacao += metricas.remarcacao;
      metricasTotal.cancelamento += metricas.cancelamento;
      metricasTotal.tratativasCS += metricas.tratativasCS;
      metricasTotal.infraestrutura += metricas.infraestrutura;
      metricasTotal.resolucaoN2 += metricas.resolucaoN2;
      metricasTotal.totalProdutividade += metricas.produtividade;
      metricasTotal.totalExecutado += metricas.totalExecutado;
      
      metricasTotal.acionamentoPlanejamento += metricas.acionamentoPlanejamento || 0;
      metricasTotal.acionamentoExecucao += metricas.acionamentoExecucao || 0;
      metricasTotal.acionamentoRemarcacao += metricas.acionamentoRemarcacao || 0;
      metricasTotal.acionamentoCancelamento += metricas.acionamentoCancelamento || 0;
      metricasTotal.acionamentoTratativasCS += metricas.acionamentoTratativasCS || 0;
      metricasTotal.acionamentoInfraestrutura += metricas.acionamentoInfraestrutura || 0;
      metricasTotal.acionamentoResolucaoN2 += metricas.acionamentoResolucaoN2 || 0;
      metricasTotal.acionamentoTotalProdutividade += metricas.acionamentoProdutividade || 0;
      metricasTotal.acionamentoTotalExecutado += metricas.acionamentoTotalExecutado || 0;
      
      metricasTotal.normalPlanejamento += metricas.normalPlanejamento || 0;
      metricasTotal.normalExecucao += metricas.normalExecucao || 0;
      metricasTotal.normalRemarcacao += metricas.normalRemarcacao || 0;
      metricasTotal.normalCancelamento += metricas.normalCancelamento || 0;
      metricasTotal.normalTratativasCS += metricas.normalTratativasCS || 0;
      metricasTotal.normalInfraestrutura += metricas.normalInfraestrutura || 0;
      metricasTotal.normalResolucaoN2 += metricas.normalResolucaoN2 || 0;
      metricasTotal.normalTotalProdutividade += metricas.normalProdutividade || 0;
      metricasTotal.normalTotalExecutado += metricas.normalTotalExecutado || 0;
      
      // Acumular por regional
      const reg = metricasPorReg[tecnicoObj.regional];
      reg.planejamento += metricas.planejamento;
      reg.execucao += metricas.execucao;
      reg.remarcacao += metricas.remarcacao;
      reg.cancelamento += metricas.cancelamento;
      reg.tratativasCS += metricas.tratativasCS;
      reg.infraestrutura += metricas.infraestrutura;
      reg.resolucaoN2 += metricas.resolucaoN2;
      reg.totalProdutividade += metricas.produtividade;
      reg.totalExecutado += metricas.totalExecutado;
      reg.tecnicos += 1;
      
      reg.acionamentoPlanejamento += metricas.acionamentoPlanejamento || 0;
      reg.acionamentoExecucao += metricas.acionamentoExecucao || 0;
      reg.acionamentoRemarcacao += metricas.acionamentoRemarcacao || 0;
      reg.acionamentoCancelamento += metricas.acionamentoCancelamento || 0;
      reg.acionamentoTratativasCS += metricas.acionamentoTratativasCS || 0;
      reg.acionamentoInfraestrutura += metricas.acionamentoInfraestrutura || 0;
      reg.acionamentoResolucaoN2 += metricas.acionamentoResolucaoN2 || 0;
      reg.acionamentoTotalProdutividade += metricas.acionamentoProdutividade || 0;
      reg.acionamentoTotalExecutado += metricas.acionamentoTotalExecutado || 0;
      
      reg.normalPlanejamento += metricas.normalPlanejamento || 0;
      reg.normalExecucao += metricas.normalExecucao || 0;
      reg.normalRemarcacao += metricas.normalRemarcacao || 0;
      reg.normalCancelamento += metricas.normalCancelamento || 0;
      reg.normalTratativasCS += metricas.normalTratativasCS || 0;
      reg.normalInfraestrutura += metricas.normalInfraestrutura || 0;
      reg.normalResolucaoN2 += metricas.normalResolucaoN2 || 0;
      reg.normalTotalProdutividade += metricas.normalProdutividade || 0;
      reg.normalTotalExecutado += metricas.normalTotalExecutado || 0;
    }
    
    setDadosProdutividade(resultados);
    setMetricasAgregadas(metricasTotal);
    setMetricasPorRegional(metricasPorReg);
    
    setTimeout(() => {
      atualizarGraficos(resultados, metricasTotal, metricasPorReg);
    }, 150);
    
    Swal.fire({
      icon: 'success',
      title: 'Processamento concluído!',
      text: `${tecnicosSelecionados.length} técnico(s) processados com sucesso`,
      timer: 3000,
      showConfirmButton: false
    });
    
    setCarregando(false);
  };
  
  const getMetricasFiltradas = () => {
    if (filtroTipoProtocolo === 'normal') {
      return {
        planejamento: metricasAgregadas.normalPlanejamento,
        execucao: metricasAgregadas.normalExecucao,
        remarcacao: metricasAgregadas.normalRemarcacao,
        cancelamento: metricasAgregadas.normalCancelamento,
        tratativasCS: metricasAgregadas.normalTratativasCS,
        infraestrutura: metricasAgregadas.normalInfraestrutura,
        resolucaoN2: metricasAgregadas.normalResolucaoN2,
        totalProdutividade: metricasAgregadas.normalTotalProdutividade,
        totalExecutado: metricasAgregadas.normalTotalExecutado
      };
    } else if (filtroTipoProtocolo === 'acionamento') {
      return {
        planejamento: metricasAgregadas.acionamentoPlanejamento,
        execucao: metricasAgregadas.acionamentoExecucao,
        remarcacao: metricasAgregadas.acionamentoRemarcacao,
        cancelamento: metricasAgregadas.acionamentoCancelamento,
        tratativasCS: metricasAgregadas.acionamentoTratativasCS,
        infraestrutura: metricasAgregadas.acionamentoInfraestrutura,
        resolucaoN2: metricasAgregadas.acionamentoResolucaoN2,
        totalProdutividade: metricasAgregadas.acionamentoTotalProdutividade,
        totalExecutado: metricasAgregadas.acionamentoTotalExecutado
      };
    }
    return {
      planejamento: metricasAgregadas.planejamento,
      execucao: metricasAgregadas.execucao,
      remarcacao: metricasAgregadas.remarcacao,
      cancelamento: metricasAgregadas.cancelamento,
      tratativasCS: metricasAgregadas.tratativasCS,
      infraestrutura: metricasAgregadas.infraestrutura,
      resolucaoN2: metricasAgregadas.resolucaoN2,
      totalProdutividade: metricasAgregadas.totalProdutividade,
      totalExecutado: metricasAgregadas.totalExecutado
    };
  };
  
  const atualizarGraficos = (resultados, metricasTotal, metricasPorReg) => {
    destruirTodosGraficos();
    
    const metricasFiltradas = getMetricasFiltradas();
    
    setTimeout(() => {
      // Gráfico de Barras - Métricas Gerais
      if (metricasChartRef.current) {
        const ctx = metricasChartRef.current.getContext('2d');
        chartInstances.current.metricas = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Planejamento', 'Execução', 'Remarcação', 'Cancelamento', 'Tratativas CS', 'Infraestrutura', 'Resolução N2'],
            datasets: [{
              label: 'Quantidade de Protocolos',
              data: [
                metricasFiltradas.planejamento,
                metricasFiltradas.execucao,
                metricasFiltradas.remarcacao,
                metricasFiltradas.cancelamento,
                metricasFiltradas.tratativasCS,
                metricasFiltradas.infraestrutura,
                metricasFiltradas.resolucaoN2
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
      
      // Gráfico de Doughnut - Distribuição
      if (distribuicaoChartRef.current && metricasFiltradas.execucao > 0) {
        const ctx = distribuicaoChartRef.current.getContext('2d');
        const dadosDistribuicao = [
          metricasFiltradas.planejamento,
          metricasFiltradas.execucao,
          metricasFiltradas.remarcacao,
          metricasFiltradas.cancelamento,
          metricasFiltradas.tratativasCS,
          metricasFiltradas.infraestrutura,
          metricasFiltradas.resolucaoN2
        ];
        
        chartInstances.current.distribuicao = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Planejamento', 'Execução', 'Remarcação', 'Cancelamento', 'Tratativas CS', 'Infraestrutura', 'Resolução N2'],
            datasets: [{
              data: dadosDistribuicao,
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
      let produtividadeRegional = [];
      
      if (filtroTipoProtocolo === 'normal') {
        produtividadeRegional = regionaisNomes.map(reg => metricasPorReg[reg]?.normalTotalProdutividade || 0);
      } else if (filtroTipoProtocolo === 'acionamento') {
        produtividadeRegional = regionaisNomes.map(reg => metricasPorReg[reg]?.acionamentoTotalProdutividade || 0);
      } else {
        produtividadeRegional = regionaisNomes.map(reg => metricasPorReg[reg]?.totalProdutividade || 0);
      }
      
      if (regionalChartRef.current && regionaisNomes.length > 0) {
        const ctx = regionalChartRef.current.getContext('2d');
        chartInstances.current.regional = new Chart(ctx, {
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
      
      // Gráfico por Técnico
      if (tecnicosChartRef.current && resultados.length > 0) {
        const ctx = tecnicosChartRef.current.getContext('2d');
        let produtividades = [];
        
        if (filtroTipoProtocolo === 'normal') {
          produtividades = resultados.map(r => r.normalProdutividade || 0);
        } else if (filtroTipoProtocolo === 'acionamento') {
          produtividades = resultados.map(r => r.acionamentoProdutividade || 0);
        } else {
          produtividades = resultados.map(r => r.produtividade);
        }
        
        const tecnicosNomes = resultados.map(r => r.tecnico.length > 15 ? r.tecnico.substring(0, 12) + '...' : r.tecnico);
        
        chartInstances.current.tecnicos = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: tecnicosNomes,
            datasets: [{
              label: 'Produtividade',
              data: produtividades,
              backgroundColor: resultados.map(r => {
                if (!r.tipoTecnico) return 'rgba(108, 117, 125, 0.8)';
                return r.meta.atingiuProdutividade ? 'rgba(40, 167, 69, 0.8)' : 'rgba(232, 70, 93, 0.8)';
              }),
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Pontos' } } },
            plugins: {
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.raw.toFixed(2)} pontos`
                }
              }
            }
          }
        });
      }
    }, 50);
  };
  
  const verDetalhesTecnico = (tecnico) => {
    Swal.fire({
      title: `<i class="fas fa-chart-line" style="color: #E8465D; margin-right: 8px;"></i> Detalhamento - ${tecnico.tecnico}`,
      html: `
        <div style="text-align: left;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #E8465D;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-info-circle" style="color: #E8465D; margin-right: 6px;"></i> Informações Gerais
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-map-marker-alt" style="color: #64748b;"></i> <strong>Regional:</strong> ${tecnico.regional}</div>
              <div><i class="fas fa-briefcase" style="color: #64748b;"></i> <strong>Tipo:</strong> ${tecnico.tipoTecnico || 'Não configurado'}</div>
              <div><i class="fas fa-clock" style="color: #64748b;"></i> <strong>Horário:</strong> ${tecnico.meta.horario || 'Não definido'}</div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #28a745;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-chart-simple" style="color: #28a745; margin-right: 6px;"></i> Métricas de Desempenho
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-check-circle" style="color: #28a745;"></i> <strong>Protocolos Executados:</strong> ${tecnico.execucao}</div>
              <div><i class="fas fa-star" style="color: #ffc107;"></i> <strong>Produtividade:</strong> ${tecnico.produtividade.toFixed(2)} pts</div>
              ${tecnico.tipoTecnico ? `
                <div><i class="fas fa-bullseye" style="color: #E8465D;"></i> <strong>Meta Produtividade:</strong> ${tecnico.meta.produtividadeMin} pts ${tecnico.meta.atingiuProdutividade ? '<span style="color: #28a745;">✓ Atingida</span>' : '<span style="color: #dc3545;">✗ Abaixo</span>'}</div>
                <div><i class="fas fa-list-check" style="color: #E8465D;"></i> <strong>Meta Protocolos:</strong> ${tecnico.meta.protocolosMin} prot ${tecnico.meta.atingiuProtocolos ? '<span style="color: #28a745;">✓ Atingida</span>' : '<span style="color: #dc3545;">✗ Abaixo</span>'}</div>
                <div><i class="fas fa-flag-checkered" style="color: #E8465D;"></i> <strong>Status:</strong> <span style="color: ${tecnico.meta.atingiuProdutividade && tecnico.meta.atingiuProtocolos ? '#28a745' : '#e67e22'}; font-weight: 600;">${tecnico.meta.status}</span></div>
              ` : '<div><i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i> <strong>Status:</strong> Aguardando configuração do tipo de técnico</div>'}
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 3px solid #4a6382;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #4a6382;"><i class="fas fa-chart-line"></i> Protocolos NORMAL</h5>
              <div><small>Execução:</small> <strong>${tecnico.normalExecucao || 0}</strong></div>
              <div><small>Produtividade:</small> <strong>${(tecnico.normalProdutividade || 0).toFixed(2)} pts</strong></div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 3px solid #E8465D;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #E8465D;"><i class="fas fa-bolt"></i> Acionamento/Ação de Ativação</h5>
              <div><small>Execução:</small> <strong>${tecnico.acionamentoExecucao || 0}</strong></div>
              <div><small>Produtividade:</small> <strong>${(tecnico.acionamentoProdutividade || 0).toFixed(2)} pts</strong></div>
            </div>
          </div>
        </div>
      `,
      width: '700px',
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#E8465D',
      showCloseButton: true
    });
  };
  
  const exportarResultados = () => {
    if (dadosProdutividade.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Nenhum dado', text: 'Processe os técnicos primeiro!', toast: true, timer: 2000 });
      return;
    }
    
    let csvContent = 'Técnico,Regional,Tipo,Planejamento,Execução,Remarcação,Cancelamento,Tratativas CS,Infraestrutura,Resolução N2,Total Executado,Produtividade,Meta Produtividade,Meta Protocolos,Status,Execução NORMAL,Produtividade NORMAL,Execução ACIONAMENTO,Produtividade ACIONAMENTO\n';
    
    dadosProdutividade.forEach(item => {
      csvContent += `"${item.tecnico}",${item.regional},${item.tipoTecnico || 'Não configurado'},${item.planejamento},${item.execucao},${item.remarcacao},${item.cancelamento},${item.tratativasCS},${item.infraestrutura},${item.resolucaoN2},${item.totalExecutado},${item.produtividade.toFixed(2)},${item.meta.produtividadeMin || '-'},${item.meta.protocolosMin || '-'},${item.meta.status},${item.normalExecucao || 0},${(item.normalProdutividade || 0).toFixed(2)},${item.acionamentoExecucao || 0},${(item.acionamentoProdutividade || 0).toFixed(2)}\n`;
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
    if (filtroTipoTecnico === 'todos') return true;
    return item.tipoTecnico === filtroTipoTecnico;
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
  
  const metricasFiltradas = getMetricasFiltradas();
  const totalProtocolos = metricasFiltradas.planejamento + metricasFiltradas.execucao + metricasFiltradas.remarcacao + 
                          metricasFiltradas.cancelamento + metricasFiltradas.tratativasCS + 
                          metricasFiltradas.infraestrutura + metricasFiltradas.resolucaoN2;
  
  return (
    <div className="aba-conteudo ativo">
      {/* Card de Filtros */}
      <div className="card-produtividade">
        <div className="card-header-produtividade">
          <h3><i className="fas fa-chart-line"></i> Produtividade por Técnico</h3>
          <p className="card-subtitle">Selecione os técnicos e configure o tipo (12/36, Comercial, Acionamento ou Ação de Ativação)</p>
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
                            <div className="radio-group-tipo-tecnico">
                              {TIPOS_TECNICO.map(tipo => (
                                <label 
                                  key={tipo}
                                  className={`radio-tipo ${tec.tipoTecnico === tipo ? 'active' : ''}`}
                                  onClick={() => atualizarTipoTecnico(tec, tipo)}
                                >
                                  <input 
                                    type="radio" 
                                    name={`tipo-${tec.nome}`} 
                                    checked={tec.tipoTecnico === tipo}
                                    onChange={() => {}}
                                  />
                                  <span>{tipo}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="card-footer-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => configurarPadraoParaSelecionados('12/36')} 
                className="btn-outline-primary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-clock"></i> Configurar como 12/36
              </button>
              <button 
                onClick={() => configurarPadraoParaSelecionados('Comercial')} 
                className="btn-outline-primary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-briefcase"></i> Configurar como Comercial
              </button>
              <button 
                onClick={() => configurarPadraoParaSelecionados('Acionamento')} 
                className="btn-outline-secondary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-bolt"></i> Configurar como Acionamento
              </button>
              <button 
                onClick={() => configurarPadraoParaSelecionados('Ação de Ativação')} 
                className="btn-outline-secondary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-play-circle"></i> Configurar como Ação de Ativação
              </button>
            </div>
            <div className="card-footer-actions" style={{ marginTop: '0.5rem' }}>
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
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className="filtro-acionamento-container" style={{ flex: 1 }}>
              <label><i className="fas fa-filter"></i> Filtrar por tipo de técnico:</label>
              <div className="filtro-acionamento-buttons">
                <button className={`filtro-btn ${filtroTipoTecnico === 'todos' ? 'active' : ''}`} onClick={() => setFiltroTipoTecnico('todos')}>
                  Todos ({dadosProdutividade.length})
                </button>
                {TIPOS_TECNICO.map(tipo => (
                  <button 
                    key={tipo}
                    className={`filtro-btn ${filtroTipoTecnico === tipo ? 'active' : ''}`} 
                    onClick={() => setFiltroTipoTecnico(tipo)}
                  >
                    {tipo} ({dadosProdutividade.filter(i => i.tipoTecnico === tipo).length})
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ background: 'white', borderRadius: '16px', padding: '1rem', flex: 1 }}>
              <label><i className="fas fa-tasks"></i> Filtrar por tipo de protocolo:</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  className={`filtro-btn ${filtroTipoProtocolo === 'todos' ? 'active' : ''}`}
                  onClick={() => {
                    setFiltroTipoProtocolo('todos');
                    setTimeout(() => atualizarGraficos(dadosProdutividade, metricasAgregadas, metricasPorRegional), 100);
                  }}
                >
                  Todos os protocolos
                </button>
                <button 
                  className={`filtro-btn ${filtroTipoProtocolo === 'normal' ? 'active' : ''}`}
                  onClick={() => {
                    setFiltroTipoProtocolo('normal');
                    setTimeout(() => atualizarGraficos(dadosProdutividade, metricasAgregadas, metricasPorRegional), 100);
                  }}
                >
                  <i className="fas fa-chart-line"></i> Protocolos NORMAL
                </button>
                <button 
                  className={`filtro-btn ${filtroTipoProtocolo === 'acionamento' ? 'active' : ''}`}
                  onClick={() => {
                    setFiltroTipoProtocolo('acionamento');
                    setTimeout(() => atualizarGraficos(dadosProdutividade, metricasAgregadas, metricasPorRegional), 100);
                  }}
                >
                  <i className="fas fa-bolt"></i> Acionamento/Ação de Ativação
                </button>
              </div>
            </div>
          </div>
          
          <div className="summary-cards-produtividade">
            <div className="summary-card-prod">
              <div className="card-icon-prod" style={{ background: '#E8465D20' }}><i className="fas fa-tasks" style={{ color: '#E8465D' }}></i></div>
              <div className="card-info-prod">
                <h3>{totalProtocolos}</h3>
                <p>Total de Protocolos</p>
              </div>
            </div>
            <div className="summary-card-prod">
              <div className="card-icon-prod" style={{ background: '#28a74520' }}><i className="fas fa-check-circle" style={{ color: '#28a745' }}></i></div>
              <div className="card-info-prod"><h3>{metricasFiltradas.execucao}</h3><p>Protocolos Executados</p></div>
            </div>
            <div className="summary-card-prod">
              <div className="card-icon-prod" style={{ background: '#ffc10720' }}><i className="fas fa-chart-line" style={{ color: '#ffc107' }}></i></div>
              <div className="card-info-prod"><h3>{metricasFiltradas.totalProdutividade.toFixed(2)}</h3><p>Produtividade Total</p></div>
            </div>
          </div>
          
          {/* Gráficos */}
          <div className="charts-grid-produtividade">
            <div className="chart-card-prod">
              <div className="chart-header-prod"><i className="fas fa-chart-bar"></i><h4>Métricas por Tipo</h4></div>
              <canvas ref={metricasChartRef} id="metricasGeraisChart" height="280"></canvas>
            </div>
            <div className="chart-card-prod">
              <div className="chart-header-prod"><i className="fas fa-chart-pie"></i><h4>Distribuição Percentual</h4></div>
              <canvas ref={distribuicaoChartRef} id="distribuicaoChart" height="280"></canvas>
            </div>
            <div className="chart-card-prod">
              <div className="chart-header-prod"><i className="fas fa-chart-bar"></i><h4>Produtividade por Regional</h4></div>
              <canvas ref={regionalChartRef} id="regionalChart" height="280"></canvas>
            </div>
            <div className="chart-card-prod chart-full-width">
              <div className="chart-header-prod"><i className="fas fa-trophy"></i><h4>Produtividade por Técnico</h4></div>
              <canvas ref={tecnicosChartRef} id="produtividadeTecnicosChart" height="300"></canvas>
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
                    <th>Tipo</th>
                    <th>Planej.</th>
                    <th>Exec.</th>
                    <th>Remarc.</th>
                    <th>Cancel.</th>
                    <th>Produtiv.</th>
                    <th>Exec NORMAL</th>
                    <th>Exec ACION.</th>
                    <th>Meta</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, idx) => {
                    const execucaoNormal = item.normalExecucao || 0;
                    const execucaoAcionamento = item.acionamentoExecucao || 0;
                    let produtividadeExibida = item.produtividade;
                    if (filtroTipoProtocolo === 'normal') produtividadeExibida = item.normalProdutividade || 0;
                    if (filtroTipoProtocolo === 'acionamento') produtividadeExibida = item.acionamentoProdutividade || 0;
                    
                    return (
                      <tr key={idx} className={item.tipoTecnico && !item.meta.atingiuProdutividade ? 'meta-abaixo' : ''}>
                        <td><strong>{item.tecnico}</strong></td>
                        <td>{item.regional}</td>
                        <td>
                          {item.tipoTecnico ? (
                            <span className={`badge-tipo ${
                              item.tipoTecnico === '12/36' ? 'badge-1236' : 
                              item.tipoTecnico === 'Comercial' ? 'badge-comercial' : 
                              item.tipoTecnico === 'Acionamento' ? 'badge-acionado' : 
                              'badge-ativacao'
                            }`}>{item.tipoTecnico}</span>
                          ) : (
                            <span className="badge-nao-config">Não config.</span>
                          )}
                        </td>
                        <td>{item.planejamento}</td>
                        <td><strong>{item.execucao}</strong></td>
                        <td>{item.remarcacao}</td>
                        <td>{item.cancelamento}</td>
                        <td className="produtividade-destaque">{produtividadeExibida.toFixed(2)}</td>
                        <td>{execucaoNormal}</td>
                        <td>{execucaoAcionamento}</td>
                        <td><small>{item.meta.produtividadeMin ? `${item.meta.produtividadeMin}pts / ${item.meta.protocolosMin}prot` : '-'}</small></td>
                        <td>
                          <span className={`status-badge ${item.tipoTecnico ? (item.meta.atingiuProdutividade && item.meta.atingiuProtocolos ? 'status-success' : 'status-warning') : 'status-pending'}`}>
                            {item.meta.status}
                          </span>
                        </td>
                        <td><button className="btn-detalhes" onClick={() => verDetalhesTecnico(item)}><i className="fas fa-eye"></i> Detalhes</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan="3"><strong>TOTAIS</strong></td>
                    <td><strong>{metricasFiltradas.planejamento}</strong></td>
                    <td><strong>{metricasFiltradas.execucao}</strong></td>
                    <td><strong>{metricasFiltradas.remarcacao}</strong></td>
                    <td><strong>{metricasFiltradas.cancelamento}</strong></td>
                    <td className="produtividade-destaque"><strong>{metricasFiltradas.totalProdutividade.toFixed(2)}</strong></td>
                    <td colSpan="4"></td>
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