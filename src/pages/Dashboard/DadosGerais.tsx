import React, { useEffect, useState } from 'react';
import AgravoLineChart from '../../components/Charts/AgravoLineChart';
import DefaultLayout from '../../layout/DefaultLayout';
import DonutChart from '../../components/Charts/DonutChart';
import { ApexOptions } from 'apexcharts';
import ColumnGraphic from '../../components/Charts/ColumnGraphic';
import { countByEpidemiologicalWeekOptions, mountAgravoLineData } from '../../service/components/EpidemiologicalWeek';
import { countBySexoOptions, mountDonutCountBySexo } from '../../service/components/CountBySexo';
import { countByAgeRangeOptions, mountColumnCountByAgeRange } from '../../service/components/CountByAgeRange';
import YearSelector from '../../components/Forms/SelectGroup/YearSelector';
import AgravoSelector from '../../components/Forms/SelectGroup/AgravoSelector';
import DengueTypeSelector from '../../components/Forms/SelectGroup/DengueTypeSelector';
import DashboardScopeSelector from '../../components/Forms/SelectGroup/DashboardScopeSelector';
import AgravoAccumulatedLineChart from '../../components/Charts/AgravoAccumulatedLineChart';
import { countByEpidemiologicalWeekAccumulatedOptions, mountAgravoLineAccumulatedData } from '../../service/components/EpidemiologicalWeekAccumulated';
import { CountCard } from '../../components/Cards/CountCard';
import { affectedNeighborhoodCount } from '../../service/components/affectedNeighborhoodCount';
import { notificationsCountData } from '../../service/components/notificationsCount';
import BaseTable from '../../components/Tables/BaseTable';
import { mountNeighborhoodData } from '../../service/components/NeighborhoodInfoTable';
import { NeighborhoodInfo } from '../../components/Entity/NeighborhoodInfo';
import { downloadNeighborhoodWeeklyPdfReport } from '../../service/components/NeighborhoodWeeklyPdfReport';
import BairroSelector from '../../components/Forms/SelectGroup/BairroSelector';
import { useNavigate } from 'react-router-dom';

import { DashboardScope } from '../../service/components/dashboardQueryParams';
import getApiData from '../../service/api/fetchApiData';

const lineChartOptionsByEpidemiologicalWeek: ApexOptions = countByEpidemiologicalWeekOptions();
const lineChartOptionsByEpidemiologicalWeekAccumulated: ApexOptions = countByEpidemiologicalWeekAccumulatedOptions();
const donutChartOptionsbySexo: ApexOptions = countBySexoOptions();
const columnGraphicOptions: ApexOptions = countByAgeRangeOptions();

