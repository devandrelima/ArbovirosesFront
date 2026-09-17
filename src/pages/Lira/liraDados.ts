export interface LiraData {
  bairro: string;
  indiceInfestacaoPredial: number | null;
  indiceBreteau: number | null;
  liraNumber?: number;
  ano?: number;
}

export type ClassificacaoIip = 'satisfatorio' | 'alerta' | 'risco' | 'sem-medicao';

export interface DisponibilidadeLira {
  ano: number;
  ciclos: number[];
}

export interface FaixasIip {
  limiteAlerta: number;
  limiteRisco: number;
}

export interface ParametrosLira extends FaixasIip {
  ano: number;
  liraNumber: number;
}

export const FAIXAS_IIP_PADRAO: FaixasIip = {
  limiteAlerta: 1,
  limiteRisco: 4,
};

export const indiceMedido = (valor: number | null | undefined): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor);

export const resumirIndices = (dados: LiraData[]) => {
  const prediais = dados.map((d) => d.indiceInfestacaoPredial).filter(indiceMedido);
  const breteau = dados.map((d) => d.indiceBreteau).filter(indiceMedido);
  return {
    mediaPredial: prediais.length
      ? prediais.reduce((soma, indice) => soma + indice, 0) / prediais.length
      : null,
    maxPredial: prediais.length ? Math.max(...prediais) : null,
    maxBreteau: breteau.length ? Math.max(...breteau) : null,
  };
};

export const formatarIndice = (valor: number | null, percentual = false) =>
  indiceMedido(valor)
    ? `${new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(valor)}${percentual ? '%' : ''}`
    : 'Dado não informado';

export const classificarIip = (
  valor: number | null | undefined,
  faixas: FaixasIip = FAIXAS_IIP_PADRAO,
): ClassificacaoIip => {
  if (!indiceMedido(valor)) return 'sem-medicao';
  if (valor < faixas.limiteAlerta) return 'satisfatorio';
  if (valor < faixas.limiteRisco) return 'alerta';
  return 'risco';
};

export const rotuloClassificacaoIip = (classificacao: ClassificacaoIip) => ({
  satisfatorio: 'Satisfatório',
  alerta: 'Alerta',
  risco: 'Risco',
  'sem-medicao': 'Dado não informado',
}[classificacao]);

export const corClassificacaoIip = (classificacao: ClassificacaoIip) => ({
  satisfatorio: '#16a34a',
  alerta: '#d97706',
  risco: '#dc2626',
  'sem-medicao': '#94a3b8',
}[classificacao]);

export const contarBairrosEmRisco = (
  dados: LiraData[],
  faixas: FaixasIip = FAIXAS_IIP_PADRAO,
) => dados.filter((dado) =>
  classificarIip(dado.indiceInfestacaoPredial, faixas) === 'risco'
).length;

export const formatarLimiteIip = (valor: number) =>
  Number.isFinite(valor) ? `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)}%` : '—';

export const obterMaiorIndicePredial = (dados: LiraData[]) =>
  dados.reduce<LiraData | null>((maior, atual) => {
    if (!indiceMedido(atual.indiceInfestacaoPredial)) return maior;
    if (!maior || !indiceMedido(maior.indiceInfestacaoPredial)) return atual;
    return atual.indiceInfestacaoPredial > maior.indiceInfestacaoPredial ? atual : maior;
  }, null);

export const mediaIndicePredial = (dados: LiraData[]) => resumirIndices(dados).mediaPredial;
