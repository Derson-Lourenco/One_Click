// src/components/AbaProdutividade.jsx
/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import Chart from 'chart.js/auto';
import { Utils } from '../utils/helpers';
import { PlanilhaProcessor } from '../utils/api';
import { TABELA_PESOS, SERVICOS_IGNORADOS } from '../utils/constants';

const AbaProdutividade = () => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [regionais, setRegionais] = useState({});
  const [tecnicosPlanilha, setTecnicosPlanilha] = useState([]);
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]);
  const [buscaTermo, setBuscaTermo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [dadosProdutividade, setDadosProdutividade] = useState([]);
  const [dadosConsolidados, setDadosConsolidados] = useState(null);
  
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
  const [filtroTipoTecnico, setFiltroTipoTecnico] = useState('todos');
  const [filtroTipoProtocolo, setFiltroTipoProtocolo] = useState('todos');
  const [abaDetalhe, setAbaDetalhe] = useState('tecnicos');
  
  const metricasChartRef = useRef(null);
  const distribuicaoChartRef = useRef(null);
  const regionalChartRef = useRef(null);
  const tecnicosChartRef = useRef(null);
  
  const chartInstances = useRef({
    metricas: null,
    distribuicao: null,
    regional: null,
    tecnicos: null
  });
  
  const TIPOS_TECNICO = ['12/36', 'Comercial', 'Acionamento', 'Ação de Ativação'];
  
  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setDataInicio(hoje);
    setDataFim(hoje);
  }, []);
  
  // Função que carrega uma única data (já funcionava)
  const carregarDadosPorData = async (dataISO) => {
    if (!dataISO) return null;
    
    try {
      const resposta = await PlanilhaProcessor.carregarDadosPorData(dataISO);
      
      if (resposta.status === 'not_found' || !resposta.dados || resposta.dados.length === 0) {
        return null;
      }
      
      return resposta;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  };
  
  // Função para carregar período (usa a mesma função que já funcionava)
  const carregarDadosPorPeriodo = async () => {
    if (!dataInicio || !dataFim) {
      Swal.fire({ icon: 'warning', title: 'Selecione o período', text: 'Informe a data inicial e final!' });
      return;
    }
    
    setCarregando(true);
    setTecnicosSelecionados([]);
    setDadosProdutividade([]);
    setDadosConsolidados(null);
    setDadosPlanilha(null);
    setRegionais({});
    setTecnicosPlanilha([]);
    
    Swal.fire({
      title: 'Carregando...',
      text: `Carregando dados do período...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    try {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      
      const datas = [];
      const dataAtual = new Date(inicio);
      
      while (dataAtual <= fim) {
        datas.push(dataAtual.toISOString().split('T')[0]);
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      
      let todosDados = [];
      let todasRegionais = {};
      let dadosCarregados = 0;
      
      for (const data of datas) {
        const resposta = await carregarDadosPorData(data);
        if (resposta && resposta.dados && resposta.dados.length > 0) {
          todosDados = [...todosDados, ...resposta.dados];
          dadosCarregados++;
          
          const regionaisAba = PlanilhaProcessor.extrairTecnicosPorRegional(resposta.dados);
          for (const [reg, tecs] of Object.entries(regionaisAba)) {
            if (!todasRegionais[reg]) todasRegionais[reg] = [];
            tecs.forEach(tec => {
              if (!todasRegionais[reg].includes(tec)) {
                todasRegionais[reg].push(tec);
              }
            });
          }
        }
      }
      
      if (todosDados.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Nenhum dado encontrado',
          text: `Nenhum dado encontrado no período de ${dataInicio} a ${dataFim}`,
          timer: 3000
        });
        setCarregando(false);
        return;
      }
      
      setDadosPlanilha(todosDados);
      setRegionais(todasRegionais);
      
      const tecnicosList = [];
      for (let regional in todasRegionais) {
        todasRegionais[regional].forEach(tec => {
          tecnicosList.push({ 
            nome: tec, 
            regional,
            tipoTecnico: null
          });
        });
      }
      setTecnicosPlanilha(tecnicosList);
      
      Swal.fire({
        icon: 'success',
        title: 'Dados carregados!',
        text: `${dadosCarregados} dia(s) carregados. ${tecnicosList.length} técnicos encontrados.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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
    if (!dadosPlanilha) {
      Swal.fire({ icon: 'warning', title: 'Carregue os dados', text: 'Primeiro selecione o período e clique em "Carregar Dados"!' });
      return;
    }
    
    if (tecnicosSelecionados.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Nenhum técnico selecionado', text: 'Selecione pelo menos um técnico da lista!' });
      return;
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
          normalTotalProdutividade: 0, normalTotalExecutado: 0,
          tecnicosList: []
        };
      }
      
      metricasPorReg[tecnicoObj.regional].tecnicosList.push({
        nome: tecnicoObj.nome,
        tipo: tecnicoObj.tipoTecnico,
        ...metricas,
        meta: metaInfo
      });
      
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
    setDadosConsolidados({
      tecnicos: resultados,
      regionais: metricasPorReg
    });
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
    const totalProtocolosTecnico = tecnico.planejamento + tecnico.execucao + tecnico.remarcacao + 
                                     tecnico.cancelamento + tecnico.tratativasCS + 
                                     tecnico.infraestrutura + tecnico.resolucaoN2;
    
    Swal.fire({
      title: `<i class="fas fa-chart-line" style="color: #E8465D; margin-right: 8px;"></i> Detalhamento - ${tecnico.tecnico}`,
      html: `
        <div style="text-align: left; max-height: 70vh; overflow-y: auto;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #E8465D;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-info-circle" style="color: #E8465D; margin-right: 6px;"></i> Informações Gerais
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-map-marker-alt" style="color: #64748b;"></i> <strong>Regional:</strong> ${tecnico.regional}</div>
              <div><i class="fas fa-briefcase" style="color: #64748b;"></i> <strong>Tipo:</strong> ${tecnico.tipoTecnico || 'Não configurado'}</div>
              <div><i class="fas fa-clock" style="color: #64748b;"></i> <strong>Horário:</strong> ${tecnico.meta.horario || 'Não definido'}</div>
              <div><i class="fas fa-calendar" style="color: #64748b;"></i> <strong>Período:</strong> ${dataInicio} a ${dataFim}</div>
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
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #17a2b8;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-table-list" style="color: #17a2b8; margin-right: 6px;"></i> Detalhamento de Protocolos
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-tasks" style="color: #E8465D;"></i> <strong>Protocolos Planejamento:</strong> ${tecnico.planejamento}</div>
              <div><i class="fas fa-check-circle" style="color: #28a745;"></i> <strong>Protocolos Execução:</strong> ${tecnico.execucao}</div>
              <div><i class="fas fa-exchange-alt" style="color: #ffc107;"></i> <strong>Protocolos Remarcação:</strong> ${tecnico.remarcacao}</div>
              <div><i class="fas fa-ban" style="color: #dc3545;"></i> <strong>Protocolos Cancelamento:</strong> ${tecnico.cancelamento}</div>
              <div><i class="fas fa-headset" style="color: #17a2b8;"></i> <strong>Protocolos Tratativas CS:</strong> ${tecnico.tratativasCS}</div>
              <div><i class="fas fa-network-wired" style="color: #6f42c1;"></i> <strong>Protocolos Infraestrutura:</strong> ${tecnico.infraestrutura}</div>
              <div><i class="fas fa-microchip" style="color: #fd7e14;"></i> <strong>Protocolos Resolução N2:</strong> ${tecnico.resolucaoN2}</div>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div><i class="fas fa-calculator" style="color: #4a6382;"></i> <strong>Total de Protocolos:</strong> ${totalProtocolosTecnico}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 3px solid #4a6382;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #4a6382;"><i class="fas fa-chart-line"></i> Protocolos NORMAL</h5>
              <div><small>Planejamento:</small> <strong>${tecnico.normalPlanejamento || 0}</strong></div>
              <div><small>Execução:</small> <strong>${tecnico.normalExecucao || 0}</strong></div>
              <div><small>Remarcação:</small> <strong>${tecnico.normalRemarcacao || 0}</strong></div>
              <div><small>Cancelamento:</small> <strong>${tecnico.normalCancelamento || 0}</strong></div>
              <div><small>Tratativas CS:</small> <strong>${tecnico.normalTratativasCS || 0}</strong></div>
              <div><small>Infraestrutura:</small> <strong>${tecnico.normalInfraestrutura || 0}</strong></div>
              <div><small>Resolução N2:</small> <strong>${tecnico.normalResolucaoN2 || 0}</strong></div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <strong>Produtividade NORMAL:</strong> ${(tecnico.normalProdutividade || 0).toFixed(2)} pts
              </div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 3px solid #E8465D;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #E8465D;"><i class="fas fa-bolt"></i> Acionamento/Ação de Ativação</h5>
              <div><small>Planejamento:</small> <strong>${tecnico.acionamentoPlanejamento || 0}</strong></div>
              <div><small>Execução:</small> <strong>${tecnico.acionamentoExecucao || 0}</strong></div>
              <div><small>Remarcação:</small> <strong>${tecnico.acionamentoRemarcacao || 0}</strong></div>
              <div><small>Cancelamento:</small> <strong>${tecnico.acionamentoCancelamento || 0}</strong></div>
              <div><small>Tratativas CS:</small> <strong>${tecnico.acionamentoTratativasCS || 0}</strong></div>
              <div><small>Infraestrutura:</small> <strong>${tecnico.acionamentoInfraestrutura || 0}</strong></div>
              <div><small>Resolução N2:</small> <strong>${tecnico.acionamentoResolucaoN2 || 0}</strong></div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <strong>Produtividade ACIONAMENTO:</strong> ${(tecnico.acionamentoProdutividade || 0).toFixed(2)} pts
              </div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 3px solid #4a6382;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-wrench" style="color: #4a6382; margin-right: 6px;"></i> Serviços Executados (${Object.keys(tecnico.mapa || {}).length} tipos)
            </h4>
            <div style="max-height: 300px; overflow-y: auto;">
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: #f8fafc;">
                    <th style="text-align: left; padding: 6px 0;">Serviço</th>
                    <th style="text-align: center; padding: 6px 0;">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(tecnico.mapa || {}).sort((a, b) => b[1] - a[1]).map(([servico, qtd]) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 0;">${servico}</td>
                      <td style="text-align: center; padding: 6px 0; font-weight: 600;">${qtd}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
      width: '800px',
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#E8465D',
      showCloseButton: true
    });
  };
  
  const verDetalhesRegional = (regional, dadosRegional) => {
    const totalProtocolosRegional = dadosRegional.planejamento + dadosRegional.execucao + dadosRegional.remarcacao + 
                                      dadosRegional.cancelamento + dadosRegional.tratativasCS + 
                                      dadosRegional.infraestrutura + dadosRegional.resolucaoN2;
    
    Swal.fire({
      title: `<i class="fas fa-map-marker-alt" style="color: #E8465D; margin-right: 8px;"></i> Detalhamento - ${regional}`,
      html: `
        <div style="text-align: left; max-height: 70vh; overflow-y: auto;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #E8465D;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-info-circle" style="color: #E8465D; margin-right: 6px;"></i> Informações Gerais
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-users" style="color: #64748b;"></i> <strong>Total de Técnicos:</strong> ${dadosRegional.tecnicos}</div>
              <div><i class="fas fa-calendar" style="color: #64748b;"></i> <strong>Período:</strong> ${dataInicio} a ${dataFim}</div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #28a745;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-chart-simple" style="color: #28a745; margin-right: 6px;"></i> Métricas de Desempenho da Regional
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-check-circle" style="color: #28a745;"></i> <strong>Protocolos Executados:</strong> ${dadosRegional.execucao}</div>
              <div><i class="fas fa-star" style="color: #ffc107;"></i> <strong>Produtividade Total:</strong> ${dadosRegional.totalProdutividade.toFixed(2)} pts</div>
              <div><i class="fas fa-chart-line" style="color: #4a6382;"></i> <strong>Produtividade Média por Técnico:</strong> ${(dadosRegional.totalProdutividade / dadosRegional.tecnicos).toFixed(2)} pts</div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 3px solid #17a2b8;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-table-list" style="color: #17a2b8; margin-right: 6px;"></i> Detalhamento de Protocolos
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><i class="fas fa-tasks" style="color: #E8465D;"></i> <strong>Protocolos Planejamento:</strong> ${dadosRegional.planejamento}</div>
              <div><i class="fas fa-check-circle" style="color: #28a745;"></i> <strong>Protocolos Execução:</strong> ${dadosRegional.execucao}</div>
              <div><i class="fas fa-exchange-alt" style="color: #ffc107;"></i> <strong>Protocolos Remarcação:</strong> ${dadosRegional.remarcacao}</div>
              <div><i class="fas fa-ban" style="color: #dc3545;"></i> <strong>Protocolos Cancelamento:</strong> ${dadosRegional.cancelamento}</div>
              <div><i class="fas fa-headset" style="color: #17a2b8;"></i> <strong>Protocolos Tratativas CS:</strong> ${dadosRegional.tratativasCS}</div>
              <div><i class="fas fa-network-wired" style="color: #6f42c1;"></i> <strong>Protocolos Infraestrutura:</strong> ${dadosRegional.infraestrutura}</div>
              <div><i class="fas fa-microchip" style="color: #fd7e14;"></i> <strong>Protocolos Resolução N2:</strong> ${dadosRegional.resolucaoN2}</div>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div><i class="fas fa-calculator" style="color: #4a6382;"></i> <strong>Total de Protocolos:</strong> ${totalProtocolosRegional}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 3px solid #4a6382;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #4a6382;"><i class="fas fa-chart-line"></i> Protocolos NORMAL</h5>
              <div><small>Planejamento:</small> <strong>${dadosRegional.normalPlanejamento || 0}</strong></div>
              <div><small>Execução:</small> <strong>${dadosRegional.normalExecucao || 0}</strong></div>
              <div><small>Remarcação:</small> <strong>${dadosRegional.normalRemarcacao || 0}</strong></div>
              <div><small>Cancelamento:</small> <strong>${dadosRegional.normalCancelamento || 0}</strong></div>
              <div><small>Tratativas CS:</small> <strong>${dadosRegional.normalTratativasCS || 0}</strong></div>
              <div><small>Infraestrutura:</small> <strong>${dadosRegional.normalInfraestrutura || 0}</strong></div>
              <div><small>Resolução N2:</small> <strong>${dadosRegional.normalResolucaoN2 || 0}</strong></div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <strong>Produtividade NORMAL:</strong> ${(dadosRegional.normalTotalProdutividade || 0).toFixed(2)} pts
              </div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border-left: 3px solid #E8465D;">
              <h5 style="margin: 0 0 8px 0; font-size: 12px; color: #E8465D;"><i class="fas fa-bolt"></i> Acionamento/Ação de Ativação</h5>
              <div><small>Planejamento:</small> <strong>${dadosRegional.acionamentoPlanejamento || 0}</strong></div>
              <div><small>Execução:</small> <strong>${dadosRegional.acionamentoExecucao || 0}</strong></div>
              <div><small>Remarcação:</small> <strong>${dadosRegional.acionamentoRemarcacao || 0}</strong></div>
              <div><small>Cancelamento:</small> <strong>${dadosRegional.acionamentoCancelamento || 0}</strong></div>
              <div><small>Tratativas CS:</small> <strong>${dadosRegional.acionamentoTratativasCS || 0}</strong></div>
              <div><small>Infraestrutura:</small> <strong>${dadosRegional.acionamentoInfraestrutura || 0}</strong></div>
              <div><small>Resolução N2:</small> <strong>${dadosRegional.acionamentoResolucaoN2 || 0}</strong></div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <strong>Produtividade ACIONAMENTO:</strong> ${(dadosRegional.acionamentoTotalProdutividade || 0).toFixed(2)} pts
              </div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 3px solid #4a6382;">
            <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
              <i class="fas fa-users" style="color: #4a6382; margin-right: 6px;"></i> Técnicos da Regional (${dadosRegional.tecnicosList?.length || 0})
            </h4>
            <div style="max-height: 300px; overflow-y: auto;">
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: #f8fafc;">
                    <th style="text-align: left; padding: 6px 0;">Técnico</th>
                    <th style="text-align: center; padding: 6px 0;">Tipo</th>
                    <th style="text-align: center; padding: 6px 0;">Execução</th>
                    <th style="text-align: center; padding: 6px 0;">Produtividade</th>
                    <th style="text-align: center; padding: 6px 0;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${(dadosRegional.tecnicosList || []).sort((a, b) => b.produtividade - a.produtividade).map(tec => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 6px 0;">${tec.nome}</td>
                      <td style="text-align: center; padding: 6px 0;">
                        <span style="background: ${tec.tipo ? '#E8465D20' : '#e9ecef'}; padding: 2px 8px; border-radius: 12px; font-size: 10px;">
                          ${tec.tipo || 'Não config.'}
                        </span>
                       </tr>
                      <td style="text-align: center; padding: 6px 0; font-weight: 600;">${tec.execucao}</td>
                      <td style="text-align: center; padding: 6px 0; font-weight: 600; color: ${tec.meta?.atingiuProdutividade ? '#28a745' : '#E8465D'};">${tec.produtividade.toFixed(2)}</td>
                      <td style="text-align: center; padding: 6px 0;">
                        <span style="color: ${tec.meta?.atingiuProdutividade && tec.meta?.atingiuProtocolos ? '#28a745' : '#e67e22'};">
                          ${tec.meta?.status || 'Aguardando'}
                        </span>
                       </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
      width: '800px',
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#E8465D',
      showCloseButton: true
    });
  };
  
  const exportarResultados = () => {
    if (!dadosProdutividade.length) {
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
    link.setAttribute('download', `produtividade_${dataInicio}_a_${dataFim}.csv`);
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
          <p className="card-subtitle">Selecione o período, os técnicos e configure o tipo (12/36, Comercial, Acionamento ou Ação de Ativação)</p>
        </div>
        
        <div className="filtros-row">
          <div className="filtro-group">
            <label><i className="far fa-calendar-alt"></i> Data Inicial</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-moderno" />
          </div>
          <div className="filtro-group">
            <label><i className="far fa-calendar-alt"></i> Data Final</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-moderno" />
          </div>
          <div className="filtro-group">
            <label>&nbsp;</label>
            <button onClick={carregarDadosPorPeriodo} className="btn-processar" style={{ marginTop: 0 }}>
              <i className="fas fa-download"></i> Carregar Dados
            </button>
          </div>
        </div>
        
        <div className="filtros-row">
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
          <div className="filtro-group">
            <label>&nbsp;</label>
            <button onClick={selecionarTodosTecnicos} className="btn-outline-primary" style={{ width: '100%' }}>
              <i className="fas fa-check-double"></i> Selecionar Todos
            </button>
          </div>
        </div>
        
        <div className="tecnicos-buttons">
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
                <i className="fas fa-clock"></i> 12/36
              </button>
              <button 
                onClick={() => configurarPadraoParaSelecionados('Comercial')} 
                className="btn-outline-primary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-briefcase"></i> Comercial
              </button>
              <button 
                onClick={() => configurarPadraoParaSelecionados('Acionamento')} 
                className="btn-outline-secondary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-bolt"></i> Acionamento
              </button>
              <button 
                onClick={() => configurarPadraoParaSelecionados('Ação de Ativação')} 
                className="btn-outline-secondary"
                style={{ flex: 1 }}
              >
                <i className="fas fa-play-circle"></i> Ação de Ativação
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
          
          {/* Abas de Detalhamento */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setAbaDetalhe('tecnicos')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: abaDetalhe === 'tecnicos' ? '3px solid #E8465D' : '3px solid transparent',
                color: abaDetalhe === 'tecnicos' ? '#E8465D' : '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'none',
                minWidth: 'auto'
              }}
            >
              <i className="fas fa-users"></i> Detalhamento por Técnico
            </button>
            <button 
              onClick={() => setAbaDetalhe('regionais')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: abaDetalhe === 'regionais' ? '3px solid #E8465D' : '3px solid transparent',
                color: abaDetalhe === 'regionais' ? '#E8465D' : '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'none',
                minWidth: 'auto'
              }}
            >
              <i className="fas fa-map-marker-alt"></i> Detalhamento por Regional
            </button>
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
          
          {/* Detalhamento por Técnico */}
          {abaDetalhe === 'tecnicos' && (
            <div className="tabela-resultados-prod">
              <div className="tabela-header">
                <h4><i className="fas fa-table"></i> Detalhamento por Técnico</h4>
                <button onClick={exportarResultados} className="btn-exportar"><i className="fas fa-file-excel"></i> Exportar CSV</button>
              </div>
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="data-table-prod" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
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
                      <td colSpan="5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          {/* Detalhamento por Regional */}
          {abaDetalhe === 'regionais' && dadosConsolidados?.regionais && (
            <div className="tabela-resultados-prod">
              <div className="tabela-header">
                <h4><i className="fas fa-table"></i> Detalhamento por Regional</h4>
              </div>
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="data-table-prod" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                    <tr>
                      <th>Regional</th>
                      <th>Técnicos</th>
                      <th>Planej.</th>
                      <th>Exec.</th>
                      <th>Remarc.</th>
                      <th>Cancel.</th>
                      <th>Produtividade</th>
                      <th>Exec NORMAL</th>
                      <th>Exec ACION.</th>
                      <th>Produtividade Média</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dadosConsolidados.regionais).map(([regional, dados]) => {
                      const produtividadeMedia = dados.totalProdutividade / dados.tecnicos;
                      const execucaoNormal = dados.normalExecucao || 0;
                      const execucaoAcionamento = dados.acionamentoExecucao || 0;
                      let produtividadeExibida = dados.totalProdutividade;
                      if (filtroTipoProtocolo === 'normal') produtividadeExibida = dados.normalTotalProdutividade || 0;
                      if (filtroTipoProtocolo === 'acionamento') produtividadeExibida = dados.acionamentoTotalProdutividade || 0;
                      
                      return (
                        <tr key={regional}>
                          <td><strong>{regional}</strong></td>
                          <td>{dados.tecnicos}</td>
                          <td>{dados.planejamento}</td>
                          <td><strong>{dados.execucao}</strong></td>
                          <td>{dados.remarcacao}</td>
                          <td>{dados.cancelamento}</td>
                          <td className="produtividade-destaque">{produtividadeExibida.toFixed(2)}</td>
                          <td>{execucaoNormal}</td>
                          <td>{execucaoAcionamento}</td>
                          <td>{produtividadeMedia.toFixed(2)}</td>
                          <td><button className="btn-detalhes" onClick={() => verDetalhesRegional(regional, dados)}><i className="fas fa-eye"></i> Detalhes</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td><strong>TOTAIS</strong></td>
                      <td><strong>{Object.keys(dadosConsolidados.regionais).length}</strong></td>
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
          )}
        </>
      )}
    </div>
  );
};

export default AbaProdutividade;