import React, { useEffect, useMemo, useState } from 'react';
import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconChartBar,
  IconMapPin,
  IconSearch,
} from '@tabler/icons-react';

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ChartLiraEvolucao from '../../components/Charts/ChartLiraEvolucao';
import ChartLiraPorBairro from '../../components/Charts/ChartLiraPorBairro';
import type { IndiceLira } from '../../components/Charts/ChartLiraPorBairro';
import InfoTooltip from '../../components/InfoTooltip';
import DefaultLayout from '../../layout/DefaultLayout';
import api from '../../service/api/Api';
import { ANO_PADRAO, ANOS_COM_DADOS, rotuloCiclo } from './liraCiclos';
import {
  classificarIip,
  contarBairrosEmRisco,
  formatarIndice,
  indiceMedido,
  obterMaiorIndicePredial,
  resumirIndices,
  rotuloClassificacaoIip,
} from './liraDados';
import type { ClassificacaoIip, DisponibilidadeLira, LiraData } from './liraDados';

type ViewMode = 'single' | 'comparison';

const normalizarDados = (dados: any[]): LiraData[] => dados.map((item) => ({
  ...item,
  indiceInfestacaoPredial: item.indiceInfestPredial ?? item.indiceInfestacaoPredial ?? null,
  indiceBreteau: item.indiceBreteau ?? null,
}));

const classeBadge = (classificacao: ClassificacaoIip) => ({
  satisfatorio: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  alerta: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  risco: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'sem-medicao': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}[classificacao]);

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  tooltip: string;
  icon: React.ReactNode;
  emphasis?: 'neutral' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  detail,
  tooltip,
  icon,
  emphasis = 'neutral',
}) => {
  const iconClass = {
    neutral: 'bg-primary/10 text-primary',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }[emphasis];

  return (
    <div className="rounded-lg border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span>{label}</span>
            <InfoTooltip text={tooltip} label={`O que significa ${label}`} />
          </div>
          <p className="mt-2 text-2xl font-bold text-black dark:text-white">{value}</p>
          <p className="mt-1 min-h-[20px] text-xs text-gray-500 dark:text-gray-400">{detail}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
          {icon}
        </span>
      </div>
    </div>
  );
};

