import { API_URL } from './constants';

export const PlanilhaProcessor = {
  async carregarDadosPorData(dataISO) {
    return new Promise((resolve, reject) => {
      const callbackName = "callback_" + Date.now();
      const url = `${API_URL}?callback=${callbackName}&data=${dataISO}&t=${Date.now()}`;
      let timeout = setTimeout(() => reject("Timeout na API"), 15000);
      
      window[callbackName] = function (data) {
        clearTimeout(timeout);
        
        // Adiciona protocolo virtual para status prioritários
        if (data && data.dados && Array.isArray(data.dados)) {
          const tiposPrioritarios = ["DSS", "BANCO DE HORAS", "DESLOCAMENTO", "RETIRADA DE TEMPO", "CHUVA"];
          
          for (let i = 0; i < data.dados.length; i++) {
            const item = data.dados[i];
            const linha = item.linha;
            
            if (linha && linha[12]) {
              const feito = linha[12].toString().toUpperCase().trim();
              const protocolo = linha[4] ? linha[4].toString().trim() : "";
              const isPrioritario = tiposPrioritarios.some((tipo) => {
                return feito === tipo;
              });
              
              if (isPrioritario && protocolo === "") {
                linha[4] = "1";
              }
            }
          }
        }
        
        resolve(data);
        delete window[callbackName];
        if (script) script.remove();
      };
      
      const script = document.createElement("script");
      script.src = url;
      script.onerror = () => {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
        reject("Erro ao carregar script");
      };
      document.body.appendChild(script);
    });
  },
  
  extrairDadosArray(dadosAPI) {
    if (!dadosAPI || dadosAPI.length === 0) return [];
    if (dadosAPI[0] && dadosAPI[0].linha) {
      return dadosAPI.map((item) => item.linha);
    }
    if (Array.isArray(dadosAPI[0])) return dadosAPI;
    return [];
  },
  
  extrairTecnicosPorRegional(dadosAPI) {
    const dados = this.extrairDadosArray(dadosAPI);
    if (!dados || dados.length === 0) return {};
    let regionais = {};
    let regionalAtual = "SEM REGIONAL";
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha) continue;
      const colB = (linha[1] || "").toString().trim();
      const colC = (linha[2] || "").toString().trim();
      if (colB && (colB.toUpperCase().includes("REGIONAL") || colB.toUpperCase().includes("DEMAIS"))) {
        regionalAtual = colB;
        if (!regionais[regionalAtual]) regionais[regionalAtual] = [];
        continue;
      }
      if (
        colB === "0" &&
        colC &&
        colC.length > 3 &&
        !colC.includes("BANCO") &&
        !colC.includes("PROTOCOLO") &&
        !colC.includes("DATA") &&
        !colC.includes("SERVIÇO") &&
        !colC.includes("#REF!")
      ) {
        let nomeTecnico = colC.trim();
        if (!regionais[regionalAtual]) regionais[regionalAtual] = [];
        if (!regionais[regionalAtual].includes(nomeTecnico)) {
          regionais[regionalAtual].push(nomeTecnico);
        }
      }
    }
    return regionais;
  },
  
  processarDadosTecnicoPorRegional(dadosAPI, tecnicoNome, regionalNome, { TABELA_PESOS, SERVICOS_IGNORADOS, Utils }) {
    const dados = this.extrairDadosArray(dadosAPI);
    const idxProtocolo = 4;
    const idxServico = 6;
    const idxFeito = 12;
    const idxEquipe = 1;
    const idxTecnico = 2;
    
    // Adiciona protocolo virtual para status prioritários
    const tiposPrioritarios = ["DSS", "BANCO DE HORAS", "DESLOCAMENTO", "RETIRADA DE TEMPO", "CHUVA"];
    
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha) continue;
      const feito = linha[idxFeito] ? linha[idxFeito].toString().toUpperCase().trim() : "";
      const protocolo = linha[idxProtocolo] ? linha[idxProtocolo].toString().trim() : "";
      const isPrioritario = tiposPrioritarios.some((tipo) => {
        const tipoNorm = Utils.normalizarTexto(tipo);
        const feitoNorm = Utils.normalizarTexto(feito);
        return tipoNorm === feitoNorm;
      });
      if (isPrioritario && (protocolo === "" || protocolo === "0")) {
        linha[idxProtocolo] = "1";
      }
    }
    
    const calcularValorServico = (servico) => {
      const s = servico.toUpperCase().replace(/\s+/g, "");
      if (s.includes("RECORRÊNCIA")) return 1;
      if (s.includes("REC+") && s.includes("DES.PORTA")) return 0.5;
      if (servico.includes("DES.") || servico.includes("DESAT") || servico.includes("RECOLHER")) return 0.25;
      if (servico.includes("+")) return 1.5;
      if (servico.includes("IPTV") || servico.includes("TV") || servico.includes("SVA") || servico.includes("BOX")) return 0.5;
      return 1;
    };
    
    let processandoTecnico = false;
    let planejamento = 0, execucao = 0, remarcacao = 0, cancelamento = 0;
    let tratativasCS = 0, infraestrutura = 0, resolucaoN2 = 0, totalExecutado = 0;
    let mapa = {};
    
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha) continue;
      const colB = (linha[idxEquipe] || "").toString().trim();
      const colC = (linha[idxTecnico] || "").toString().trim();
      const colProtocolo = linha[idxProtocolo] ? linha[idxProtocolo].toString().trim() : "";
      
      if (colB === "0" && colC === tecnicoNome) {
        processandoTecnico = true;
        continue;
      }
      if (processandoTecnico && colB === "0" && colC && colC !== tecnicoNome && colC.length > 3) {
        processandoTecnico = false;
        break;
      }
      if (!processandoTecnico) continue;
      
      let protocolo = colProtocolo;
      let servicoOriginal = linha[idxServico] ? linha[idxServico].toString().trim() : "";
      let feito = linha[idxFeito] ? linha[idxFeito].toString().trim() : "";
      
      protocolo = protocolo.replace(/[\x00-\x1F\x7F]/g, "");
      servicoOriginal = servicoOriginal.replace(/[\x00-\x1F\x7F]/g, "");
      feito = feito.replace(/[\x00-\x1F\x7F]/g, "");
      
      const servicoNormalizado = Utils.normalizarTexto(servicoOriginal);
      const feitoNormalizado = Utils.normalizarTexto(feito);
      
      const tiposRetiradaPermitidos = ["DSS", "BANCO DE HORAS", "DESLOCAMENTO", "RETIRADA DE TEMPO", "CHUVA"];
      const isRetiradaPermitida = tiposRetiradaPermitidos.some((tipo) => {
        const tipoNormalizado = Utils.normalizarTexto(tipo);
        return feitoNormalizado === tipoNormalizado;
      });
      
      if (!isRetiradaPermitida) {
        if (protocolo === "" || protocolo === "0") continue;
        if (!/^\d+$/.test(protocolo)) continue;
        if (protocolo === "PROTOCOLO") continue;
      }
      
      if (SERVICOS_IGNORADOS.some((ignorado) => servicoNormalizado.includes(Utils.normalizarTexto(ignorado)))) continue;
      
      const servicosResumo = ["M.E.", "MMA", "RESUMO", "TOTAL", "EQUIPE"];
      if (servicosResumo.some((resumo) => servicoOriginal.includes(resumo))) continue;
      
      if (feitoNormalizado === "NENHUM" || feito === "0" || feito === "-" || feito === "") continue;
      
      planejamento++;
      
      if (feitoNormalizado.includes("CANCEL")) {
        cancelamento++;
        continue;
      }
      
      if (feitoNormalizado === "RV" || feitoNormalizado === "RC") {
        remarcacao++;
        continue;
      }
      
      const linhaCompleta = Utils.normalizarTexto(protocolo + " " + servicoOriginal + " " + feito);
      if (linhaCompleta.includes("TRATAT")) {
        tratativasCS++;
        continue;
      }
      if (linhaCompleta.includes("INFRA")) {
        infraestrutura++;
        continue;
      }
      if (linhaCompleta.includes("NIVEL 2") || linhaCompleta.includes("N2")) {
        resolucaoN2++;
        continue;
      }
      if (feitoNormalizado.includes("OK") || feitoNormalizado.includes("FEITO") || feitoNormalizado.includes("ENCERRAMENTO")) {
        execucao++;
        const valor = calcularValorServico(servicoOriginal);
        totalExecutado += valor;
        if (!mapa[servicoOriginal]) mapa[servicoOriginal] = 0;
        mapa[servicoOriginal] += 1;
      }
    }
    
    let produtividade = 0;
    for (let tipo in mapa) {
      let servicoNorm = Utils.normalizarTexto(tipo);
      let peso = 1;
      for (let [chave, valor] of Object.entries(TABELA_PESOS)) {
        if (Utils.normalizarTexto(chave) === servicoNorm) {
          peso = valor;
          break;
        }
      }
      produtividade += peso * mapa[tipo];
    }
    
    return {
      planejamento,
      execucao,
      totalExecutado,
      remarcacao,
      cancelamento,
      tratativasCS,
      infraestrutura,
      resolucaoN2,
      mapa,
      produtividade,
    };
  },
  
  processarRetiradasDoTecnico(dadosAPI, tecnicoNome, { Utils, TIPOS_RETIRADA }) {
    const retiradas = [];
    const dados = this.extrairDadosArray(dadosAPI);
    const idxServico = 6;
    const idxFeito = 12;
    const idxTempo = 11;
    const idxEquipe = 1;
    const idxTecnico = 2;
    
    const tiposPrioritarios = ["DSS", "BANCO DE HORAS", "DESLOCAMENTO", "RETIRADA DE TEMPO", "CHUVA"];
    
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha) continue;
      
      const colB = (linha[idxEquipe] || "").toString().trim();
      const colC = (linha[idxTecnico] || "").toString().trim();
      const feito = (linha[idxFeito] || "").toString().toUpperCase();
      const feitoNormalizado = Utils.normalizarTexto(feito);
      const protocolo = (linha[4] || "").toString().trim();
      
      const isPrioritario = tiposPrioritarios.some((tipo) => {
        const tipoNormalizado = Utils.normalizarTexto(tipo);
        return feitoNormalizado === tipoNormalizado;
      });
      
      let pertenceAoTecnico = colC === tecnicoNome;
      
      if (!pertenceAoTecnico) {
        for (let j = i - 1; j >= 0; j--) {
          const linhaAnterior = dados[j];
          if (!linhaAnterior) continue;
          const colB_ant = (linhaAnterior[idxEquipe] || "").toString().trim();
          const colC_ant = (linhaAnterior[idxTecnico] || "").toString().trim();
          
          if (colB_ant === "0" && colC_ant === tecnicoNome) {
            pertenceAoTecnico = true;
            break;
          }
          if (colB_ant === "0" && colC_ant && colC_ant !== tecnicoNome && colC_ant.length > 3) break;
        }
      }
      
      if (isPrioritario && pertenceAoTecnico) {
        let tempoExecucao = (linha[idxTempo] || "").toString();
        let servico = (linha[idxServico] || "").toString().toUpperCase();
        
        if (Utils.temHorarioValido(tempoExecucao)) {
          let minutos = 0, inicio = "", fim = "", motivo = "";
          const horarios = Utils.extrairHorarios(tempoExecucao);
          
          if (horarios) {
            if (horarios.minutosDiretos) {
              minutos = horarios.minutosDiretos;
              inicio = "00:00";
              fim = Utils.minutosParaHoraMinutos(minutos);
            } else if (horarios.inicio && horarios.fim) {
              inicio = horarios.inicio;
              fim = horarios.fim;
              minutos = Utils.calcularMinutos(inicio, fim);
              if (minutos === null) minutos = 0;
            } else if (horarios.inicio && !horarios.fim) {
              inicio = horarios.inicio;
              const fimDia = "23:59";
              minutos = Utils.calcularMinutos(inicio, fimDia);
              if (minutos && minutos > 0) fim = fimDia;
              else {
                minutos = 60;
                fim = "01:00";
              }
            }
          }
          
          motivo = feito;
          
          if (minutos > 0) {
            retiradas.push({ inicio, fim, motivo, minutos, temHoras: true, tipo: feito });
          }
        }
      }
    }
    
    let processandoTecnico = false;
    
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha) continue;
      
      const colB = (linha[idxEquipe] || "").toString().trim();
      const colC = (linha[idxTecnico] || "").toString().trim();
      
      if (colB === "0" && colC === tecnicoNome) {
        processandoTecnico = true;
        continue;
      }
      
      if (processandoTecnico && colB === "0" && colC && colC !== tecnicoNome && colC.length > 3) {
        processandoTecnico = false;
        break;
      }
      
      if (processandoTecnico) {
        let servico = (linha[idxServico] || "").toString().toUpperCase();
        let feito = (linha[idxFeito] || "").toString().toUpperCase();
        let tempoExecucao = (linha[idxTempo] || "").toString();
        let protocolo = linha[4] ? linha[4].toString().trim() : "";
        
        const feitoNormalizado = Utils.normalizarTexto(feito);
        const isRetirada = TIPOS_RETIRADA.some((tipo) => {
          const tipoNormalizado = Utils.normalizarTexto(tipo);
          return feitoNormalizado === tipoNormalizado;
        });
        
        if (isRetirada) {
          const temHorarioValidoFlag = Utils.temHorarioValido(tempoExecucao);
          
          if (temHorarioValidoFlag) {
            let minutos = 0, inicio = "", fim = "", motivo = "";
            const horarios = Utils.extrairHorarios(tempoExecucao);
            
            if (horarios) {
              if (horarios.minutosDiretos) {
                minutos = horarios.minutosDiretos;
                inicio = "00:00";
                fim = Utils.minutosParaHoraMinutos(minutos);
              } else if (horarios.inicio && horarios.fim) {
                inicio = horarios.inicio;
                fim = horarios.fim;
                minutos = Utils.calcularMinutos(inicio, fim);
                if (minutos === null) minutos = 0;
              } else if (horarios.inicio && !horarios.fim) {
                inicio = horarios.inicio;
                const fimDia = "23:59";
                minutos = Utils.calcularMinutos(inicio, fimDia);
                if (minutos && minutos > 0) fim = fimDia;
                else {
                  minutos = 60;
                  fim = "01:00";
                }
              }
            }
            
            motivo = feito;
            
            if (minutos > 0) {
              const jaExiste = retiradas.some((r) => r.inicio === inicio && r.fim === fim);
              if (!jaExiste) {
                retiradas.push({ inicio, fim, motivo, minutos, temHoras: true, tipo: feito });
              }
            }
          }
        }
      }
    }
    
    return retiradas;
  },
  
  processarJustificativasAdicionaisDoTecnico(dadosAPI, tecnicoNome, { Utils, TIPOS_RETIRADA }) {
    const justificativas = [];
    const dados = this.extrairDadosArray(dadosAPI);
    const idxServico = 6;
    const idxFeito = 12;
    const idxTempo = 11;
    const idxEquipe = 1;
    const idxTecnico = 2;
    
    let processandoTecnico = false;
    
    for (let i = 0; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha) continue;
      
      const colB = (linha[idxEquipe] || "").toString().trim();
      const colC = (linha[idxTecnico] || "").toString().trim();
      
      if (colB === "0" && colC === tecnicoNome) {
        processandoTecnico = true;
        continue;
      }
      
      if (processandoTecnico && colB === "0" && colC && colC !== tecnicoNome && colC.length > 3) {
        processandoTecnico = false;
        break;
      }
      
      if (processandoTecnico) {
        let servico = (linha[idxServico] || "").toString().toUpperCase();
        let feito = (linha[idxFeito] || "").toString().toUpperCase();
        let tempoExecucao = (linha[idxTempo] || "").toString().trim();
        
        const feitoNormalizado = Utils.normalizarTexto(feito);
        const isRetirada = TIPOS_RETIRADA.some((tipo) => {
          const tipoNormalizado = Utils.normalizarTexto(tipo);
          return feitoNormalizado === tipoNormalizado;
        });
        
        const temHorarioValidoFlag = Utils.temHorarioValido(tempoExecucao);
        
        if (isRetirada && !temHorarioValidoFlag) {
          let motivo = feito;
          if (motivo && motivo.trim()) {
            justificativas.push({
              texto: motivo,
              tipo: "adicional",
              tempoExecucaoOriginal: tempoExecucao,
              categoria: feitoNormalizado === "RV" || feitoNormalizado === "RC" ? "remarcacao" : "outros",
            });
          }
        }
      }
    }
    
    return justificativas;
  }
};