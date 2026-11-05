import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DefaultLayout from '../../layout/DefaultLayout';
import api from '../../service/api/Api';
import { SuccessModal } from '../../components/Modals/SuccessModal';
import { downloadErrorsPdfReport } from '../../service/components/ErrorsPdfReport';
import { DatePickerBR } from '../../components/Forms/Inputs/DatePickerBR';
import { MAX_UPLOAD_LABEL, validateUploadFile } from '../../common/input/InputSecurity';

type Tab = 'upload' | 'erros';
type FileType = 'xlsx' | 'csv' | 'dbf';

interface NotificationRecord {
    idNotification: number;
    idAgravo: string | null;
    dataNotification: number | null;
    dataPrimeiroSintoma: number | null;
    dataNascimento: number | null;
    classificacao: string | null;
    sexo: string | null;
    idBairro: number;
    nomeBairro: string | null;
    evolucao: string | null;
    idadePaciente: number;
    semanaEpidemiologica: number;
    category?: string;
}

const FILE_TYPE_CONFIG: Record<FileType, { endpoint: string; accept: string; label: string }> = {
    xlsx: { endpoint: '/uploadXlsx', accept: '.xlsx', label: 'Excel (.xlsx)' },
    csv:  { endpoint: '/uploadCsv',  accept: '.csv',  label: 'CSV (.csv)'   },
    dbf:  { endpoint: '/uploadDbf',  accept: '.dbf',  label: 'DBF (.dbf)'   },
};

const DOENCAS = [
    { value: '', label: 'Todas as doenças' },
    { value: 'A90',   label: 'Dengue' },
    { value: 'A92.0', label: 'Chikungunya' },
    { value: 'A928',  label: 'Zika' },
];

const ERROR_CATEGORIES = [
    { value: '', label: 'Todos os problemas' },
    { value: 'BAIRRO_FALTANDO',          label: 'Bairro faltando' },
    { value: 'DOENCA_NAO_INFORMADA',     label: 'Doença não informada' },
    { value: 'CLASSIFICACAO_FALTANDO',   label: 'Classificação faltando' },
    { value: 'DATA_FALTANDO',            label: 'Data faltando' },
    { value: 'SEXO_NAO_INFORMADO',       label: 'Sexo não informado' },
    { value: 'EVOLUCAO_NAO_INFORMADA',   label: 'Evolução não informada' },
    { value: 'DATA_NASCIMENTO_FALTANDO', label: 'Data de nascimento faltando' },
    { value: 'OUTROS',                   label: 'Outros' },
];

const CATEGORY_BADGE: Record<string, string> = {
    BAIRRO_FALTANDO:          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    DOENCA_NAO_INFORMADA:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CLASSIFICACAO_FALTANDO:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    DATA_FALTANDO:            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SEXO_NAO_INFORMADO:       'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    EVOLUCAO_NAO_INFORMADA:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    DATA_NASCIMENTO_FALTANDO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    OUTROS:                   'bg-gray-100 text-gray-700 dark:bg-meta-4 dark:text-bodydark1',
};

const DOENCA_LABEL: Record<string, string> = {
    A90:    'Dengue',
    'A92.0':'Chikungunya',
    A928:   'Zika',
};

