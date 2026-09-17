import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

import { formatarIndice, resumirIndices } from '../../pages/Lira/liraDados';
import type { LiraData } from '../../pages/Lira/liraDados';

interface ChartLiraEvolucaoProps {
  data: LiraData[];
  ciclos: number[];
}

const ChartLiraEvolucao: React.FC<ChartLiraEvolucaoProps> = ({ data, ciclos }) => {
  const medias = ciclos.map((ciclo) =>
    resumirIndices(data.filter((item) => item.liraNumber === ciclo)).mediaPredial
  );

  const options: ApexOptions = {
    chart: {
      type: 'line',
      height: 340,
      toolbar: { show: false },
      fontFamily: 'Satoshi, sans-serif',
    },
    colors: ['#3c50e0'],
    stroke: { curve: 'smooth', width: 3 },
    markers: { size: 5 },
    xaxis: {
      categories: ciclos.map((ciclo) => `Ciclo ${ciclo}`),
      title: { text: 'Ciclos com dados' },
    },
    yaxis: {
      min: 0,
      title: { text: 'IIP médio (%)' },
      labels: {
        formatter: (valor) => new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(valor),
      },
    },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    tooltip: { y: { formatter: (valor) => formatarIndice(valor, true) } },
    annotations: {
      yaxis: [
        { y: 1, borderColor: '#d97706', strokeDashArray: 4 },
        { y: 4, borderColor: '#dc2626', strokeDashArray: 4 },
      ],
    },
  };

  const series = [{ name: 'IIP médio', data: medias }];

  return <ReactApexChart options={options} series={series} type="line" height={340} />;
};

export default ChartLiraEvolucao;
