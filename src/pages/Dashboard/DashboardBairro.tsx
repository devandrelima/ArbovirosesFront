import React, { useEffect, useState } from 'react';
import DefaultLayout from '../../layout/DefaultLayout';
import AgravoLineChart from '../../components/Charts/AgravoLineChart';
import DonutChart from '../../components/Charts/DonutChart';
import { ApexOptions } from 'apexcharts';
import ColumnGraphic from '../../components/Charts/ColumnGraphic';
import { countByEpidemiologicalWeekOptions, mountAgravoLineData } from '../../service/components/EpidemiologicalWeek';
import { countBySexoOptions, mountDonutCountBySexo } from '../../service/components/CountBySexo';
import { countByAgeRangeOptions, mountColumnCountByAgeRange } from '../../service/components/CountByAgeRange';
import YearSelector from '../../components/Forms/SelectGroup/YearSelector';
import AgravoSelector from '../../components/Forms/SelectGroup/AgravoSelector';
import DashboardScopeSelector from '../../components/Forms/SelectGroup/DashboardScopeSelector';
import { CountCard } from '../../components/Cards/CountCard';
import { notificationsCountData } from '../../service/components/notificationsCount';
import { countByEpidemiologicalWeekAccumulatedOptions, mountAgravoLineAccumulatedData } from '../../service/components/EpidemiologicalWeekAccumulated';
import AgravoAccumulatedLineChart from '../../components/Charts/AgravoAccumulatedLineChart';
import { useLocation, useNavigate } from 'react-router-dom';
import BairroSelector from '../../components/Forms/SelectGroup/BairroSelector';
import { mountNeighborhoodData } from '../../service/components/NeighborhoodInfoTable';
import { NeighborhoodInfo } from '../../components/Entity/NeighborhoodInfo';
import { DashboardScope } from '../../service/components/dashboardQueryParams';

const lineChartOptionsByEpidemiologicalWeek: ApexOptions = countByEpidemiologicalWeekOptions();
const lineChartOptionsByEpidemiologicalWeekAccumulated: ApexOptions = countByEpidemiologicalWeekAccumulatedOptions();
const donutChartOptionsbySexo: ApexOptions = countBySexoOptions();
const columnGraphicOptions: ApexOptions = countByAgeRangeOptions();

