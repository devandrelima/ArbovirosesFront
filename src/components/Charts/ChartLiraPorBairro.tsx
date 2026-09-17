import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

import {
  classificarIip,
  corClassificacaoIip,
  formatarIndice,
  indiceMedido,
} from '../../pages/Lira/liraDados';
import type { LiraData } from '../../pages/Lira/liraDados';

export type IndiceLira = 'predial' | 'breteau';

interface ChartLiraPorBairroProps {
  data: LiraData[];
  indice: IndiceLira;
}

const ChartLiraPorBairro: React.FC<ChartLiraPorBairroProps> = ({ data, indice }) => {
  const obterValor = (dado: LiraData) =>
    indice === 'predial' ? dado.indiceInfestacaoPredial : dado.indiceBreteau;

  const dadosOrdenados = data
    .filter((dado) => dado?.bairro && indiceMedido(obterValor(dado)))
    .sort((a, b) => (obterValor(b) ?? 0) - (obterValor(a) ?? 0));

  const altura = Math.max(380, dadosOrdenados.length * 34);
  const nomeIndice = indice === 'predial'
    ? 'Índice de Infestação Predial (IIP)'
    : 'Índice de Breteau (IB)';

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: altura,
      toolbar: { show: false },
      fontFamily: 'Satoshi, sans-serif',
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: '68%',
        distributed: indice === 'predial',
      },
    },
    colors: indice === 'predial'
      ? dadosOrdenados.map((dado) => corClassificacaoIip(classificarIip(dado.indiceInfestacaoPredial)))
      : ['#3c50e0'],
    dataLabels: {
      enabled: true,
      formatter: (valor) => formatarIndice(Number(valor), indice === 'predial'),
      style: { fontSize: '11px', colors: ['#ffffff'] },
    },
    xaxis: {
      categories: dadosOrdenados.map((dado) => dado.bairro),
      title: { text: nomeIndice },
      labels: {
        formatter: (valor) => new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 1,
        }).format(Number(valor)),
      },
    },
    yaxis: { labels: { maxWidth: 180 } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (valor) => formatarIndice(valor, indice === 'predial'),
        title: { formatter: () => `${nomeIndice}: ` },
      },
    },
    annotations: indice === 'predial' ? {
      xaxis: [
        {
          x: 1,
          borderColor: '#d97706',
          strokeDashArray: 4,
          label: {
            text: 'Alerta',
            style: {
              background: '#d97706',
              color: '#ffffff',
              cssClass: 'lira-iip-annotation-label',
              fontWeight: 700,
            },
          },
        },
        {
          x: 4,
          borderColor: '#dc2626',
          strokeDashArray: 4,
          label: {
            text: 'Risco',
            style: {
              background: '#dc2626',
              color: '#ffffff',
              cssClass: 'lira-iip-annotation-label',
              fontWeight: 700,
            },
          },
        },
      ],
    } : undefined,
  };

  const series = [{
    name: nomeIndice,
    data: dadosOrdenados.map((dado) => obterValor(dado) as number),
  }];

  if (dadosOrdenados.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Não há medições disponíveis para este índice.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        <ReactApexChart options={options} series={series} type="bar" height={altura} />
      </div>
    </div>
  );
};

export default ChartLiraPorBairro;
