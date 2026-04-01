import { Utils } from './helpers';

export const DataManager = {
  registros: [],
  justificativasAdicionais: {},
  
  loadFromLocalStorage() {
    this.registros = JSON.parse(localStorage.getItem("registros")) || [];
    this.justificativasAdicionais = JSON.parse(localStorage.getItem("justificativas_adicionais")) || {};
  },
  
  salvarLocal() {
    localStorage.setItem("registros", JSON.stringify(this.registros));
    localStorage.setItem("justificativas_adicionais", JSON.stringify(this.justificativasAdicionais));
  },
  
  salvarRelatorio(data, dados) {
    const chave = `relatorio_${data}`;
    localStorage.setItem(chave, JSON.stringify({ data, dados, dataSalva: new Date().toISOString() }));
  },
  
  carregarRelatorio(data) {
    const chave = `relatorio_${data}`;
    const itemSalvo = localStorage.getItem(chave);
    return itemSalvo ? JSON.parse(itemSalvo) : null;
  },
  
  apagarRelatorioPorData(data) {
    const chave = `relatorio_${data}`;
    if (localStorage.getItem(chave)) {
      localStorage.removeItem(chave);
      return true;
    }
    return false;
  },
  
  buscarRetiradasPorTecnicoData(tecnico, data) {
    const todas = this.registros.filter(
      (r) => r.tecnico.toLowerCase().trim() === tecnico.toLowerCase().trim() && r.data === data
    );
    const unicos = [];
    const chaves = new Set();
    todas.forEach((r) => {
      const chave = `${r.motivo}_${r.minutos}_${r.inicio}_${r.fim}`;
      if (!chaves.has(chave)) {
        chaves.add(chave);
        unicos.push(r);
      }
    });
    return unicos;
  },
  
  getJustificativasAdicionais(tecnico, data) {
    const key = `${tecnico}_${data}`;
    return this.justificativasAdicionais[key] || [];
  },
  
  addJustificativaAdicional(tecnico, data, justificativa) {
    const key = `${tecnico}_${data}`;
    if (!this.justificativasAdicionais[key]) this.justificativasAdicionais[key] = [];
    this.justificativasAdicionais[key].push({
      id: Date.now(),
      texto: justificativa,
      dataCriacao: new Date().toISOString(),
      origem: "planilha",
    });
    this.salvarLocal();
  },
  
  addJustificativasAdicionaisBatch(tecnico, data, justificativas) {
    const key = `${tecnico}_${data}`;
    if (!this.justificativasAdicionais[key]) this.justificativasAdicionais[key] = [];
    
    justificativas.forEach((just) => {
      const jaExiste = this.justificativasAdicionais[key].some(
        (existente) => existente.texto === just.texto
      );
      if (!jaExiste && just.texto && just.texto.trim()) {
        this.justificativasAdicionais[key].push({
          id: Date.now() + Math.random(),
          texto: just.texto.trim(),
          dataCriacao: new Date().toISOString(),
          origem: "planilha",
        });
      }
    });
    this.salvarLocal();
  },
  
  updateJustificativaAdicional(tecnico, data, id, novoTexto) {
    const key = `${tecnico}_${data}`;
    if (this.justificativasAdicionais[key]) {
      const index = this.justificativasAdicionais[key].findIndex((j) => j.id === id);
      if (index !== -1) {
        this.justificativasAdicionais[key][index].texto = novoTexto;
        this.salvarLocal();
      }
    }
  },
  
  deleteJustificativaAdicional(tecnico, data, id) {
    const key = `${tecnico}_${data}`;
    if (this.justificativasAdicionais[key]) {
      this.justificativasAdicionais[key] = this.justificativasAdicionais[key].filter((j) => j.id !== id);
      this.salvarLocal();
    }
  }
};