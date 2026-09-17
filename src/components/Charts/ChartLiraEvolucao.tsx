import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

import { FAIXAS_IIP_PADRAO, formatarIndice, resumirIndices } from '../../pages/Lira/liraDados';
import type { FaixasIip, LiraData } from '../../pages/Lira/liraDados';

interface ChartLiraEvolucaoProps {
  data: LiraData[];
  ciclos: number[];
  faixasPorCiclo: Record<number, FaixasIip>;
}

const ChartLiraEvolucao: React.FC<ChartLiraEvolucaoProps> = ({ data, ciclos, faixasPorCiclo }) => {
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
    colors: ['#3c50e0', '#d97706', '#dc2626'],
    stroke: { curve: 'smooth', width: [3, 2, 2], dashArray: [0, 5, 5] },
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
    legend: { position: 'top' },
  };

  const series = [
    { name: 'IIP médio', data: medias },
    { name: 'Início do alerta', data: ciclos.map((ciclo) => (faixasPorCiclo[ciclo] ?? FAIXAS_IIP_PADRAO).limiteAlerta) },
    { name: 'Início do risco', data: ciclos.map((ciclo) => (faixasPorCiclo[ciclo] ?? FAIXAS_IIP_PADRAO).limiteRisco) },
  ];

  return <ReactApexChart options={options} series={series} type="line" height={340} />;
};

export default ChartLiraEvolucao;