const App: React.FC = () => {
  const navigate = useNavigate();
  const [agravoLineSeries, setAgravoLineSeries] = useState<any>([])
  const [agravoLineAccumulatedSeries, setAgravoLineAccumulatedSeries] = useState<any>([])
  const [countBySexoSeries, setCountBySexoSeries] = useState<any>([])
  const [ageRangeCategories, setAgeRangeCategories] = useState<any>([])
  const [affectedNeighborhoods, setAffectedNeighborhoods] = useState<any>(0)
  const [notificationsCount, setNotificationsCount] = useState<any>(0)
  const [neighborhoodApiData, setNeighborhoodApiData] = useState<NeighborhoodInfo[]>([])
  const [minYear, setMinYear] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const [hasLoaded, setHasLoaded] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [initialWeek, setInitialWeek] = useState<string>('')
  const [finalWeek, setFinalWeek] = useState<string>('')
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false)
  const DENGUE_SUBTIPOS = ['dengue_classica', 'dengue_alarmante', 'dengue_grave'];
  const [agravoBase, setAgravoBase] = useState<string>(() => {
    const savedAgravo = localStorage.getItem('agravoSelected') || '';
    return ['zika', 'chikungunya'].includes(savedAgravo) ? savedAgravo : 'dengue';
  });
  const [dengueType, setDengueType] = useState<string>(() => {
    const savedAgravo = localStorage.getItem('agravoSelected') || '';
    const savedScope = localStorage.getItem('dashboardScopeSelected');
    if (DENGUE_SUBTIPOS.includes(savedAgravo)) return savedAgravo;
    // "Total Notificados"/"Total Confirmados" enviam `dengue` puro; o escopo salvo desambigua.
    return savedScope === 'confirmados' ? 'dengue_total_confirmados' : 'dengue_total_notificados';
  });
  const [yearSelected, setYearSelected] = useState<string>(() => {
    return localStorage.getItem('yearSelected') || new Date().getFullYear().toString();
  });

    const bairrosDisponiveis = (neighborhoodApiData ?? [])
    .map((n) => n.nomeBairro)
    .filter(Boolean)
    .sort();

  const handleBairroChange = (bairro: string) => {
    if (bairro) {
      navigate('/dashboard/bairro', { 
        state: { 
          bairro,
          bairros: bairrosDisponiveis
        } 
      });
    }
  };
  const [scopeSelected, setScopeSelected] = useState<DashboardScope>(() => {
    const savedScope = localStorage.getItem('dashboardScopeSelected');
    return savedScope === 'confirmados' || savedScope === 'obitos' ? savedScope : 'notificados';
  });

  // "Total Notificados" e "Total Confirmados" enviam `dengue` puro (sem filtro de
  // classificação); quem define a abrangência é o escopo. Sob "Casos confirmados"
  // (= classificacao IN 10,11,12,13) isso dá a soma das dengues confirmadas.
  // Os subtipos específicos mantêm seu próprio filtro de classificação.
  const agravoEfetivo = agravoBase === 'dengue'
    ? (DENGUE_SUBTIPOS.includes(dengueType) ? dengueType : 'dengue')
    : agravoBase;

  const handleDengueTypeChange = (novoTipo: string) => {
    setDengueType(novoTipo);
    setScopeSelected(novoTipo === 'dengue_total_notificados' ? 'notificados' : 'confirmados');
  };

  const handleScopeChange = (novoScope: DashboardScope) => {
    setScopeSelected(novoScope);
    if (novoScope === 'notificados' || novoScope === 'obitos') {
      setDengueType('dengue_total_notificados');
    } else if (novoScope === 'confirmados' && dengueType === 'dengue_total_notificados') {
      setDengueType('dengue_total_confirmados');
    }
  };
  
  useEffect(() => {
    getApiData('/notifications/min-year')
      .then(data => { if (data != null) setMinYear(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.allSettled([
          mountAgravoLineData(setAgravoLineSeries, yearSelected, agravoEfetivo, undefined, scopeSelected),
          mountAgravoLineAccumulatedData(setAgravoLineAccumulatedSeries, yearSelected, agravoEfetivo, undefined, scopeSelected),
          mountDonutCountBySexo(setCountBySexoSeries, yearSelected, agravoEfetivo, undefined, scopeSelected),
          mountColumnCountByAgeRange(setAgeRangeCategories, yearSelected, agravoEfetivo, undefined, scopeSelected),
          mountNeighborhoodData(setNeighborhoodApiData, yearSelected, agravoEfetivo, scopeSelected),
          affectedNeighborhoodCount(setAffectedNeighborhoods, yearSelected, agravoEfetivo, scopeSelected),
          notificationsCountData(setNotificationsCount, yearSelected, agravoEfetivo, undefined, scopeSelected),
        ]);

        localStorage.setItem('yearSelected', yearSelected);
        localStorage.setItem('agravoSelected', agravoEfetivo);
        localStorage.setItem('dashboardScopeSelected', scopeSelected);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Não foi possível carregar os dados. Por favor, tente novamente.');
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    };

    loadData();
  }, [yearSelected, agravoEfetivo, scopeSelected])

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  const handleDownloadNeighborhoodReport = async () => {
    setDownloadError(null);
    setDownloadSuccess(null);

    const normalizedInitialWeek = initialWeek.trim();
    const normalizedFinalWeek = finalWeek.trim();

    if (!normalizedInitialWeek || !normalizedFinalWeek) {
      setDownloadError('Informe a semana inicial e a semana final para gerar o relatório.');
      return;
    }

    const parsedInitial = Number(normalizedInitialWeek);
    const parsedFinal = Number(normalizedFinalWeek);

    if (!Number.isInteger(parsedInitial) || parsedInitial < 1) {
      setDownloadError('A semana inicial precisa ser um número inteiro maior ou igual a 1.');
      return;
    }

    if (!Number.isInteger(parsedFinal) || parsedFinal < 1) {
      setDownloadError('A semana final precisa ser um número inteiro maior ou igual a 1.');
      return;
    }

    if (parsedInitial > parsedFinal) {
      setDownloadError('A semana inicial não pode ser maior que a semana final.');
      return;
    }

    setDownloadingPdf(true);

    try {
      await downloadNeighborhoodWeeklyPdfReport({
        yearSelected,
        agravoSelected: agravoEfetivo,
        initialWeek: normalizedInitialWeek,
        finalWeek: normalizedFinalWeek,
        scopeSelected,
      });

      setDownloadSuccess(`Relatório em PDF das semanas ${normalizedInitialWeek} a ${normalizedFinalWeek} gerado com sucesso.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível gerar o relatório PDF.';
      setDownloadError(message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading && !hasLoaded) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            <p className="text-lg text-gray-600 dark:text-gray-400">Carregando dados...</p>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold text-red-600 dark:text-red-400">{error}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Verifique sua conexão ou tente novamente mais tarde.
              </p>
            </div>
            <button 
              onClick={handleRetry}
              className="mt-4 px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className='sticky top-[60px] z-99 mb-6 flex flex-wrap items-end justify-end gap-x-2 gap-y-2 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark'>
        <BairroSelector
          bairroSelected=""
          setBairroSelected={handleBairroChange}
          bairros={bairrosDisponiveis}
        />
        <YearSelector
          yearSelected={yearSelected}
          setYearSelected={setYearSelected}
          minYear={minYear}
        />
        <DashboardScopeSelector
          scopeSelected={scopeSelected}
          setScopeSelected={handleScopeChange}
        />
        <AgravoSelector
          agravoSelected={agravoBase}
          setAgravoSelected={setAgravoBase}
        />
        {agravoBase === 'dengue' && (
          <DengueTypeSelector
            value={dengueType}
            setValue={handleDengueTypeChange}
          />
        )}
      </div>
      <div className={`relative transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {loading && (
        <div className="pointer-events-none absolute right-1 -top-1 z-10 flex items-center gap-2 text-sm font-medium text-body dark:text-bodydark">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
          Atualizando...
        </div>
      )}
      <div className='flex flex-col md:flex-row gap-4'>
        <CountCard
          title={scopeSelected === 'confirmados' ? 'Casos confirmados' : scopeSelected === 'obitos' ? 'Óbitos' : 'Notificações'}
          count={notificationsCount}
        />
        <CountCard 
          title="Bairros afetados"
          count={affectedNeighborhoods}
        /> 
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-start-1 col-end-13">
          <AgravoLineChart 
            options={lineChartOptionsByEpidemiologicalWeek}
            series={agravoLineSeries}
          />
        </div>
        <div className="col-start-1 col-end-13">
          <AgravoAccumulatedLineChart 
            options={lineChartOptionsByEpidemiologicalWeekAccumulated}
            series={agravoLineAccumulatedSeries}
          />
        </div>

        <div className='xl:col-start-1 xl:col-end-8 col-span-12'>
          <ColumnGraphic 
            title='Contagem de casos por faixa etaria'
            options={columnGraphicOptions}
            series={ageRangeCategories}
          />
        </div>

        <div className='xl:col-start-8 xl:col-end-13 col-span-12'>
          <DonutChart 
            chartTitle='Contagem de casos por gênero'
            options={donutChartOptionsbySexo}
            series={countBySexoSeries}
          />
        </div>
        <div className='xl:col-start-1 xl:col-end:13 col-span-12'>
          <div className="mb-4 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">
                  Relatório PDF por bairro
                </h3>
                <p className="mt-1 text-sm text-body dark:text-bodydark">
                  Gere a relação de bairros por semana epidemiológica usando os filtros atuais de ano e agravo.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-40">
                  <label
                    htmlFor="initialWeek"
                    className="mb-2 block text-sm font-medium text-black dark:text-white"
                  >
                    Semana inicial
                  </label>
                  <input
                    id="initialWeek"
                    type="number"
                    min="1"
                    max="53"
                    inputMode="numeric"
                    placeholder="Ex: 1"
                    value={initialWeek}
                    onChange={(event) => setInitialWeek(event.target.value)}
                    className="w-full rounded border border-stroke bg-transparent py-3 px-4 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label
                    htmlFor="finalWeek"
                    className="mb-2 block text-sm font-medium text-black dark:text-white"
                  >
                    Semana final
                  </label>
                  <input
                    id="finalWeek"
                    type="number"
                    min="1"
                    max="53"
                    inputMode="numeric"
                    placeholder="Ex: 14"
                    value={finalWeek}
                    onChange={(event) => setFinalWeek(event.target.value)}
                    className="w-full rounded border border-stroke bg-transparent py-3 px-4 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadNeighborhoodReport}
                  disabled={downloadingPdf}
                  className="flex h-[50px] min-w-[210px] items-center justify-center rounded bg-primary px-6 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {downloadingPdf ? 'Gerando PDF...' : 'Baixar relatório PDF'}
                </button>
              </div>
            </div>

            {downloadError && (
              <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                {downloadError}
              </p>
            )}

            {downloadSuccess && (
              <p className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">
                {downloadSuccess}
              </p>
            )}
          </div>

          <BaseTable
            neighborhoodData={neighborhoodApiData}
          />
        </div>
      </div>
      </div>
    </DefaultLayout>
  );
};

export default App;
