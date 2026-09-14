import React, { useEffect, useState } from 'react';
import DefaultLayout from '../../layout/DefaultLayout';
import HeatMap from '../../components/Maps/HeatMap';
import AgravoSelector from '../../components/Forms/SelectGroup/AgravoSelector';
import YearSelector from '../../components/Forms/SelectGroup/YearSelector';
import { mountNeighborhoodData } from '../../service/components/NeighborhoodInfoTable';
import getApiData from '../../service/api/fetchApiData';

const App: React.FC = () => {
  const [affectedNeighborhoods, setAffectedNeighborhoods] = useState<any>([])
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [minYear, setMinYear] = useState<number | undefined>(undefined);

  const [agravoSelected, setAgravoSelected] = useState<string>(() => {
    const saved = localStorage.getItem('agravoSelected') || 'dengue';
    return ['zika', 'chikungunya'].includes(saved) ? saved : 'dengue';
  });

  const [yearSelected, setYearSelected] = useState<string>(() => {
    return localStorage.getItem('yearSelected') || new Date().getFullYear().toString();
  });

  const normalizeNeighborhoodKey = (name: string): string =>
    name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

  const cordsNeighborhoods: { [key: string]: [number, number] } = {
    'ABOLICAO':                  [-5.1581, -37.3607],
    'AEROPORTO':                 [-5.1970, -37.3695],
    'ALTO DA CONCEICAO':         [-5.2005, -37.3480],
    'ALTO DE SAO MANOEL':        [-5.210125, -37.33342],
    'BELO HORIZONTE':            [-5.2106, -37.3574],
    'BOA VISTA':                 [-5.1947, -37.3536],
    'BOM JARDIM':                [-5.1792, -37.3381],
    'BOM JESUS':                 [-5.2295, -37.3614],
    'BARROCAS':                  [-5.1656, -37.3323],
    'CENTRO':                    [-5.1850, -37.3420],
    'COSTA E SILVA':             [-5.2104, -37.3143],
    'DIX-SEPT ROSADO':           [-5.2015, -37.3649],
    'DOM JAIME CAMARA':          [-5.228459, -37.31464],
    'DOZE ANOS':                 [-5.1898, -37.3507],
    'ILHA DE SANTA LUZIA':       [-5.2001, -37.3391],
    'LAGOA DO MATO':             [-5.2052, -37.3601],
    'NOVA BETANIA':              [-5.1788, -37.3667],
    'PAREDOES':                  [-5.1800, -37.3306],
    'PLANALTO 13 DE MAIO':       [-5.2199, -37.3384],
    'PRESIDENTE COSTA E SILVA':  [-5.1583, -37.3602],
    'RINCAO':                    [-5.1971, -37.2880],
    'SANTA DELMIRA':             [-5.1524, -37.3562],
    'SANTA JULIA':               [-5.1354, -37.3282],
    'SANTO ANTONIO':             [-5.1663, -37.3433],
    'ALTO DO SUMARE':            [-5.231820, -37.339779],
    'SAO MANOEL':                [-5.2065, -37.3351],
    'VINGT ROSADO':              [-5.2019, -37.3033],
  };

  useEffect(() => {
    getApiData('/notifications/min-year')
      .then(data => {
        if (data == null) return;

        setMinYear(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getApiData('/notifications/latest-date')
      .then(data => {
        const latestDate = data?.[agravoSelected];
        const latestYear = Number(latestDate?.split('/')[2]);

        if (Number.isInteger(latestYear)) {
          setYearSelected(String(latestYear));
        }
      })
      .catch(() => {});
  }, [agravoSelected]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        await mountNeighborhoodData(setAffectedNeighborhoods, yearSelected, agravoSelected);
        localStorage.setItem('yearSelected', yearSelected);
        localStorage.setItem('agravoSelected', agravoSelected);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar dados dos bairros. Tente novamente.');
        setAffectedNeighborhoods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [yearSelected, agravoSelected]) 

  const heatData = Array.isArray(affectedNeighborhoods) 
    ? affectedNeighborhoods
        .map((neighborhood: { nomeBairro: string; casosReportados: number; }) => {
          if (!neighborhood || !neighborhood.nomeBairro) return null;
          
          const neighborhoodName = normalizeNeighborhoodKey(String(neighborhood.nomeBairro));
          const coords = cordsNeighborhoods[neighborhoodName];
          
          if (!coords || !Array.isArray(coords) || coords.length !== 2) {
            console.warn(`Coordenadas não encontradas para o bairro: ${neighborhoodName}`);
            return null;
          }

          const intensidade = typeof neighborhood.casosReportados === 'number' 
            ? neighborhood.casosReportados 
            : 0;
          
          return [...coords, intensidade] as [number, number, number];
        })
        .filter((item): item is [number, number, number] => item !== null)
    : [];

  return (
    <DefaultLayout>
      <div className='flex justify-end gap-x-2 items-center'>
        <YearSelector
          yearSelected={yearSelected}
          setYearSelected={setYearSelected}
          minYear={minYear}
        />
        <AgravoSelector
          agravoSelected={agravoSelected}
          setAgravoSelected={setAgravoSelected}
        />
      </div>

      <div className='h-2/3'>
        <h1>Mapa de Calor de Mossoró</h1>
        
        {loading && (
          <div className="text-center py-8">
            <p className="text-lg">Carregando dados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && heatData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg">Nenhum dado disponível para exibição</p>
          </div>
        )}

        {!loading && !error && heatData.length > 0 && (
          <HeatMap data={heatData} />
        )}
      </div>
    </DefaultLayout>
  );
};

export default App;
