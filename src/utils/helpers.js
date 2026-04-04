export const Utils = {
    normalizarTexto(texto) {
        return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .toUpperCase()
        .trim();
    },

    formatarData(dataISO) {
        if (!dataISO) return "";
        const partes = dataISO.split("-");
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    },

    formatarDataParaAba(dataISO) {
        if (!dataISO) return "";
        const partes = dataISO.split("-");
        return `${partes[2]}/${partes[1]}`;
    },

    formatarTempo(minutos, jornada = "Comercial") {
        if (jornada === "12/36") {
            const fator = 8 / 12;
            minutos = Math.round(minutos * fator);
            if (minutos === 0 && (minutos * 12) / 8 > 0) minutos = 1;
        }
        if (minutos === 0) return "";
        let horas = Math.floor(minutos / 60);
        let mins = minutos % 60;
        let partes = [];
        if (horas === 1) partes.push("1 hora");
        else if (horas > 1) partes.push(horas + " horas");
        if (mins === 1) partes.push("1 minuto");
        else if (mins > 1) partes.push(mins + " minutos");
        return partes.join(" e ");
    },

    calcularMinutos(inicio, fim) {
        if (!inicio || !fim) return null;
        const [h1, m1] = inicio.split(":").map(Number);
        const [h2, m2] = fim.split(":").map(Number);
        if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
        const minutosInicio = h1 * 60 + m1;
        const minutosFim = h2 * 60 + m2;
        if (minutosFim <= minutosInicio) return null;
        return minutosFim - minutosInicio;
    },

    minutosParaHoraMinutos(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    },

    obterRegionalPorTecnico(tecnicoNome, regionais) {
        for (let regional in regionais) {
            if (regionais[regional] && regionais[regional].includes(tecnicoNome)) return regional;
        }
        return "Regional não informada";
    },

    temHorarioValido(texto) {
        if (!texto || texto === "" || texto === "0") return false;
        texto = String(texto).trim();
        const padraoHorario = /(\d{1,2}:\d{2})/;
        if (padraoHorario.test(texto)) return true;
        const padraoMinutos = /(\d+)\s*min/i;
        if (padraoMinutos.test(texto)) return true;
        return false;
    },

    formatarData(dataISO) {
        if (!dataISO) return "";
        const partes = dataISO.split("-");
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    },
    extrairHorarios(texto) {
        if (!texto || texto === "") return null;
        texto = String(texto).trim();

        if (/[a-zA-Z]/.test(texto) && !/(\d{1,2}:\d{2})/.test(texto) && !/(\d+)\s*min/i.test(texto)) return null;

        const padraoComAcento = /(\d{1,2}:\d{2})\s*[àaÁá]\s*(\d{1,2}:\d{2})/i;
        const padraoAs = /(\d{1,2}:\d{2})\s*as\s*(\d{1,2}:\d{2})/i;
        const padraoAte = /(\d{1,2}:\d{2})\s*at[eé]\s*(\d{1,2}:\d{2})/i;
        const padraoHifen = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;
        const padraoBarra = /(\d{1,2}:\d{2})\s*\/\s*(\d{1,2}:\d{2})/;

        let match = texto.match(padraoComAcento);
        if (match) return {inicio: match[1], fim: match[2]};
        match = texto.match(padraoAs);
        if (match) return {inicio: match[1], fim: match[2]};
        match = texto.match(padraoAte);
        if (match) return {inicio: match[1], fim: match[2]};
        match = texto.match(padraoHifen);
        if (match) return {inicio: match[1], fim: match[2]};
        match = texto.match(padraoBarra);
        if (match) return {inicio: match[1], fim: match[2]};

        const horarioUnico = texto.match(/(\d{1,2}:\d{2})/);
        if (horarioUnico) return {inicio: horarioUnico[1], fim: null};

        const minutosDir = texto.match(/(\d+)\s*min/i);
        if (minutosDir) return {minutosDiretos: parseInt(minutosDir[1])};

        return null;
    },
};
