import React, {useState, useEffect} from "react";
import Swal from "sweetalert2";
import TecnicosList from "./TecnicosList";
import TecnicosSelecionados from "./TecnicosSelecionados";
import FiltroDropdown from "./FiltroDropdown";
import EquipesFavoritas from "./EquipesFavoritas";
import RelatorioResultado from "./RelatorioResultado";
import RetiradaResultado from "./RetiradaResultado";
import {Utils} from "../utils/helpers";
import {DataManager} from "../utils/dataManager";
import {PlanilhaProcessor} from "../utils/api";
import {TABELA_PESOS, SERVICOS_IGNORADOS, TIPOS_RETIRADA} from "../utils/constants";

const AbaAtivacao = ({usuarioLogado}) => {
    const [data, setData] = useState("");
    const [cidade, setCidade] = useState("");
    const [responsavel, setResponsavel] = useState("");
    const [regionais, setRegionais] = useState({});
    const [regionaisOriginal, setRegionaisOriginal] = useState({});
    const [tecnicosSelecionados, setTecnicosSelecionados] = useState([]);
    const [dadosPlanilha, setDadosPlanilha] = useState(null);
    const [buscaTermo, setBuscaTermo] = useState("");
    const [filtroAtivo, setFiltroAtivo] = useState(false);
    const [equipesFiltradas, setEquipesFiltradas] = useState([]);
    const [relatorioConteudo, setRelatorioConteudo] = useState("");
    const [retiradaConteudo, setRetiradaConteudo] = useState("");
    const [mostrarResultados, setMostrarResultados] = useState(false);
    const [equipesFavoritas, setEquipesFavoritas] = useState([]);
    const [carregando, setCarregando] = useState(false);

    // Carregar equipes favoritas do localStorage
    useEffect(() => {
        const equipes = localStorage.getItem("equipes_favoritas");
        if (equipes) {
            setEquipesFavoritas(JSON.parse(equipes));
        }
    }, []);

    // Definir data atual ao montar (apenas para exibição, não carrega dados)
    useEffect(() => {
        const hoje = new Date().toISOString().split("T")[0];
        setData(hoje);
        if (usuarioLogado) {
            setCidade(usuarioLogado.cidade || "");
            setResponsavel(usuarioLogado.nome || "");
        }
    }, [usuarioLogado]);

    // REMOVIDO: useEffect que carregava automaticamente quando a data mudava

    // Carregar filtro salvo
    useEffect(() => {
        carregarFiltroSalvo();
    }, [regionais]);

    const carregarTecnicosPorData = async (dataSelecionada) => {
        if (!dataSelecionada) {
            Swal.fire({
                icon: "warning",
                title: "Selecione uma data",
                text: "Escolha uma data antes de buscar os dados!",
                toast: true,
                timer: 2000,
            });
            return;
        }

        setCarregando(true);
        setTecnicosSelecionados([]);
        setDadosPlanilha(null);
        setRelatorioConteudo("");
        setRetiradaConteudo("");
        setMostrarResultados(false);

        try {
            const resposta = await PlanilhaProcessor.carregarDadosPorData(dataSelecionada);

            if (resposta.status === "not_found" || !resposta.dados || resposta.dados.length === 0) {
                Swal.fire({
                    icon: "warning",
                    title: "Nenhum dado encontrado",
                    text: `Nenhuma aba encontrada para ${Utils.formatarDataParaAba(dataSelecionada)}`,
                    toast: true,
                    timer: 3000,
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
            setRegionaisOriginal({...regionaisCarregadas});

            Swal.fire({
                icon: "success",
                title: "Dados carregados!",
                text: `Aba "${Utils.formatarDataParaAba(dataSelecionada)}" carregada com sucesso`,
                timer: 2000,
                showConfirmButton: false,
                toast: true,
            });
        } catch (error) {
            console.error("Erro ao carregar técnicos:", error);
            Swal.fire({
                icon: "error",
                title: "Erro",
                text: "Erro ao carregar dados. Verifique sua conexão.",
            });
        } finally {
            setCarregando(false);
        }
    };

    const toggleTecnico = (nome, regional) => {
        const index = tecnicosSelecionados.findIndex((t) => t.nome === nome && t.regional === regional);
        if (index === -1) {
            setTecnicosSelecionados([
                ...tecnicosSelecionados,
                {nome, regional, tipoEquipe: "Solo", jornada: "Comercial"},
            ]);
        } else {
            setTecnicosSelecionados(tecnicosSelecionados.filter((_, i) => i !== index));
        }
    };

    const removerTecnicoSelecionado = (nome, regional) => {
        setTecnicosSelecionados(tecnicosSelecionados.filter((t) => !(t.nome === nome && t.regional === regional)));
    };

    const atualizarTipoEquipe = (nome, regional, tipoEquipe) => {
        setTecnicosSelecionados(
            tecnicosSelecionados.map((t) => (t.nome === nome && t.regional === regional ? {...t, tipoEquipe} : t))
        );
    };

    const atualizarJornada = (nome, regional, jornada) => {
        setTecnicosSelecionados(
            tecnicosSelecionados.map((t) => (t.nome === nome && t.regional === regional ? {...t, jornada} : t))
        );
    };

    const selecionarTodosTecnicos = () => {
        const todos = [];
        for (let regional in regionais) {
            regionais[regional].forEach((tec) => {
                todos.push({nome: tec, regional, tipoEquipe: "Solo", jornada: "Comercial"});
            });
        }
        setTecnicosSelecionados(todos);
    };

    const desmarcarTodosTecnicos = () => {
        setTecnicosSelecionados([]);
    };

    const abrirModalJustificativas = async (tecnico, regional) => {
        if (!data) {
            Swal.fire({
                icon: "warning",
                title: "Selecione uma data",
                text: "Primeiro selecione a data do relatório!",
            });
            return;
        }

        const justificativas = DataManager.getJustificativasAdicionais(tecnico, data);

        const {value: novaJustificativa} = await Swal.fire({
            title: `Justificativas Adicionais - ${tecnico}`,
            html: `
        <div style="text-align: left;">
          <div style="margin-bottom: 15px;">
            <textarea id="nova-justificativa" class="swal2-textarea" placeholder="Digite uma nova justificativa..." rows="2"></textarea>
            <button id="btn-adicionar-just" class="btn-small btn-select-all" style="margin-top: 10px; width: 100%;">
              <i class="fas fa-plus"></i> Adicionar Justificativa
            </button>
          </div>
          <div id="lista-justificativas" style="max-height: 300px; overflow-y: auto;">
            ${
                justificativas.length === 0
                    ? '<p style="color: #666; text-align: center;">Nenhuma justificativa adicional cadastrada.</p>'
                    : justificativas
                      .map(
                          (just) => `
                <div class="justificativa-item-modal" data-id="${just.id}" style="background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                  <div class="justificativa-texto" style="margin-bottom: 8px;">${just.texto}</div>
                  <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn-editar-just" data-id="${just.id}" style="background: #4a6382; color: white; border: none; padding: 4px 12px; border-radius: 6px;">Editar</button>
                    <button class="btn-excluir-just" data-id="${just.id}" style="background: #9e4244; color: white; border: none; padding: 4px 12px; border-radius: 6px;">Excluir</button>
                  </div>
                </div>
              `
                      )
                      .join("")
            }
          </div>
        </div>
      `,
            showConfirmButton: true,
            confirmButtonText: "Fechar",
            width: "500px",
            didOpen: () => {
                const btnAdicionar = document.getElementById("btn-adicionar-just");
                if (btnAdicionar) {
                    btnAdicionar.addEventListener("click", () => {
                        const novaJust = document.getElementById("nova-justificativa")?.value.trim();
                        if (!novaJust) {
                            Swal.fire({
                                icon: "warning",
                                title: "Campo vazio",
                                text: "Digite uma justificativa!",
                                toast: true,
                                timer: 2000,
                            });
                            return;
                        }
                        DataManager.addJustificativaAdicional(tecnico, data, novaJust);
                        Swal.close();
                        setTimeout(() => abrirModalJustificativas(tecnico, regional), 100);
                    });
                }

                document.querySelectorAll(".btn-editar-just").forEach((btn) => {
                    btn.addEventListener("click", async (e) => {
                        e.stopPropagation();
                        const id = parseInt(btn.dataset.id);
                        const justItem = btn.closest(".justificativa-item-modal");
                        const textoAtual = justItem.querySelector(".justificativa-texto").innerText;
                        const {value: novoTexto} = await Swal.fire({
                            title: "Editar Justificativa",
                            input: "textarea",
                            inputLabel: "Edite o texto abaixo:",
                            inputValue: textoAtual,
                            showCancelButton: true,
                            confirmButtonText: "Salvar",
                            cancelButtonText: "Cancelar",
                            inputAttributes: {rows: 3},
                        });
                        if (novoTexto && novoTexto.trim()) {
                            DataManager.updateJustificativaAdicional(tecnico, data, id, novoTexto.trim());
                            Swal.close();
                            setTimeout(() => abrirModalJustificativas(tecnico, regional), 100);
                        }
                    });
                });

                document.querySelectorAll(".btn-excluir-just").forEach((btn) => {
                    btn.addEventListener("click", async (e) => {
                        e.stopPropagation();
                        const id = parseInt(btn.dataset.id);
                        const result = await Swal.fire({
                            title: "Confirmar exclusão",
                            text: "Deseja realmente excluir esta justificativa?",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Sim, excluir",
                            cancelButtonText: "Cancelar",
                        });
                        if (result.isConfirmed) {
                            DataManager.deleteJustificativaAdicional(tecnico, data, id);
                            Swal.close();
                            setTimeout(() => abrirModalJustificativas(tecnico, regional), 100);
                        }
                    });
                });
            },
        });
    };

    const gerarRelatorioCompleto = async () => {
        if (!data || !cidade || !responsavel) {
            Swal.fire({
                icon: "warning",
                title: "Campos obrigatórios",
                text: "Preencha Data, Cidade e Responsável!",
            });
            return;
        }

        if (tecnicosSelecionados.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Nenhum técnico selecionado",
                text: "Selecione pelo menos um técnico da lista!",
            });
            return;
        }

        if (!dadosPlanilha) {
            Swal.fire({
                icon: "warning",
                title: "Dados não carregados",
                text: 'Clique em "Buscar Dados" primeiro para carregar os dados da data selecionada!',
            });
            return;
        }

        Swal.fire({
            title: "Processando...",
            text: `Calculando retiradas e relatório para ${tecnicosSelecionados.length} técnico(s)`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        let relatorio = `RELATÓRIO DE ATIVAÇÃO – ${Utils.formatarData(
            data
        )} - ${cidade}\nResponsável: ${responsavel}\nNúmero de Equipes: ${tecnicosSelecionados.length}\n\n`;
        let retiradaTexto = "";
        let totalRetiradaGeral = 0;

        for (const tecnicoObj of tecnicosSelecionados) {
            const tecnico = tecnicoObj.nome;
            const regional = tecnicoObj.regional;
            const tipoEquipe = tecnicoObj.tipoEquipe || "Solo";
            const jornada = tecnicoObj.jornada || "Comercial";

            const metricas = PlanilhaProcessor.processarDadosTecnicoPorRegional(dadosPlanilha, tecnico, regional, {
                TABELA_PESOS,
                SERVICOS_IGNORADOS,
                Utils,
            });

            const retiradas = PlanilhaProcessor.processarRetiradasDoTecnico(dadosPlanilha, tecnico, {
                Utils,
                TIPOS_RETIRADA,
            });

            const justificativasAdicionaisPlanilha = PlanilhaProcessor.processarJustificativasAdicionaisDoTecnico(
                dadosPlanilha,
                tecnico,
                {Utils, TIPOS_RETIRADA}
            );

            if (justificativasAdicionaisPlanilha.length > 0) {
                DataManager.addJustificativasAdicionaisBatch(tecnico, data, justificativasAdicionaisPlanilha);
            }

            let totalMinutosTecnico = 0;
            retiradas.forEach((ret) => {
                totalMinutosTecnico += ret.minutos;
            });

            // SÓ ADICIONA AO RELATÓRIO DE RETIRADA SE TIVER TEMPO > 0
            if (totalMinutosTecnico > 0) {
                retiradaTexto += `Retirada De Tempo\n\n`;
                retiradaTexto += `Data: ${Utils.formatarData(data)}\n`;
                retiradaTexto += `Técnico: ${tecnico}\n`;
                retiradaTexto += `Regional: ${regional}\n`;
                retiradaTexto += `Carga Horária: ${jornada}\n`;
                retiradaTexto += `Tipo de Equipe: ${tipoEquipe}\n`;
                retiradaTexto += `Tempo a Retirar: ${Utils.formatarTempo(totalMinutosTecnico, jornada)}\n\n`;

                retiradas.forEach((ret) => {
                    const minutosOriginais = ret.minutos;
                    let minutosAjustados = minutosOriginais;
                    let tempoConvertido = "";

                    if (jornada === "12/36") {
                        minutosAjustados = Math.round((minutosOriginais * 8) / 12);
                        if (minutosAjustados === 0 && minutosOriginais > 0) minutosAjustados = 1;
                        tempoConvertido = Utils.formatarTempo(minutosAjustados, "Comercial");
                        retiradaTexto += `Tempo: ${tempoConvertido} ( referente a ${Utils.formatarTempo(
                            minutosOriginais,
                            "Comercial"
                        )} )\n`;
                    } else {
                        tempoConvertido = Utils.formatarTempo(minutosOriginais, "Comercial");
                        retiradaTexto += `Tempo: ${tempoConvertido}\n`;
                    }
                    retiradaTexto += `Motivo: ${ret.motivo}\n\n`;
                    totalRetiradaGeral += minutosOriginais;

                    const existe = DataManager.registros.some(
                        (r) => r.data === data && r.tecnico === tecnico && r.inicio === ret.inicio && r.fim === ret.fim
                    );
                    if (!existe) {
                        DataManager.registros.push({
                            data,
                            tecnico,
                            regional,
                            tipoEquipe,
                            jornada,
                            inicio: ret.inicio,
                            fim: ret.fim,
                            motivo: ret.motivo,
                            minutos: minutosOriginais,
                            isDiaTodo: ret.inicio === "00:00" && ret.fim === "23:59",
                            dataSalva: new Date().toISOString(),
                            fonte: "planilha",
                        });
                    }
                });

                retiradaTexto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            }

            relatorio += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            relatorio += `EQUIPE TÉCNICA: ${tecnico}\n`;
            relatorio += `REGIONAL: ${regional}\n`;
            relatorio += `TIPO DE EQUIPE: ${tipoEquipe}\n`;
            relatorio += `CARGA HORÁRIA: ${jornada}\n\n`;
            relatorio += `    • Protocolos Planejamento: ${metricas.planejamento}\n`;
            relatorio += `    • Protocolos Execução: ${metricas.execucao}\n`;
            relatorio += `    • Protocolos Remarcação: ${metricas.remarcacao}\n`;
            relatorio += `    • Protocolos Cancelamento: ${metricas.cancelamento}\n`;
            relatorio += `    • Protocolos Tratativas CS: ${metricas.tratativasCS}\n`;
            relatorio += `    • Protocolos Infraestrutura: ${metricas.infraestrutura}\n`;
            relatorio += `    • Protocolos Resolução N2: ${metricas.resolucaoN2}\n\n`;
            relatorio += `RESUMO DE ATIVIDADES:\n\n`;

            for (let tipo in metricas.mapa) {
                relatorio += `          • ${tipo}: ${metricas.mapa[tipo]}\n`;
            }

            relatorio += `\n    • Total de Serviços Executados: ${metricas.totalExecutado}\n`;
            relatorio += `    • Total de Produtividade: ${metricas.produtividade.toFixed(2).replace(".", ",")}\n\n`;

            const retiradasSalvas = DataManager.buscarRetiradasPorTecnicoData(tecnico, data);
            if (retiradasSalvas && retiradasSalvas.length > 0) {
                relatorio += `JUSTIFICATIVAS DE RETIRADA DE TEMPO:\n`;
                retiradasSalvas.forEach((ret) => {
                    relatorio += `    • ${ret.motivo}\n`;
                });
                relatorio += `\n`;
            }

            const justificativasAdicionais = DataManager.getJustificativasAdicionais(tecnico, data);
            if (justificativasAdicionais && justificativasAdicionais.length > 0) {
                relatorio += `JUSTIFICATIVAS ADICIONAIS:\n`;
                justificativasAdicionais.forEach((just) => {
                    relatorio += `    • ${just.texto}\n`;
                });
                relatorio += `\n`;
            }
        }

        DataManager.salvarLocal();
        DataManager.salvarRelatorio(data, {cidade, responsavel, data, equipes: tecnicosSelecionados});

        setRelatorioConteudo(relatorio);
        setRetiradaConteudo(retiradaTexto);
        setMostrarResultados(true);

        Swal.fire({
            icon: "success",
            title: "Processamento concluído!",
            html: `<strong>Retiradas com tempo:</strong> Total de ${Utils.formatarTempo(
                totalRetiradaGeral,
                "Comercial"
            )}<br>
             <strong>Justificativas adicionais:</strong> Processadas e adicionadas ao relatório<br>
             <strong>Relatório:</strong> ${tecnicosSelecionados.length} técnico(s) processados`,
            timer: 5000,
            showConfirmButton: false,
        });
    };

    // Filtro
    const ativarFiltro = () => {
        if (tecnicosSelecionados.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Nenhum técnico selecionado",
                text: "Selecione os técnicos que deseja filtrar antes de ativar o filtro!",
                toast: true,
                timer: 2000,
            });
            return;
        }

        setEquipesFiltradas([...tecnicosSelecionados]);
        setFiltroAtivo(true);
        aplicarFiltroNaLista(tecnicosSelecionados);

        Swal.fire({
            icon: "success",
            title: "Filtro ativado!",
            text: `${tecnicosSelecionados.length} técnico(s) filtrados.`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
        });
    };

    const desativarFiltro = () => {
        setFiltroAtivo(false);
        setEquipesFiltradas([]);
        setRegionais({...regionaisOriginal});

        Swal.fire({
            icon: "info",
            title: "Filtro desativado",
            text: "Todos os técnicos estão visíveis novamente.",
            timer: 2000,
            showConfirmButton: false,
            toast: true,
        });
    };

    const excluirFiltro = () => {
        setFiltroAtivo(false);
        setEquipesFiltradas([]);
        setRegionais({...regionaisOriginal});

        Swal.fire({
            icon: "success",
            title: "Filtro excluído!",
            text: "Todos os técnicos estão visíveis novamente.",
            timer: 2000,
            showConfirmButton: false,
            toast: true,
        });
    };

    const editarFiltro = () => {
        Swal.fire({
            icon: "info",
            title: "Em desenvolvimento",
            text: "Funcionalidade de edição de filtro em breve.",
        });
    };

    const aplicarFiltroNaLista = (tecnicosFiltrados) => {
        if (!tecnicosFiltrados || tecnicosFiltrados.length === 0) return;

        const regionaisFiltradas = {};
        tecnicosFiltrados.forEach((tec) => {
            if (!regionaisFiltradas[tec.regional]) regionaisFiltradas[tec.regional] = [];
            regionaisFiltradas[tec.regional].push(tec.nome);
        });

        setRegionais(regionaisFiltradas);
    };

    const carregarFiltroSalvo = () => {
        const filtroSalvo = localStorage.getItem("filtro_equipes_ativacao");
        if (filtroSalvo && regionaisOriginal && Object.keys(regionaisOriginal).length > 0) {
            try {
                const dados = JSON.parse(filtroSalvo);
                if (dados.ativo && dados.equipes?.length > 0) {
                    setFiltroAtivo(true);
                    setEquipesFiltradas(dados.equipes);
                    aplicarFiltroNaLista(dados.equipes);
                } else if (dados.ultimaSelecao?.length > 0) {
                    setTecnicosSelecionados(dados.ultimaSelecao);
                }
            } catch (e) {
                console.error("Erro ao carregar filtro salvo:", e);
            }
        }
    };

    // Equipes favoritas
    const salvarEquipeFavorita = () => {
        if (tecnicosSelecionados.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Nenhum técnico selecionado",
                text: "Selecione pelo menos um técnico para salvar como equipe!",
                toast: true,
                timer: 2000,
            });
            return;
        }

        Swal.fire({
            title: "Salvar Equipe",
            input: "text",
            inputLabel: "Nome da equipe",
            inputPlaceholder: "Ex: Equipe Norte",
            showCancelButton: true,
            confirmButtonText: "Salvar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value) return "Digite um nome para a equipe!";
            },
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const tecnicosParaSalvar = tecnicosSelecionados.map((tec) => ({
                    nome: tec.nome,
                    regional: tec.regional,
                }));

                const novaEquipe = {
                    id: Date.now(),
                    nome: result.value,
                    tecnicos: tecnicosParaSalvar,
                    dataCriacao: new Date().toISOString(),
                };

                const novasEquipes = [...equipesFavoritas, novaEquipe];
                setEquipesFavoritas(novasEquipes);
                localStorage.setItem("equipes_favoritas", JSON.stringify(novasEquipes));

                Swal.fire({
                    icon: "success",
                    title: "Equipe salva!",
                    text: `"${novaEquipe.nome}" foi adicionada aos favoritos`,
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                });
            }
        });
    };

    const aplicarEquipeFavorita = (equipeId) => {
        const equipe = equipesFavoritas.find((e) => e.id === equipeId);
        if (!equipe) return;

        const tecnicos = equipe.tecnicos.map((tec) => ({
            ...tec,
            tipoEquipe: "Solo",
            jornada: "Comercial",
        }));

        setTecnicosSelecionados(tecnicos);

        Swal.fire({
            icon: "success",
            title: "Filtro aplicado!",
            text: `Equipe "${equipe.nome}" carregada com ${equipe.tecnicos.length} técnico(s)`,
            timer: 2000,
            showConfirmButton: false,
            toast: true,
        });
    };

    const removerEquipeFavorita = (equipeId) => {
        Swal.fire({
            title: "Remover equipe",
            text: "Deseja realmente remover esta equipe dos favoritos?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc3545",
            confirmButtonText: "Sim, remover",
            cancelButtonText: "Cancelar",
        }).then((result) => {
            if (result.isConfirmed) {
                const novasEquipes = equipesFavoritas.filter((e) => e.id !== equipeId);
                setEquipesFavoritas(novasEquipes);
                localStorage.setItem("equipes_favoritas", JSON.stringify(novasEquipes));

                Swal.fire({
                    icon: "success",
                    title: "Equipe removida!",
                    toast: true,
                    timer: 2000,
                    showConfirmButton: false,
                });
            }
        });
    };

    return (
        <div id="aba-ativacao" className="aba-conteudo ativo">
            <div className="card">
                <div className="row">
                    <div className="col-md-4">
                        <label>
                            <i className="far fa-calendar-alt inline-icon"></i>Data
                        </label>
                        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                        <label>
                            <i className="fas fa-map-marker-alt inline-icon"></i>Cidade - Estado
                        </label>
                        <input
                            type="text"
                            placeholder="Picos - PI"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label>
                            <i className="fas fa-user-cog inline-icon"></i>Nome do Técnico Interno
                        </label>
                        <input
                            type="text"
                            placeholder="Responsável"
                            value={responsavel}
                            onChange={(e) => setResponsavel(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{marginTop: "1rem", marginBottom: "1rem", display: "flex", gap: "0.5rem"}}>
                    <button
                        type="button"
                        onClick={() => carregarTecnicosPorData(data)}
                        className="btn-primary"
                        style={{background: "#E8465D", padding: "8px 24px"}}
                        disabled={carregando}
                    >
                        <i className="fas fa-search"></i>
                        {carregando ? " Carregando..." : " Buscar Dados"}
                    </button>
                    {carregando && (
                        <span style={{marginLeft: "10px", color: "#666"}}>
                            <i className="fas fa-spinner fa-pulse"></i> Carregando...
                        </span>
                    )}
                </div>

                <hr />

                {/* Área de seleção de técnicos da planilha */}
                <div className="tecnicos-selecao-area">
                    <div className="tecnicos-header">
                        <h5>
                            <i className="fas fa-users"></i> Técnicos da Planilha
                        </h5>
                        <div className="tecnicos-actions">
                            <div className="search-tecnicos">
                                <i className="fas fa-search"></i>
                                <input
                                    type="text"
                                    placeholder="Buscar técnico..."
                                    value={buscaTermo}
                                    onChange={(e) => setBuscaTermo(e.target.value)}
                                    disabled={!regionais || Object.keys(regionais).length === 0}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={selecionarTodosTecnicos}
                                className="btn-small btn-select-all"
                                disabled={!regionais || Object.keys(regionais).length === 0}
                            >
                                <i className="fas fa-check-double"></i> Selecionar Todos
                            </button>
                            <button type="button" onClick={desmarcarTodosTecnicos} className="btn-small btn-clear">
                                <i className="fas fa-times"></i> Desmarcar Todos
                            </button>
                            <FiltroDropdown
                                regionais={regionais}
                                tecnicosSelecionados={tecnicosSelecionados}
                                onAtivarFiltro={ativarFiltro}
                                onDesativarFiltro={desativarFiltro}
                                onExcluirFiltro={excluirFiltro}
                                onEditarFiltro={editarFiltro}
                                filtroAtivo={filtroAtivo}
                                equipesFiltradas={equipesFiltradas}
                            />
                            <div className="favoritos-container">
                                <button
                                    className="btn-small btn-save-equipe"
                                    onClick={salvarEquipeFavorita}
                                    title="Salvar seleção como equipe"
                                >
                                    <i className="fas fa-save"></i>
                                </button>
                                <div className="favoritos-badges" id="favoritos-badges-ativacao">
                                    <EquipesFavoritas
                                        equipes={equipesFavoritas}
                                        onAplicarEquipe={aplicarEquipeFavorita}
                                        onRemoverEquipe={removerEquipeFavorita}
                                        aba="ativacao"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <TecnicosList
                        regionais={regionais}
                        tecnicosSelecionados={tecnicosSelecionados}
                        onToggleTecnico={toggleTecnico}
                        searchTerm={buscaTermo}
                        disabled={carregando || !regionais || Object.keys(regionais).length === 0}
                    />
                    {(!regionais || Object.keys(regionais).length === 0) && !carregando && (
                        <div style={{textAlign: "center", padding: "20px", color: "#666"}}>
                            <i className="fas fa-info-circle"></i> Nenhum dado carregado. Selecione uma data e clique em
                            "Buscar Dados".
                        </div>
                    )}
                </div>

                <hr />

                <TecnicosSelecionados
                    tecnicosSelecionados={tecnicosSelecionados}
                    onRemoveTecnico={removerTecnicoSelecionado}
                    onUpdateTipoEquipe={atualizarTipoEquipe}
                    onUpdateJornada={atualizarJornada}
                    onOpenJustificativas={abrirModalJustificativas}
                    showJustificativasButton={true}
                />

                <div className="btn-group">
                    <button onClick={gerarRelatorioCompleto} className="btn-primary" style={{background: "#E8465D"}}>
                        <i className="fas fa-chart-line"></i>
                        Gerar Relatório + Retirada de Tempo
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-load"
                        style={{background: "#4a6382"}}
                    >
                        <i className="fas fa-sync-alt"></i>
                        Recarregar Página
                    </button>
                </div>
            </div>

            {/* Container com duas colunas: Relatório e Retirada */}
            {mostrarResultados && (
                <div className="resultado-container">
                    <div className="relatorio-col">
                        <RelatorioResultado conteudo={relatorioConteudo} onCopiar={() => {}} />
                    </div>
                    <div className="retirada-col">
                        <RetiradaResultado conteudo={retiradaConteudo} onCopiar={() => {}} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AbaAtivacao;
