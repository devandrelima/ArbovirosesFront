import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithEsbuild } from 'vite';

async function carregarTs(nome) {
  const url = new URL('../src/pages/Lira/' + nome, import.meta.url);
  const { code } = await transformWithEsbuild(await readFile(url, 'utf8'), nome, { loader: 'ts' });
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}

const ciclos = await carregarTs('liraCiclos.ts');
const {
  classificarIip,
  contarBairrosEmRisco,
  formatarIndice,
  obterMaiorIndicePredial,
  resumirIndices,
} = await carregarTs('liraDados.ts');
const dado = (predial, breteau = predial) => ({ bairro: 'Centro', indiceInfestacaoPredial: predial, indiceBreteau: breteau });

test('oferece seis ciclos e ano padrao que consta no seletor', () => {
  assert.deepEqual(ciclos.CICLOS_LIRA, [1, 2, 3, 4, 5, 6]);
  assert.equal(ciclos.ANO_PADRAO, 2025);
  assert.ok(ciclos.ANOS_COM_DADOS.includes(ciclos.ANO_PADRAO));
  assert.equal(ciclos.rotuloCicloCompleto(6, 2025), 'LIRA 6 - Ciclo 6 de 2025');
});

test('zero e uma medicao, null nao entra na media', () => {
  assert.deepEqual(resumirIndices([dado(0), dado(6), dado(null)]), {
    mediaPredial: 3, maxPredial: 6, maxBreteau: 6,
  });
});

test('cada indice e resumido independentemente', () => {
  assert.deepEqual(resumirIndices([dado(null, 8), dado(4, null)]), {
    mediaPredial: 4, maxPredial: 4, maxBreteau: 8,
  });
});

test('sem amostragem e lista vazia nao produzem zero ou Infinity', () => {
  for (const dados of [[], [dado(null)]]) {
    assert.deepEqual(resumirIndices(dados), { mediaPredial: null, maxPredial: null, maxBreteau: null });
  }
});

test('valores nao finitos nao contaminam o resumo', () => {
  assert.deepEqual(resumirIndices([dado(NaN), dado(Infinity), dado(2)]), {
    mediaPredial: 2, maxPredial: 2, maxBreteau: 2,
  });
});

test('rotulo diferencia ausencia de resultado zero', () => {
  assert.equal(formatarIndice(null, true), 'Dado não informado');
  assert.equal(formatarIndice(0, true), '0,00%');
  assert.equal(formatarIndice(1.5), '1,50');
});

test('classifica o IIP nas faixas oficiais', () => {
  assert.equal(classificarIip(0.99), 'satisfatorio');
  assert.equal(classificarIip(1), 'alerta');
  assert.equal(classificarIip(3.99), 'alerta');
  assert.equal(classificarIip(4), 'risco');
  assert.equal(classificarIip(null), 'sem-medicao');
});

test('classifica o IIP com faixas definidas pela equipe de saúde', () => {
  const faixas = { limiteAlerta: 2, limiteRisco: 6 };
  assert.equal(classificarIip(1.99, faixas), 'satisfatorio');
  assert.equal(classificarIip(2, faixas), 'alerta');
  assert.equal(classificarIip(5.99, faixas), 'alerta');
  assert.equal(classificarIip(6, faixas), 'risco');
  assert.equal(contarBairrosEmRisco([dado(5.9), dado(6), dado(8)], faixas), 2);
});

test('resume bairros prioritarios sem tratar ausencia como zero', () => {
  const dados = [
    { bairro: 'A', indiceInfestacaoPredial: 4, indiceBreteau: 2 },
    { bairro: 'B', indiceInfestacaoPredial: 7.5, indiceBreteau: 3 },
    { bairro: 'C', indiceInfestacaoPredial: null, indiceBreteau: null },
  ];
  assert.equal(contarBairrosEmRisco(dados), 2);
  assert.equal(obterMaiorIndicePredial(dados).bairro, 'B');
});
