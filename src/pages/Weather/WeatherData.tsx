import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  IconAlertTriangle,
  IconArrowsDiff,
  IconCloudRain,
  IconDatabase,
  IconDroplet,
  IconRefresh,
  IconWind,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import { DatePickerBR } from '../../components/Forms/Inputs/DatePickerBR';
import DefaultLayout from '../../layout/DefaultLayout';
import api from '../../service/api/Api';

interface WeatherCoverage {
  start: string;
  end: string;
  rows: number;
  precipitationAvailable: number;
  precipitationCoveragePct: number;
  humidityAvailable: number;
  humidityCoveragePct: number;
  windAvailable: number;
  windCoveragePct: number;
  precipitationCompared: number;
  precipitationDivergent: number;
  precipitationAgreementPct: number;
  humidityCompared: number;
  humidityDivergent: number;
  humidityAgreementPct: number;
  windCompared: number;
  windDivergent: number;
  windAgreementPct: number;
  precipitationDifferenceThresholdMm: number;
  humidityDifferenceThresholdPctPoints: number;
  windDifferenceThresholdKmh: number;
  eligibleNotifications: number;
  linkedNotifications: number;
}

type JobState = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
type JobMode =
  | 'FULL_BACKFILL'
  | 'RECENT_RECONCILIATION'
  | 'CUSTOM_RANGE'
  | null;

interface WeatherJobStatus {
  state: JobState;
  mode: JobMode;
  startDate: string | null;
  endDate: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  neighborhoods: number;
  rowsProcessed: number;
  completeRows: number;
  partialRows: number;
  failedRequests: number;
  linkedNotifications: number;
  message: string | null;
}

type ActionKind = 'recent' | 'range' | 'backfill';

const EMPTY_STATUS: WeatherJobStatus = {
  state: 'IDLE',
  mode: null,
  startDate: null,
  endDate: null,
  startedAt: null,
  finishedAt: null,
  neighborhoods: 0,
  rowsProcessed: 0,
  completeRows: 0,
  partialRows: 0,
  failedRequests: 0,
  linkedNotifications: 0,
  message: null,
};

const STATE_LABEL: Record<JobState, string> = {
  IDLE: 'Aguardando execução',
  RUNNING: 'Em execução',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  SKIPPED: 'Não executado',
};

const MODE_LABEL: Record<Exclude<JobMode, null>, string> = {
  FULL_BACKFILL: 'Histórico completo',
  RECENT_RECONCILIATION: 'Últimos 7 dias',
  CUSTOM_RANGE: 'Período personalizado',
};

const ACTION_LABEL: Record<ActionKind, string> = {
  recent: 'Atualizar últimos 7 dias',
  range: 'Reprocessar período',
  backfill: 'Reprocessar histórico completo',
};

const ACTION_SUCCESS: Record<ActionKind, string> = {
  recent: 'Atualização dos últimos 7 dias enfileirada.',
  range: 'Reprocessamento do período enfileirado.',
  backfill: 'Reprocessamento do histórico completo enfileirado.',
};

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultPeriod() {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 2);
  start.setDate(start.getDate() + 1);
  return { start: localIsoDate(start), end: localIsoDate(end) };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatDecimal(value: number | undefined): string {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(
    value,
  );
}

function resolveApiMessage(error: any, fallback: string): string {
  if (
    Array.isArray(error?.response?.data?.errors) &&
    error.response.data.errors.length > 0
  ) {
    return String(error.response.data.errors[0]);
  }
  if (
    typeof error?.response?.data?.message === 'string' &&
    error.response.data.message.trim()
  ) {
    return error.response.data.message;
  }
  return fallback;
}