function formatDate(epoch: number | null): string {
    if (!epoch) return '—';
    const d = new Date(epoch);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function toStartEpoch(dateStr: string): number {
    return new Date(dateStr + 'T00:00:00').getTime();
}
function toEndEpoch(dateStr: string): number {
    return new Date(dateStr + 'T23:59:59.999').getTime();
}

interface PageMeta { totalElements: number; totalPages: number; number: number; }

export default function GerenciarDados() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('upload');

    const [fileType, setFileType]           = useState<FileType>('xlsx');
    const [file, setFile]                   = useState<File | null>(null);
    const [fileName, setFileName]           = useState<string | null>(null);
    const [uploadError, setUploadError]     = useState<string | null>(null);
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [openSuccessModal, setOpenSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage]     = useState('Arquivo processado com sucesso!');
    const [asyncPending, setAsyncPending]   = useState(false);
    const [latestDates, setLatestDates] = useState<{ dengue: string | null; chikungunya: string | null; zika: string | null } | null>(null);

    const [category, setCategory]   = useState('');
    const [doencaErr, setDoencaErr] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate]     = useState('');
    const [errPage, setErrPage]     = useState(0);

    const [data, setData]       = useState<NotificationRecord[]>([]);
    const [meta, setMeta]       = useState<PageMeta | null>(null);
    const [loading, setLoading] = useState(false);

    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfLoading, setPdfLoading]     = useState(false);
    const [pdfError, setPdfError]         = useState<string | null>(null);

    useEffect(() => {
        api.get('/notifications/latest-date')
            .then(res => setLatestDates(res.data?.data ?? null))
            .catch(() => setLatestDates(null));
    }, []);

    function handleTypeChange(type: FileType) {
        setFileType(type);
        setFile(null);
        setFileName(null);
        setUploadError(null);
        setAsyncPending(false);
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        setUploadError(null);
        setFile(null);
        setFileName(null);
        setAsyncPending(false);
        const uploaded = event.target.files?.[0];
        if (uploaded) {
            const validationError = validateUploadFile(uploaded, [fileType]);
            if (validationError) {
                setUploadError(validationError);
                event.target.value = '';
                return;
            }
            setFile(uploaded);
            setFileName(uploaded.name);
        }
    }

    async function handleUpload() {
        if (!file) { alert('Por favor, selecione um arquivo primeiro.'); return; }
        const formData = new FormData();
        formData.append('file', file);
        try {
            setLoadingUpload(true);
            setAsyncPending(false);
            const { endpoint } = FILE_TYPE_CONFIG[fileType];
            const response = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setFile(null);
            setFileName(null);
            if (response.status === 202) {
                setAsyncPending(true);
            } else if (response.status === 200 || response.status === 201) {
                const body = response.data;
                let msg = body?.message || 'Arquivo processado com sucesso!';
                const dataInfo = body?.data;
                if (dataInfo !== undefined && dataInfo !== null) {
                    if (typeof dataInfo === 'object') {
                        const entries = Object.entries(dataInfo as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(', ');
                        if (entries) msg += ` (${entries})`;
                    } else {
                        msg += ` — ${dataInfo} registros processados.`;
                    }
                }
                setSuccessMessage(msg);
                setOpenSuccessModal(true);
            } else if (response.status === 401) {
                navigate('/auth/login');
            } else {
                setUploadError('Falha no envio do arquivo.');
            }
        } catch (error: any) {
            setUploadError(error?.response?.data?.message || 'Ocorreu um erro ao enviar o arquivo.');
        } finally {
            setLoadingUpload(false);
        }
    }

    async function fetchErrors() {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page: errPage, size: 20 };
            if (category)  params.category  = category;
            if (doencaErr) params.idAgravo  = doencaErr;
            if (startDate) params.startDate = toStartEpoch(startDate);
            if (endDate)   params.endDate   = toEndEpoch(endDate);
            const res = await api.get('/notifications/errors/manage', { params });
            const pageData = res.data?.data;
            setData(pageData?.content ?? []);
            setMeta({ totalElements: pageData?.totalElements, totalPages: pageData?.totalPages, number: pageData?.number });
        } catch { /* silently */ }
        finally { setLoading(false); }
    }

    useEffect(() => { setErrPage(0); }, [category, doencaErr, startDate, endDate, tab]);

    useEffect(() => {
        if (tab === 'erros') fetchErrors();
    }, [tab, errPage, category, doencaErr, startDate, endDate]);

    function handleTabChange(t: Tab) {
        setTab(t);
        setData([]);
        setMeta(null);
    }

    function buildActiveFilters(useCategory: boolean) {
        return {
            category:  useCategory && category  ? category  : undefined,
            idAgravo:  doencaErr                ? doencaErr : undefined,
            startDate: startDate                ? toStartEpoch(startDate) : undefined,
            endDate:   endDate                  ? toEndEpoch(endDate)     : undefined,
        };
    }

    async function handleExportPdf(useCategory: boolean) {
        setPdfLoading(true);
        setPdfError(null);
        try {
            await downloadErrorsPdfReport(buildActiveFilters(useCategory));
            setPdfModalOpen(false);
        } catch (err: any) {
            setPdfError(err?.message ?? 'Erro ao gerar o PDF.');
        } finally {
            setPdfLoading(false);
        }
    }

    const hasAnyFilter = !!(category || doencaErr || startDate || endDate);
    const categoryLabel = ERROR_CATEGORIES.find(c => c.value === category)?.label ?? '';
    const doencaLabel   = DOENCAS.find(d => d.value === doencaErr)?.label ?? '';

    function isoToBR(iso: string): string {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    function activeFiltersSummary(): string {
        const parts: string[] = [];
        if (category)  parts.push(`Problema: ${categoryLabel}`);
        if (doencaErr) parts.push(`Doença: ${doencaLabel}`);
        if (startDate) parts.push(`De: ${isoToBR(startDate)}`);
        if (endDate)   parts.push(`Até: ${isoToBR(endDate)}`);
        return parts.join(' | ');
    }

    const thCls = 'px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-bodydark2 uppercase tracking-wide';
    const tdCls = 'px-3 py-2 text-sm text-gray-700 dark:text-bodydark whitespace-nowrap';

    return (
        <DefaultLayout>
            <div className="mx-auto p-6">
                <h2 className="text-2xl font-semibold text-indigo-600 mb-5">Gerir Notificações</h2>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-strokedark mb-6">
                    {([['upload', 'Importar Notificações'], ['erros', 'Dados com Algum Erro']] as [Tab, string][]).map(([t, label]) => (
                        <button
                            key={t}
                            onClick={() => handleTabChange(t)}
                            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
                                tab === t
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 dark:text-bodydark2 hover:text-gray-700 dark:hover:text-bodydark'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Aba Upload ── */}
                {tab === 'upload' && (
                    <div className="bg-white dark:bg-boxdark shadow-md rounded-lg p-6">
                        <div className="flex flex-wrap justify-center gap-3 mb-6">
                            {[
                                { key: 'dengue'      as const, label: 'Dengue',      cls: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300' },
                                { key: 'chikungunya' as const, label: 'Chikungunya', cls: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300' },
                                { key: 'zika'        as const, label: 'Zika',        cls: 'border-teal-200   bg-teal-50   text-teal-700   dark:border-teal-800   dark:bg-teal-900/20   dark:text-teal-300'   },
                            ].map(({ key, label, cls }) => (
                                <div key={key} className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${cls}`}>
                                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>
                                        <strong>{label}</strong>
                                        {latestDates?.[key]
                                            ? <> atualizado até <strong>{latestDates[key]}</strong></>
                                            : <span className="opacity-60"> — sem dados</span>
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-700 dark:text-bodydark font-medium mb-3 text-center">Selecione o formato do arquivo</p>
                            <div className="flex justify-center gap-4 flex-wrap">
                                {(Object.keys(FILE_TYPE_CONFIG) as FileType[]).map((type) => (
                                    <label
                                        key={type}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition select-none ${
                                            fileType === type
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                                                : 'border-gray-300 dark:border-strokedark text-gray-600 dark:text-bodydark2 hover:border-indigo-400 dark:hover:border-indigo-500'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="fileType"
                                            value={type}
                                            checked={fileType === type}
                                            onChange={() => handleTypeChange(type)}
                                            className="accent-indigo-600"
                                        />
                                        {FILE_TYPE_CONFIG[type].label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-indigo-400 dark:border-indigo-600 rounded-lg p-6 text-center">
                            <p className="text-gray-700 dark:text-bodydark font-medium">Arraste e solte seu arquivo aqui ou</p>
                            <label htmlFor="file-upload-manage" className="inline-block mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md cursor-pointer hover:bg-indigo-700 transition">
                                Escolher arquivo
                                <input
                                    id="file-upload-manage"
                                    type="file"
                                    className="sr-only"
                                    accept={FILE_TYPE_CONFIG[fileType].accept}
                                    onChange={handleFileChange}
                                />
                            </label>
                            {fileName && <p className="mt-2 text-green-600 dark:text-meta-3 font-medium">Arquivo selecionado: {fileName}</p>}
                            <p className="mt-2 text-xs text-gray-500 dark:text-bodydark2">Tamanho maximo: {MAX_UPLOAD_LABEL}.</p>
                            {uploadError && <p className="mt-3 text-red-600 dark:text-meta-1">{uploadError}</p>}
                        </div>

                        {asyncPending && (
                            <div className="mt-4 flex items-start gap-3 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-yellow-800 dark:text-yellow-300">
                                <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="font-semibold">Arquivo recebido — processamento em andamento</p>
                                    <p className="text-sm mt-1">O servidor está processando os dados em segundo plano. Isso pode levar alguns minutos.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                            <button
                                onClick={handleUpload}
                                disabled={!file || loadingUpload}
                                className="flex items-center justify-center bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                            >
                                {loadingUpload && (
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                Enviar Arquivo
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Filtros aba erros ── */}
                {tab === 'erros' && (
                    <div className="rounded-lg border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-4 mb-5 shadow-sm">
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Problema */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-bodydark2 uppercase tracking-wide">Problema</label>
                                <select
                                    value={category} onChange={e => setCategory(e.target.value)}
                                    className="rounded border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input text-gray-800 dark:text-bodydark px-3 py-1.5 text-sm w-52 focus:border-indigo-500 focus:outline-none"
                                >
                                    {ERROR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>

                            {/* Doença */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-500 dark:text-bodydark2 uppercase tracking-wide">Doença</label>
                                <select
                                    value={doencaErr} onChange={e => setDoencaErr(e.target.value)}
                                    className="rounded border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input text-gray-800 dark:text-bodydark px-3 py-1.5 text-sm w-44 focus:border-indigo-500 focus:outline-none"
                                >
                                    {DOENCAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>

                            {/* Data dos primeiros sintomas — início */}
                            <DatePickerBR
                                label="Sintomas a partir de"
                                value={startDate}
                                maxDate={endDate || undefined}
                                onChange={setStartDate}
                            />

                            {/* Data dos primeiros sintomas — fim */}
                            <DatePickerBR
                                label="Sintomas até"
                                value={endDate}
                                minDate={startDate || undefined}
                                onChange={setEndDate}
                            />

                            {/* Limpar filtros */}
                            {hasAnyFilter && (
                                <button
                                    onClick={() => { setCategory(''); setDoencaErr(''); setStartDate(''); setEndDate(''); }}
                                    className="rounded border border-gray-300 dark:border-strokedark px-3 py-1.5 text-sm text-gray-500 dark:text-bodydark2 hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                                >
                                    Limpar filtros
                                </button>
                            )}

                            {/* Exportar PDF */}
                            <button
                                onClick={() => { setPdfError(null); setPdfModalOpen(true); }}
                                className="ml-auto flex items-center gap-2 rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                Exportar PDF
                            </button>
                        </div>

                        {hasAnyFilter && (
                            <p className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                Filtros ativos: {activeFiltersSummary()}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Tabela erros ── */}
                {tab === 'erros' && (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark shadow-sm">
                        {loading ? (
                            <div className="flex justify-center items-center py-16">
                                <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : data.length === 0 ? (
                            <p className="py-16 text-center text-gray-400 dark:text-bodydark2">Nenhum registro encontrado.</p>
                        ) : (
                            <table className="min-w-full">
                                <thead className="bg-gray-50 dark:bg-meta-4 border-b border-gray-200 dark:border-strokedark">
                                    <tr>
                                        <th className={thCls}>Doença</th>
                                        <th className={thCls}>1º sintoma</th>
                                        <th className={thCls}>Bairro</th>
                                        <th className={thCls}>Sexo</th>
                                        <th className={thCls}>Classificação</th>
                                        <th className={thCls}>Evolução</th>
                                        <th className={thCls}>Sem. Epid.</th>
                                        <th className={thCls}>Problema</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-strokedark">
                                    {data.map(row => (
                                        <tr key={row.idNotification} className="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                                            <td className={tdCls}>{DOENCA_LABEL[row.idAgravo ?? ''] ?? row.idAgravo ?? '—'}</td>
                                            <td className={tdCls}>{formatDate(row.dataPrimeiroSintoma)}</td>
                                            <td className={tdCls}>{row.nomeBairro || '—'}</td>
                                            <td className={tdCls}>{row.sexo || '—'}</td>
                                            <td className={tdCls}>{row.classificacao || '—'}</td>
                                            <td className={tdCls}>{row.evolucao || '—'}</td>
                                            <td className={`${tdCls} text-center`}>{row.semanaEpidemiologica || '—'}</td>
                                            <td className={tdCls}>
                                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[row.category ?? 'OUTROS'] ?? CATEGORY_BADGE.OUTROS}`}>
                                                    {ERROR_CATEGORIES.find(c => c.value === row.category)?.label ?? 'Outros'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ── Paginação ── */}
                {tab === 'erros' && meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-bodydark">
                        <span>{meta.totalElements} registros — Página {meta.number + 1} de {meta.totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setErrPage(p => Math.max(0, p - 1))}
                                disabled={errPage === 0}
                                className="rounded border border-gray-300 dark:border-strokedark px-3 py-1 text-gray-600 dark:text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-40 transition"
                            >
                                ← Anterior
                            </button>
                            <button
                                onClick={() => setErrPage(p => Math.min((meta.totalPages ?? 1) - 1, p + 1))}
                                disabled={errPage >= (meta.totalPages ?? 1) - 1}
                                className="rounded border border-gray-300 dark:border-strokedark px-3 py-1 text-gray-600 dark:text-bodydark hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-40 transition"
                            >
                                Próxima →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <SuccessModal
                openModal={openSuccessModal}
                handleModalClose={() => setOpenSuccessModal(false)}
                message={successMessage}
                position="center"
            />

            {/* ── Modal PDF ── */}
            {pdfModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white dark:bg-boxdark p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <svg className="h-5 w-5 text-red-600 dark:text-meta-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-bodydark1">Exportar relatório PDF</h3>
                        </div>

                        {hasAnyFilter ? (
                            <>
                                <p className="text-sm text-gray-600 dark:text-bodydark mb-1">
                                    Você possui filtros ativos. Como deseja exportar?
                                </p>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-4">
                                    {activeFiltersSummary()}
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => handleExportPdf(true)}
                                        disabled={pdfLoading}
                                        className="flex items-center justify-center gap-2 rounded-lg border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-60 transition"
                                    >
                                        {pdfLoading ? (
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                                            </svg>
                                        )}
                                        Exportar apenas com os filtros ativos
                                    </button>

                                    <button
                                        onClick={() => handleExportPdf(false)}
                                        disabled={pdfLoading}
                                        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-strokedark px-4 py-3 text-sm font-medium text-gray-700 dark:text-bodydark hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-60 transition"
                                    >
                                        Exportar todos os dados com erros
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 dark:text-bodydark mb-5">
                                    Nenhum filtro aplicado. Deseja exportar <strong>todos os dados com erros</strong>?
                                </p>
                                <button
                                    onClick={() => handleExportPdf(false)}
                                    disabled={pdfLoading}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition"
                                >
                                    {pdfLoading && (
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    )}
                                    {pdfLoading ? 'Gerando PDF...' : 'Sim, exportar todos'}
                                </button>
                            </>
                        )}

                        {pdfError && (
                            <p className="mt-3 text-sm text-red-600 dark:text-meta-1">{pdfError}</p>
                        )}

                        <button
                            onClick={() => { setPdfModalOpen(false); setPdfError(null); }}
                            disabled={pdfLoading}
                            className="mt-3 w-full rounded-lg px-4 py-2 text-sm text-gray-500 dark:text-bodydark2 hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-60 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </DefaultLayout>
    );
}