const DashboardLira: React.FC = () => {
  const [disponibilidade, setDisponibilidade] = useState<DisponibilidadeLira[]>([]);
  const [year, setYear] = useState<number>(ANO_PADRAO);
  const [liraNumber, setLiraNumber] = useState<number>(1);
  const [dadosDoAno, setDadosDoAno] = useState<LiraData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [indiceSelecionado, setIndiceSelecionado] = useState<IndiceLira>('predial');
  const [buscaBairro, setBuscaBairro] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);

  useEffect(() => {
    const carregarDisponibilidade = async () => {
      setLoading(true);
      setError(null);

      try {
        let opcoes: DisponibilidadeLira[] = [];

        try {
          const response = await api.get('/lira/available');
          opcoes = (response.data as DisponibilidadeLira[])
            .filter((item) => item.ciclos?.length > 0)
            .map((item) => ({
              ano: Number(item.ano),
              ciclos: [...new Set(item.ciclos.map(Number))].sort((a, b) => a - b),
            }))
            .sort((a, b) => b.ano - a.ano);
        } catch (metadataError) {
          console.warn('Endpoint de disponibilidade do LIRA indisponível; usando compatibilidade por ano.', metadataError);
          const resultados = await Promise.allSettled(
            ANOS_COM_DADOS.map(async (ano) => {
              const response = await api.get(`/lira?ano=${ano}`);
              const ciclos = [...new Set<number>(
                response.data.map((item: any) => Number(item.liraNumber ?? 1))
              )].sort((a, b) => a - b);
              return { ano, ciclos };
            })
          );

          opcoes = resultados
            .filter((resultado): resultado is PromiseFulfilledResult<DisponibilidadeLira> => resultado.status === 'fulfilled')
            .map((resultado) => resultado.value)
            .filter((item) => item.ciclos.length > 0)
            .sort((a, b) => b.ano - a.ano);
        }

        if (opcoes.length === 0) {
          setError('Nenhum levantamento LIRA está disponível para consulta.');
          return;
        }

        const maisRecente = opcoes[0];
        setDisponibilidade(opcoes);
        setYear(maisRecente.ano);
        setLiraNumber(Math.max(...maisRecente.ciclos));
        setInitialized(true);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    carregarDisponibilidade();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const carregarAno = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/lira?ano=${year}`);
        setDadosDoAno(normalizarDados(response.data));
      } catch (err) {
        console.error(err);
        setDadosDoAno([]);
        setError('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    carregarAno();
  }, [initialized, year]);

  const ciclosDisponiveis = disponibilidade.find((item) => item.ano === year)?.ciclos ?? [];
  const dadosDoCiclo = dadosDoAno.filter((item) => (item.liraNumber ?? 1) === liraNumber);
  const estatisticas = resumirIndices(dadosDoCiclo);
  const maiorIndice = obterMaiorIndicePredial(dadosDoCiclo);
  const bairrosEmRisco = contarBairrosEmRisco(dadosDoCiclo);

  const dadosOrdenados = useMemo(() => {
    const termo = buscaBairro.trim().toLocaleLowerCase('pt-BR');
    const filtrados = dadosDoCiclo.filter((item) =>
      !termo || item.bairro.toLocaleLowerCase('pt-BR').includes(termo)
    );
    const obterValor = (item: LiraData) => indiceSelecionado === 'predial'
      ? item.indiceInfestacaoPredial
      : item.indiceBreteau;

    return [...filtrados].sort((a, b) => {
      const valorA = obterValor(a);
      const valorB = obterValor(b);
      if (!indiceMedido(valorA)) return 1;
      if (!indiceMedido(valorB)) return -1;
      return valorB - valorA;
    });
  }, [buscaBairro, dadosDoCiclo, indiceSelecionado]);

  const dadosGrafico = mostrarTodos ? dadosOrdenados : dadosOrdenados.slice(0, 10);

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const novoAno = Number(event.target.value);
    const ciclos = disponibilidade.find((item) => item.ano === novoAno)?.ciclos ?? [];
    setYear(novoAno);
    setLiraNumber(ciclos.length ? Math.max(...ciclos) : 1);
    setBuscaBairro('');
    setMostrarTodos(false);
  };

  const tentarNovamente = () => {
    if (!initialized) {
      window.location.reload();
      return;
    }
    setInitialized(false);
    setTimeout(() => setInitialized(true), 0);
  };

  return (
    <DefaultLayout>
      <Breadcrumb pageName="Análise LIRA" />
      <div className="flex flex-col gap-6">
        <section className="sticky top-[60px] z-99 rounded-lg border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-black dark:text-white">Situação do LIRA</h1>
                <InfoTooltip text="O LIRA é o Levantamento de Índice Rápido do Aedes aegypti. Ele ajuda a identificar e priorizar áreas com maior infestação do mosquito." />
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Consulte prioridades por bairro e acompanhe a evolução dos ciclos.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full sm:w-36">
                <label htmlFor="lira-ano" className="mb-2 block text-sm font-medium text-black dark:text-white">Ano</label>
                <select
                  id="lira-ano"
                  value={year}
                  onChange={handleYearChange}
                  disabled={disponibilidade.length === 0}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-2.5 text-black outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark dark:bg-form-input dark:text-white"
                >
                  {disponibilidade.map((item) => <option key={item.ano} value={item.ano}>{item.ano}</option>)}
                </select>
              </div>

              {viewMode === 'single' && (
                <div className="w-full sm:w-44">
                  <label htmlFor="lira-ciclo" className="mb-2 block text-sm font-medium text-black dark:text-white">Ciclo</label>
                  <select
                    id="lira-ciclo"
                    value={liraNumber}
                    onChange={(event) => {
                      setLiraNumber(Number(event.target.value));
                      setBuscaBairro('');
                      setMostrarTodos(false);
                    }}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-2.5 text-black outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  >
                    {ciclosDisponiveis.map((ciclo) => <option key={ciclo} value={ciclo}>{rotuloCiclo(ciclo)}</option>)}
                  </select>
                </div>
              )}

              <div className="flex rounded-lg border border-stroke p-1 dark:border-strokedark" role="tablist" aria-label="Modo de visualização">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'single'}
                  onClick={() => setViewMode('single')}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${viewMode === 'single' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                >
                  Por ciclo
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'comparison'}
                  onClick={() => setViewMode('comparison')}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition ${viewMode === 'comparison' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                >
                  Comparar ciclos
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Carregando dados...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-white p-8 text-center dark:border-red-900/50 dark:bg-boxdark">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300">
              <IconAlertTriangle size={32} />
            </span>
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">{error}</p>
              <button type="button" onClick={tentarNovamente} className="mt-3 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
                Tentar novamente
              </button>
            </div>
          </div>
        ) : viewMode === 'single' ? (
          <>
            {bairrosEmRisco > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200" role="status">
                <IconAlertTriangle className="mt-0.5 shrink-0" size={22} />
                <div>
                  <p className="font-semibold">{bairrosEmRisco} {bairrosEmRisco === 1 ? 'bairro está' : 'bairros estão'} na faixa de risco</p>
                  <p className="mt-1 text-sm">Priorize a análise dos bairros com IIP igual ou superior a 4%.</p>
                </div>
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do ciclo">
              <StatCard
                label="Bairros analisados"
                value={String(new Set(dadosDoCiclo.map((item) => item.bairro)).size)}
                detail={`Ciclo ${liraNumber} de ${year}`}
                tooltip="Quantidade de bairros presentes no levantamento selecionado."
                icon={<IconBuildingCommunity size={23} />}
              />
              <StatCard
                label="Bairros em risco"
                value={String(bairrosEmRisco)}
                detail="IIP igual ou superior a 4%"
                tooltip="Segundo a classificação do Ministério da Saúde, IIP a partir de 4% indica situação de risco."
                icon={<IconAlertTriangle size={23} />}
                emphasis={bairrosEmRisco > 0 ? 'danger' : 'neutral'}
              />
              <StatCard
                label="Maior IIP"
                value={formatarIndice(maiorIndice?.indiceInfestacaoPredial ?? null, true)}
                detail={maiorIndice?.bairro ?? 'Sem bairro identificado'}
                tooltip="Maior percentual de imóveis com presença do mosquito entre os bairros medidos neste ciclo."
                icon={<IconMapPin size={23} />}
                emphasis={classificarIip(maiorIndice?.indiceInfestacaoPredial) === 'risco' ? 'danger' : 'warning'}
              />
              <StatCard
                label="IIP médio"
                value={formatarIndice(estatisticas.mediaPredial, true)}
                detail="Média dos bairros com medição"
                tooltip="Média do Índice de Infestação Predial. Valores não informados não entram no cálculo."
                icon={<IconChartBar size={23} />}
              />
            </section>

            <section className="rounded-lg border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                      {indiceSelecionado === 'predial'
                        ? 'Prioridade por bairro — IIP'
                        : 'Índice de Breteau por bairro'}
                    </h2>
                    <InfoTooltip
                      text={indiceSelecionado === 'predial'
                        ? 'Os bairros são ordenados do maior para o menor IIP. Verde indica situação satisfatória, amarelo indica alerta e vermelho indica risco.'
                        : 'Os bairros são ordenados do maior para o menor Índice de Breteau. Esse índice relaciona a quantidade de recipientes positivos para larvas com cada 100 imóveis pesquisados. As faixas de risco do IIP não são aplicadas ao Breteau.'}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {indiceSelecionado === 'predial'
                      ? `Ranking de prioridade do Ciclo ${liraNumber} de ${year}`
                      : `Ranking do Índice de Breteau no Ciclo ${liraNumber} de ${year}`}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative min-w-[220px]">
                    <label htmlFor="busca-bairro" className="sr-only">Buscar bairro</label>
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="busca-bairro"
                      type="search"
                      value={buscaBairro}
                      onChange={(event) => setBuscaBairro(event.target.value)}
                      placeholder="Buscar bairro"
                      className="w-full rounded border border-stroke bg-transparent py-2.5 pl-10 pr-4 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-strokedark dark:text-white"
                    />
                  </div>
                  <div className="flex rounded-lg border border-stroke p-1 dark:border-strokedark" aria-label="Índice exibido">
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        aria-describedby="tooltip-metrica-iip"
                        onClick={() => setIndiceSelecionado('predial')}
                        className={`rounded-md px-3 py-2 text-sm font-medium ${indiceSelecionado === 'predial' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}
                      >
                        IIP
                      </button>
                      <span
                        id="tooltip-metrica-iip"
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-[1000] mb-2 w-64 -translate-x-1/2 rounded-md bg-black px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-700"
                      >
                        Índice de Infestação Predial: percentual de imóveis pesquisados em que foi encontrada presença de Aedes aegypti.
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-gray-700" />
                      </span>
                    </span>
                    <span className="group relative inline-flex">
                      <button
                        type="button"
                        aria-describedby="tooltip-metrica-breteau"
                        onClick={() => setIndiceSelecionado('breteau')}
                        className={`rounded-md px-3 py-2 text-sm font-medium ${indiceSelecionado === 'breteau' ? 'bg-primary text-white' : 'text-gray-600 dark:text-gray-300'}`}
                      >
                        Breteau
                      </button>
                      <span
                        id="tooltip-metrica-breteau"
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full right-0 z-[1000] mb-2 w-72 rounded-md bg-black px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-700"
                      >
                        Índice de Breteau: quantidade de recipientes positivos para larvas de Aedes aegypti encontrada a cada 100 imóveis pesquisados.
                        <span className="absolute right-5 top-full border-4 border-transparent border-t-black dark:border-t-gray-700" />
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {indiceSelecionado === 'predial' && (
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Classificação do IIP:</span>
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-600" />Satisfatório: abaixo de 1%</span>
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />Alerta: de 1% a 3,9%</span>
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />Risco: a partir de 4%</span>
                </div>
              )}

              <div className="mt-5">
                <ChartLiraPorBairro data={dadosGrafico} indice={indiceSelecionado} />
              </div>

              {dadosOrdenados.length > 10 && (
                <div className="mt-4 text-center">
                  <button type="button" onClick={() => setMostrarTodos((valor) => !valor)} className="rounded border border-primary px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-white">
                    {mostrarTodos ? 'Mostrar somente os 10 primeiros' : `Ver todos os ${dadosOrdenados.length} bairros`}
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-5 py-4 dark:border-strokedark sm:px-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-black dark:text-white">Detalhamento dos bairros</h2>
                  <InfoTooltip text="A tabela oferece uma alternativa textual ao gráfico e permite consultar os dois índices de cada bairro." />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Posição</th>
                      <th className="px-5 py-3 font-semibold">Bairro</th>
                      <th className="px-5 py-3 font-semibold">IIP</th>
                      <th className="px-5 py-3 font-semibold">Situação</th>
                      <th className="px-5 py-3 font-semibold">Índice de Breteau</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {dadosOrdenados.map((item, index) => {
                      const classificacao = classificarIip(item.indiceInfestacaoPredial);
                      return (
                        <tr key={`${item.bairro}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{index + 1}º</td>
                          <td className="px-5 py-3 font-medium text-black dark:text-white">{item.bairro}</td>
                          <td className="px-5 py-3 text-black dark:text-white">{formatarIndice(item.indiceInfestacaoPredial, true)}</td>
                          <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classeBadge(classificacao)}`}>{rotuloClassificacaoIip(classificacao)}</span></td>
                          <td className="px-5 py-3 text-black dark:text-white">{formatarIndice(item.indiceBreteau)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="rounded-lg border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-black dark:text-white">Evolução do IIP médio em {year}</h2>
                <InfoTooltip text="Mostra a média do Índice de Infestação Predial em cada ciclo que possui dados. Valores não informados não entram no cálculo." />
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Acompanhe se a infestação média aumentou ou diminuiu entre os levantamentos.</p>
              <div className="mt-5">
                <ChartLiraEvolucao data={dadosDoAno} ciclos={ciclosDisponiveis} />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Resumo por ciclo">
              {ciclosDisponiveis.map((ciclo) => {
                const dados = dadosDoAno.filter((item) => (item.liraNumber ?? 1) === ciclo);
                const resumo = resumirIndices(dados);
                const risco = contarBairrosEmRisco(dados);
                return (
                  <article key={ciclo} className="rounded-lg border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-black dark:text-white">Ciclo {ciclo}</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Set(dados.map((item) => item.bairro)).size} bairros analisados</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${risco > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                        {risco} em risco
                      </span>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">IIP médio</dt>
                        <dd className="mt-1 text-lg font-bold text-black dark:text-white">{formatarIndice(resumo.mediaPredial, true)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Maior IIP</dt>
                        <dd className="mt-1 text-lg font-bold text-black dark:text-white">{formatarIndice(resumo.maxPredial, true)}</dd>
                      </div>
                    </dl>
                    <button type="button" onClick={() => { setLiraNumber(ciclo); setViewMode('single'); }} className="mt-5 text-sm font-medium text-primary hover:underline">
                      Ver bairros deste ciclo
                    </button>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </DefaultLayout>
  );
};

export default DashboardLira;