export default function WeatherData() {
  const initialPeriod = useMemo(defaultPeriod, []);
  const [startDate, setStartDate] = useState(initialPeriod.start);
  const [endDate, setEndDate] = useState(initialPeriod.end);
  const [appliedStart, setAppliedStart] = useState(initialPeriod.start);
  const [appliedEnd, setAppliedEnd] = useState(initialPeriod.end);
  const [coverage, setCoverage] = useState<WeatherCoverage | null>(null);
  const [jobStatus, setJobStatus] = useState<WeatherJobStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<ActionKind | null>(null);
  const [confirmation, setConfirmation] = useState<ActionKind | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const yesterday = initialPeriod.end;
  const isRunning = jobStatus.state === 'RUNNING';

  const loadDashboard = useCallback(
    async (background = false) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [coverageResponse, statusResponse] = await Promise.all([
          api.get('/weather/coverage', {
            params: { start: appliedStart, end: appliedEnd },
          }),
          api.get('/weather/enrichment/status'),
        ]);
        setCoverage(coverageResponse.data?.data ?? null);
        setJobStatus(statusResponse.data?.data ?? EMPTY_STATUS);
      } catch (requestError: any) {
        setError(
          resolveApiMessage(
            requestError,
            'Não foi possível carregar os dados meteorológicos.',
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedEnd, appliedStart],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!isRunning && !queuedMessage) return;
    const interval = window.setInterval(() => loadDashboard(true), 5000);
    return () => window.clearInterval(interval);
  }, [isRunning, loadDashboard, queuedMessage]);

  useEffect(() => {
    if (!queuedMessage || isRunning) return;
    const timeout = window.setTimeout(() => setQueuedMessage(null), 15000);
    return () => window.clearTimeout(timeout);
  }, [isRunning, queuedMessage]);

  function validatePeriod(): string | null {
    if (!startDate || !endDate) return 'Informe as datas inicial e final.';
    if (startDate > endDate)
      return 'A data inicial deve ser anterior ou igual à data final.';
    if (endDate > yesterday) return 'A data final deve ser, no máximo, ontem.';
    return null;
  }

  function applyPeriod() {
    const validationError = validatePeriod();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (startDate === appliedStart && endDate === appliedEnd) {
      loadDashboard(true);
      return;
    }
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function askToRun(action: ActionKind) {
    if (action === 'range') {
      const validationError = validatePeriod();
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setConfirmation(action);
  }

  async function runAction(action: ActionKind) {
    setLoadingAction(action);
    setConfirmation(null);
    setError(null);
    try {
      const endpoint =
        action === 'recent'
          ? '/weather/enrichment/recent'
          : action === 'backfill'
          ? '/weather/enrichment/backfill'
          : '/weather/enrichment/range';
      const params =
        action === 'range' ? { start: startDate, end: endDate } : undefined;
      await api.post(endpoint, undefined, { params });
      const message = ACTION_SUCCESS[action];
      setQueuedMessage(message);
      toast.success(message);
      window.setTimeout(() => loadDashboard(true), 700);
    } catch (requestError: any) {
      const message = resolveApiMessage(
        requestError,
        'Não foi possível iniciar o processamento.',
      );
      setError(message);
      toast.error(message);
    } finally {
      setLoadingAction(null);
    }
  }

  const linkagePct =
    coverage && coverage.eligibleNotifications > 0
      ? Math.round(
          (coverage.linkedNotifications * 10000) /
            coverage.eligibleNotifications,
        ) / 100
      : null;

  return (
    <DefaultLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Breadcrumb pageName="Dados meteorológicos" />

        <section className="mb-6 overflow-hidden rounded-2xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-col gap-5 border-b border-stroke p-5 dark:border-strokedark lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                <IconCloudRain size={18} aria-hidden="true" />
                Administração
              </div>
              <h1 className="text-2xl font-semibold text-black dark:text-white sm:text-3xl">
                Enriquecimento meteorológico
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-bodydark2">
                Acompanhe a cobertura de chuva, umidade e vento vinculada às
                notificações. A rotina diária é automática; use as ações manuais
                apenas para recompor ou revisar períodos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing || loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-meta-4 dark:focus:ring-offset-boxdark"
            >
              <IconRefresh
                className={refreshing ? 'animate-spin' : ''}
                size={18}
                aria-hidden="true"
              />
              {refreshing ? 'Atualizando...' : 'Atualizar painel'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-4 lg:p-6">
            <CoverageCard
              title="Precipitação"
              value={
                coverage && coverage.rows > 0
                  ? coverage.precipitationCoveragePct
                  : undefined
              }
              available={coverage?.precipitationAvailable}
              total={coverage?.rows}
              icon={<IconDroplet size={22} aria-hidden="true" />}
              loading={loading}
            />
            <CoverageCard
              title="Umidade do ar"
              value={
                coverage && coverage.rows > 0
                  ? coverage.humidityCoveragePct
                  : undefined
              }
              available={coverage?.humidityAvailable}
              total={coverage?.rows}
              icon={<IconCloudRain size={22} aria-hidden="true" />}
              loading={loading}
            />
            <CoverageCard
              title="Velocidade do vento"
              value={
                coverage && coverage.rows > 0
                  ? coverage.windCoveragePct
                  : undefined
              }
              available={coverage?.windAvailable}
              total={coverage?.rows}
              icon={<IconWind size={22} aria-hidden="true" />}
              loading={loading}
            />
            <CoverageCard
              title="Notificações vinculadas"
              value={linkagePct ?? undefined}
              available={coverage?.linkedNotifications}
              total={coverage?.eligibleNotifications}
              icon={<IconDatabase size={22} aria-hidden="true" />}
              loading={loading}
              targetLabel="Vínculo atual"
            />
          </div>

          <div className="border-t border-stroke p-5 dark:border-strokedark lg:p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="rounded-lg bg-blue-50 p-2 text-primary dark:bg-blue-900/30 dark:text-blue-300">
                <IconArrowsDiff size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-black dark:text-white">
                  Concordância entre Open-Meteo e NASA POWER
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-bodydark2">
                  Compara apenas os dias em que as duas fontes possuem valor.
                  Diferenças acima do limite ficam sinalizadas para auditoria e
                  não são combinadas por média.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <CoverageCard
                title="Concordância da precipitação"
                value={
                  coverage && coverage.precipitationCompared > 0
                    ? coverage.precipitationAgreementPct
                    : undefined
                }
                available={
                  coverage
                    ? coverage.precipitationCompared -
                      coverage.precipitationDivergent
                    : undefined
                }
                total={coverage?.precipitationCompared}
                icon={<IconDroplet size={22} aria-hidden="true" />}
                loading={loading}
                targetLabel={`Meta: 90% • limite: ${formatDecimal(
                  coverage?.precipitationDifferenceThresholdMm,
                )} mm`}
              />
              <CoverageCard
                title="Concordância da umidade"
                value={
                  coverage && coverage.humidityCompared > 0
                    ? coverage.humidityAgreementPct
                    : undefined
                }
                available={
                  coverage
                    ? coverage.humidityCompared - coverage.humidityDivergent
                    : undefined
                }
                total={coverage?.humidityCompared}
                icon={<IconCloudRain size={22} aria-hidden="true" />}
                loading={loading}
                targetLabel={`Meta: 90% • limite: ${formatDecimal(
                  coverage?.humidityDifferenceThresholdPctPoints,
                )} p.p.`}
              />
              <CoverageCard
                title="Concordância do vento"
                value={
                  coverage && coverage.windCompared > 0
                    ? coverage.windAgreementPct
                    : undefined
                }
                available={
                  coverage
                    ? coverage.windCompared - coverage.windDivergent
                    : undefined
                }
                total={coverage?.windCompared}
                icon={<IconWind size={22} aria-hidden="true" />}
                loading={loading}
                targetLabel={`Meta: 90% • limite: ${formatDecimal(
                  coverage?.windDifferenceThresholdKmh,
                )} km/h`}
              />
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="font-semibold underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="rounded-2xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark xl:col-span-3">
            <div className="border-b border-stroke p-5 dark:border-strokedark sm:p-6">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Cobertura por período
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-bodydark2">
                O painel considera um registro diário por bairro entre as datas
                selecionadas.
              </p>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePickerBR
                  id="weather-start-date"
                  label="Data inicial"
                  value={startDate}
                  onChange={setStartDate}
                  maxDate={yesterday}
                  className="w-full"
                  inputClassName="w-full min-h-11"
                />
                <DatePickerBR
                  id="weather-end-date"
                  label="Data final"
                  value={endDate}
                  onChange={setEndDate}
                  maxDate={yesterday}
                  className="w-full"
                  inputClassName="w-full min-h-11"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={applyPeriod}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-boxdark"
                >
                  Consultar cobertura
                </button>
                <button
                  type="button"
                  onClick={() => askToRun('range')}
                  disabled={isRunning || loadingAction !== null}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-boxdark"
                >
                  {loadingAction === 'range'
                    ? 'Enfileirando...'
                    : 'Reprocessar este período'}
                </button>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-semibold">
                  Período exibido: {formatDate(appliedStart)} a{' '}
                  {formatDate(appliedEnd)}
                </p>
                <p className="mt-1">
                  Metas: pelo menos 90% de completude e 90% de concordância
                  entre as fontes dentro dos limites configurados.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark xl:col-span-2">
            <div className="border-b border-stroke p-5 dark:border-strokedark sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-black dark:text-white">
                    Última execução
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-bodydark2">
                    Atualiza automaticamente durante o processamento.
                  </p>
                </div>
                <StatusBadge state={jobStatus.state} />
              </div>
            </div>
            <div className="p-5 sm:p-6" aria-live="polite">
              {queuedMessage && !isRunning && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-200">
                  Solicitação enviada. Aguardando o início do processamento.
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                <StatusItem
                  label="Tipo"
                  value={jobStatus.mode ? MODE_LABEL[jobStatus.mode] : '—'}
                />
                <StatusItem
                  label="Período"
                  value={
                    jobStatus.startDate
                      ? `${formatDate(jobStatus.startDate)} a ${formatDate(
                          jobStatus.endDate,
                        )}`
                      : '—'
                  }
                />
                <StatusItem
                  label="Início"
                  value={formatDateTime(jobStatus.startedAt)}
                />
                <StatusItem
                  label="Término"
                  value={formatDateTime(jobStatus.finishedAt)}
                />
                <StatusItem
                  label="Bairros"
                  value={formatNumber(jobStatus.neighborhoods)}
                />
                <StatusItem
                  label="Linhas processadas"
                  value={formatNumber(jobStatus.rowsProcessed)}
                />
                <StatusItem
                  label="Linhas completas"
                  value={formatNumber(jobStatus.completeRows)}
                />
                <StatusItem
                  label="Linhas parciais"
                  value={formatNumber(jobStatus.partialRows)}
                />
                <StatusItem
                  label="Falhas de requisição"
                  value={formatNumber(jobStatus.failedRequests)}
                />
                <StatusItem
                  label="Notificações vinculadas"
                  value={formatNumber(jobStatus.linkedNotifications)}
                />
              </dl>

              {jobStatus.message && (
                <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <IconAlertTriangle
                    className="mt-0.5 shrink-0"
                    size={18}
                    aria-hidden="true"
                  />
                  <span>{jobStatus.message}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Ações de manutenção
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600 dark:text-bodydark2">
                A atualização dos últimos 7 dias complementa dados recentes. O
                histórico completo consulta desde a notificação mais antiga e
                pode levar mais tempo.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
              <button
                type="button"
                onClick={() => askToRun('recent')}
                disabled={isRunning || loadingAction !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-boxdark"
              >
                {loadingAction === 'recent'
                  ? 'Enfileirando...'
                  : 'Atualizar últimos 7 dias'}
              </button>
              <button
                type="button"
                onClick={() => askToRun('backfill')}
                disabled={isRunning || loadingAction !== null}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stroke px-4 py-2.5 text-sm font-medium text-black transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 dark:focus:ring-offset-boxdark"
              >
                {loadingAction === 'backfill'
                  ? 'Enfileirando...'
                  : 'Reprocessar histórico completo'}
              </button>
            </div>
          </div>
          {isRunning && (
            <p
              className="mt-4 text-sm font-medium text-blue-700 dark:text-blue-300"
              aria-live="polite"
            >
              Existe um processamento em andamento. Novas ações ficam
              disponíveis quando ele terminar.
            </p>
          )}
        </section>
      </div>

      {confirmation && (
        <ConfirmationDialog
          action={confirmation}
          startDate={startDate}
          endDate={endDate}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => runAction(confirmation)}
          returnFocus={returnFocusRef.current}
        />
      )}
    </DefaultLayout>
  );
}

function CoverageCard({
  title,
  value,
  available,
  total,
  icon,
  loading,
  targetLabel = 'Meta mínima: 90%',
}: {
  title: string;
  value?: number;
  available?: number;
  total?: number;
  icon: ReactNode;
  loading: boolean;
  targetLabel?: string;
}) {
  if (loading) {
    return (
      <div
        className="h-40 animate-pulse rounded-xl bg-gray dark:bg-meta-4"
        aria-label={`Carregando ${title}`}
      />
    );
  }

  const hasData = typeof value === 'number';
  const meetsTarget = hasData && value >= 90;
  const tone = !hasData
    ? 'border-stroke bg-white text-gray-500 dark:border-strokedark dark:bg-boxdark dark:text-bodydark2'
    : meetsTarget
    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/25 dark:text-emerald-300'
    : 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/25 dark:text-amber-300';

  return (
    <article className={`rounded-xl border p-5 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <span className="rounded-lg bg-white/70 p-2 shadow-sm dark:bg-black/20">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-black dark:text-white">
        {hasData ? formatPercentage(value) : '—'}
      </p>
      <p className="mt-1 text-xs">
        {typeof available === 'number' && typeof total === 'number'
          ? `${formatNumber(available)} de ${formatNumber(total)} registros`
          : 'Dados indisponíveis'}
      </p>
      <p className="mt-3 text-xs font-medium">
        {targetLabel}
        {hasData && targetLabel.includes('Meta')
          ? meetsTarget
            ? ' • atingida'
            : ' • abaixo da meta'
          : ''}
      </p>
    </article>
  );
}

function StatusBadge({ state }: { state: JobState }) {
  const classes: Record<JobState, string> = {
    IDLE: 'bg-gray text-gray-700 dark:bg-meta-4 dark:text-bodydark',
    RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    COMPLETED:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    SKIPPED:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${classes[state]}`}
    >
      {state === 'RUNNING' && (
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {STATE_LABEL[state]}
    </span>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-bodydark2">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-black dark:text-white">{value}</dd>
    </div>
  );
}

function ConfirmationDialog({
  action,
  startDate,
  endDate,
  onCancel,
  onConfirm,
  returnFocus,
}: {
  action: ActionKind;
  startDate: string;
  endDate: string;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocus: HTMLElement | null;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocus?.focus();
    };
  }, [onCancel, returnFocus]);

  const description =
    action === 'recent'
      ? 'Os dados meteorológicos dos últimos 7 dias serão consultados novamente e os vínculos das notificações serão atualizados.'
      : action === 'range'
      ? `Os dados entre ${formatDate(startDate)} e ${formatDate(
          endDate,
        )} serão consultados novamente.`
      : 'Todo o histórico, desde a notificação mais antiga, será consultado novamente. Esta operação pode levar mais tempo.';

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weather-confirmation-title"
        aria-describedby="weather-confirmation-description"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-primary dark:bg-blue-900/30 dark:text-blue-300">
            <IconRefresh size={24} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="weather-confirmation-title"
              className="text-lg font-semibold text-black dark:text-white"
            >
              {ACTION_LABEL[action]}
            </h2>
            <p
              id="weather-confirmation-description"
              className="mt-2 text-sm leading-6 text-gray-600 dark:text-bodydark2"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-stroke px-4 py-2.5 text-sm font-medium text-black transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 dark:focus:ring-offset-boxdark"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-boxdark"
          >
            Confirmar processamento
          </button>
        </div>
      </div>
    </div>
  );
}
