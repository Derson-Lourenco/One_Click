// Substitua a função carregarDadosPorPeriodo por esta:
const carregarDadosPorPeriodo = async () => {
    if (!dataInicio || !dataFim) {
        Swal.fire({icon: "warning", title: "Selecione o período", text: "Informe a data inicial e final!"});
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
        title: "Carregando...",
        text: `Carregando dados do período...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
    });

    try {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const datas = [];
        const dataAtual = new Date(inicio);

        while (dataAtual <= fim) {
            datas.push(dataAtual.toISOString().split("T")[0]);
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        let todosDados = [];
        let todasRegionais = {};
        let dadosCarregados = 0;

        for (const data of datas) {
            const resposta = await carregarDadosPorData(data);
            if (resposta && resposta.dados && resposta.dados.length > 0) {
                // Adicionar a data a cada item
                const dadosComData = resposta.dados.map(item => ({
                    ...item,
                    data: data,
                    dataOriginal: data
                }));
                todosDados = [...todosDados, ...dadosComData];
                dadosCarregados++;

                const regionaisAba = PlanilhaProcessor.extrairTecnicosPorRegional(resposta.dados);
                for (const [reg, tecs] of Object.entries(regionaisAba)) {
                    if (!todasRegionais[reg]) todasRegionais[reg] = [];
                    tecs.forEach((tec) => {
                        if (!todasRegionais[reg].includes(tec)) {
                            todasRegionais[reg].push(tec);
                        }
                    });
                }
            }
        }

        if (todosDados.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "Nenhum dado encontrado",
                text: `Nenhum dado encontrado no período de ${dataInicio} a ${dataFim}`,
                timer: 3000,
            });
            setCarregando(false);
            return;
        }

        setDadosPlanilha(todosDados);
        setRegionais(todasRegionais);

        const tecnicosList = [];
        for (let regional in todasRegionais) {
            todasRegionais[regional].forEach((tec) => {
                tecnicosList.push({
                    nome: tec,
                    regional,
                    tipoTecnico: null,
                });
            });
        }
        setTecnicosPlanilha(tecnicosList);

        Swal.fire({
            icon: "success",
            title: "Dados carregados!",
            text: `${dadosCarregados} dia(s) carregados. ${tecnicosList.length} técnicos encontrados.`,
            timer: 2000,
            showConfirmButton: false,
        });
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        Swal.fire({
            icon: "error",
            title: "Erro",
            text: "Erro ao carregar dados. Verifique sua conexão.",
        });
    } finally {
        setCarregando(false);
    }
};

// Substitua a função extrairDataDoItem por esta:
const extrairDataDoItem = (item) => {
    // Primeiro tenta usar a data que adicionamos no carregamento
    if (item.data) return item.data;
    if (item.dataOriginal) return item.dataOriginal;
    
    // Tenta extrair da linha (coluna A)
    if (item.linha && item.linha[0]) {
        const dataStr = item.linha[0].toString().trim();
        const dataRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = dataStr.match(dataRegex);
        if (match) {
            return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
        }
    }
    
    return null;
};

// Substitua a função processarDadosPorData por esta:
const processarDadosPorData = (tecnicoNome, tipoTecnico) => {
    const dadosPorData = {};
    const metaMin = tipoTecnico === "Comercial" ? 10 : (tipoTecnico === "12/36" ? 12 : null);

    if (!dadosPlanilha) return [];

    for (const item of dadosPlanilha) {
        if (item.isTecnico) continue;
        if (item.tecnico === tecnicoNome) {
            const dataItem = extrairDataDoItem(item);
            if (!dataItem) continue;

            if (!dadosPorData[dataItem]) {
                dadosPorData[dataItem] = {
                    data: dataItem,
                    dataFormatada: Utils.formatarData(dataItem),
                    produtividade: 0,
                    execucao: 0,
                    planejamento: 0,
                    remarcacao: 0,
                    cancelamento: 0,
                    tratativasCS: 0,
                    infraestrutura: 0,
                    resolucaoN2: 0,
                    totalProtocolos: 0,
                    atingiuMeta: false,
                };
            }

            const linha = item.linha;
            if (!linha) continue;

            const idxServico = 6;
            const idxFeito = 12;
            const servicoOriginal = linha[idxServico] ? linha[idxServico].toString().trim() : "";
            const feito = linha[idxFeito] ? linha[idxFeito].toString().trim() : "";
            const feitoNormalizado = Utils.normalizarTexto(feito);

            if (feitoNormalizado === "NENHUM" || feito === "0" || feito === "-" || feito === "") continue;

            dadosPorData[dataItem].planejamento++;

            if (feitoNormalizado.includes("CANCEL")) {
                dadosPorData[dataItem].cancelamento++;
            } else if (feitoNormalizado === "RV" || feitoNormalizado === "RC") {
                dadosPorData[dataItem].remarcacao++;
            } else {
                const linhaCompleta = Utils.normalizarTexto(servicoOriginal + " " + feito);
                if (linhaCompleta.includes("TRATAT")) {
                    dadosPorData[dataItem].tratativasCS++;
                } else if (linhaCompleta.includes("INFRA")) {
                    dadosPorData[dataItem].infraestrutura++;
                } else if (linhaCompleta.includes("NIVEL 2") || linhaCompleta.includes("N2")) {
                    dadosPorData[dataItem].resolucaoN2++;
                } else if (
                    feitoNormalizado.includes("OK") ||
                    feitoNormalizado.includes("ESCALONAMENTO") ||
                    feitoNormalizado.includes("FEITO") ||
                    feitoNormalizado.includes("ENCERRAMENTO")
                ) {
                    dadosPorData[dataItem].execucao++;
                    dadosPorData[dataItem].produtividade += 1;
                }
            }

            dadosPorData[dataItem].totalProtocolos =
                dadosPorData[dataItem].planejamento +
                dadosPorData[dataItem].execucao +
                dadosPorData[dataItem].remarcacao +
                dadosPorData[dataItem].cancelamento +
                dadosPorData[dataItem].tratativasCS +
                dadosPorData[dataItem].infraestrutura +
                dadosPorData[dataItem].resolucaoN2;

            dadosPorData[dataItem].atingiuMeta = metaMin ? dadosPorData[dataItem].produtividade >= metaMin : false;
        }
    }

    return Object.values(dadosPorData).sort((a, b) => new Date(b.data) - new Date(a.data));
};