const DashboardBairro: React.FC = () => {
  const bairro = useLocation().state?.bairro;
  const bairrosDoState = useLocation().state?.bairros;
  const navigate = useNavigate();


  const [bairros, setBairros] = useState<string[]>(bairrosDoState ?? []);
  const [neighborhoodApiData, setNeighborhoodApiData] = useState<NeighborhoodInfo[]>([]);
  const [agravoLineSeries, setAgravoLineSeries] = useState<any>([]);
  const [countBySexoSeries, setCountBySexoSeries] = useState<any>([]);
  const [ageRangeCategories, setAgeRangeCategories] = useState<any>([]);
  const [agravoLineAccumulatedSeries, setAgravoLineAccumulatedSeries] = useState<any>([])
  const [notificationsCount, setNotificationsCount] = useState<any>(0);
  const [agravoSelected, setAgravoSelected] = useState<string>(() => {
    const saved = localStorage.getItem('agravoSelected') || 'dengue';
    return ['zika', 'chikungunya'].includes(saved) ? saved : 'dengue';
  });
  const [yearSelected, setYearSelected] = useState<string>(() => {
    return localStorage.getItem('yearSelected') || new Date().getFullYear().toString();
  });

  const handleBairroChange = (novoBairro: string) => {
    if (novoBairro) {
      navigate('/dashboard/bairro', { state: { bairro: novoBairro, bairros } });
    } else {
      navigate('/');
    }
  };

    useEffect(() => {
    if (bairros.length === 0) {
      mountNeighborhoodData(setNeighborhoodApiData, yearSelected, agravoSelected);
    }
  }, []);
   

  
    
  useEffect(() => {   // atualiza bairros quando dados chegarem da API
    if (neighborhoodApiData.length > 0) {
      setBairros(
        neighborhoodApiData
          .map((n) => n.nomeBairro)
          .filter(Boolean)
          .sort()
      );
    }
  }, [neighborhoodApiData]);
  const [scopeSelected, setScopeSelected] = useState<DashboardScope>(() => {
    const savedScope = localStorage.getItem('dashboardScopeSelected');
    return savedScope === 'confirmados' || savedScope === 'obitos' ? savedScope : 'notificados';
  });
  
  useEffect(() => {

    if (bairro) {
      mountAgravoLineData(setAgravoLineSeries, yearSelected, agravoSelected, bairro, scopeSelected);
      mountDonutCountBySexo(setCountBySexoSeries, yearSelected, agravoSelected, bairro, scopeSelected);
      mountColumnCountByAgeRange(setAgeRangeCategories, yearSelected, agravoSelected, bairro, scopeSelected);
      notificationsCountData(setNotificationsCount, yearSelected, agravoSelected, bairro, scopeSelected);
      mountAgravoLineAccumulatedData(setAgravoLineAccumulatedSeries, yearSelected, agravoSelected, bairro, scopeSelected);
      localStorage.setItem('dashboardScopeSelected', scopeSelected);
    }
  }, [yearSelected, agravoSelected, bairro, scopeSelected]);

  return (
    <DefaultLayout>
      <div className='sticky top-[60px] z-99 mb-6 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-md dark:bg-boxdark-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <nav>
            <ol className="flex items-center gap-2">
              <li><p className="font-medium">Painel</p></li>
              <li className="font-medium text-primary">/ {bairro}</li>
            </ol>
          </nav>
          <h2 className='text-2xl mt-2 font-bold text-black dark:text-white flex items-center gap-2'>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 9v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9"/>
              <path d="M9 22V12h6v10"/>
              <path d="M2 10.6L12 2l10 8.6"/>
            </svg>
            Análise Epidemiológica
          </h2>
        </div>

        {/* Lado Direito: Filtros */}
        <div className='flex gap-x-4 items-center'>
            <BairroSelector
              bairroSelected={bairro ?? ''}
              setBairroSelected={handleBairroChange}
              bairros={bairros}
            />
            <YearSelector 
              yearSelected={yearSelected}
              setYearSelected={setYearSelected}
            />
            <AgravoSelector 
              agravoSelected={agravoSelected}
              setAgravoSelected={setAgravoSelected}
            />
            <DashboardScopeSelector
              scopeSelected={scopeSelected}
              setScopeSelected={setScopeSelected}
            />
        </div>
      </div>
      {/* ========== FIM DO CABEÇALHO ========== */}

      <div className='flex flex-col md:flex-row gap-4'>
        <CountCard
          title={scopeSelected === 'confirmados' ? 'Casos confirmados' : scopeSelected === 'obitos' ? 'Óbitos' : 'Notificações'}
          count={notificationsCount}
        />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        <div className="col-start-1 col-end-13">
          <AgravoLineChart 
            options={lineChartOptionsByEpidemiologicalWeek}
            series={agravoLineSeries ?? []}
          />
        </div>

        <div className="col-start-1 col-end-13">
          <AgravoAccumulatedLineChart 
            options={lineChartOptionsByEpidemiologicalWeekAccumulated}
            series={agravoLineAccumulatedSeries ?? []}
          />
        </div>

        <div className='xl:col-start-1 xl:col-end-8 col-span-12'>
          <ColumnGraphic 
            title='Contagem de casos por faixa etária'
            options={columnGraphicOptions}
            series={ageRangeCategories ?? []}
          />
        </div>

        <div className='xl:col-start-8 xl:col-end-13 col-span-12'>
          <DonutChart 
            chartTitle='Contagem de casos por sexo'
            options={donutChartOptionsbySexo}
            series={countBySexoSeries ?? []}
          />
        </div>
      </div>
    </DefaultLayout>
  );
};

export default DashboardBairro;
