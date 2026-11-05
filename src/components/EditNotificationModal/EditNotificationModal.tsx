import { useEffect, useState } from 'react';
import api from '../../service/api/Api';
import { digitsOnly, sanitizeDateBR, sanitizeSafeCode, sanitizeSafeText } from '../../common/input/InputSecurity';

export interface NotificationRecord {
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

interface Props {
    record: NotificationRecord;
    onClose: () => void;
    onSaved: () => void;
    isErrorRecord?: boolean;
}

const DOENCAS = [
    { value: 'A90',   label: 'Dengue' },
    { value: 'A92.0', label: 'Chikungunya' },
    { value: 'A928',  label: 'Zika' },
];

const SEXOS = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' },
    { value: 'I', label: 'Ignorado' },
];

function epochToInput(epoch: number | null): string {
    if (!epoch) return '';
    const d = new Date(epoch);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export default function EditNotificationModal({ record, onClose, onSaved, isErrorRecord }: Props) {
    const [idAgravo, setIdAgravo] = useState(record.idAgravo ?? '');
    const [dtNotific, setDtNotific] = useState(epochToInput(record.dataNotification));
    const [dtSinPri, setDtSinPri] = useState(epochToInput(record.dataPrimeiroSintoma));
    const [dtNasc, setDtNasc] = useState(epochToInput(record.dataNascimento));
    const [classiFin, setClassiFin] = useState(record.classificacao ?? '');
    const [csSexo, setCsSexo] = useState(record.sexo ?? '');
    const [nmBairro, setNmBairro] = useState(record.nomeBairro ?? '');
    const [idBairro, setIdBairro] = useState(record.idBairro > 0 ? String(record.idBairro) : '');
    const [evolucao, setEvolucao] = useState(record.evolucao ?? '');
    const [idade, setIdade] = useState(record.idadePaciente > 0 ? String(record.idadePaciente) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    async function handleSave() {
        setSaving(true);
        setError(null);
        const endpoint = isErrorRecord
            ? `/notifications/errors/${record.idNotification}`
            : `/notifications/${record.idNotification}`;
        try {
            await api.put(endpoint, {
                idAgravo: idAgravo || null,
                dtNotific: dtNotific || null,
                dtSinPri: dtSinPri || null,
                dtNasc: dtNasc || null,
                classiFin: classiFin || null,
                csSexo: csSexo || null,
                nmBairro: nmBairro || null,
                idBairro: idBairro ? Number(idBairro) : null,
                evolucao: evolucao || null,
                idade: idade ? Number(idade) : null,
            });
            onSaved();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    const inputCls = 'w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none';
    const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="text-lg font-semibold text-indigo-700">
                        Editar Notificação #{record.idNotification}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                <div className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-3">
                    <div>
                        <label className={labelCls}>Doença</label>
                        <select value={idAgravo} onChange={e => setIdAgravo(e.target.value)} className={inputCls}>
                            <option value="">Selecione...</option>
                            {DOENCAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Data Notificação (dd/MM/yyyy)</label>
                        <input value={dtNotific} onChange={e => setDtNotific(sanitizeDateBR(e.target.value))} className={inputCls} placeholder="dd/MM/yyyy" inputMode="numeric" maxLength={10} />
                    </div>
                    <div>
                        <label className={labelCls}>Primeiros sintomas (dd/MM/yyyy)</label>
                        <input value={dtSinPri} onChange={e => setDtSinPri(sanitizeDateBR(e.target.value))} className={inputCls} placeholder="dd/MM/yyyy" inputMode="numeric" maxLength={10} />
                    </div>
                    <div>
                        <label className={labelCls}>Data Nascimento (dd/MM/yyyy)</label>
                        <input value={dtNasc} onChange={e => setDtNasc(sanitizeDateBR(e.target.value))} className={inputCls} placeholder="dd/MM/yyyy" inputMode="numeric" maxLength={10} />
                    </div>
                    <div>
                        <label className={labelCls}>Sexo</label>
                        <select value={csSexo} onChange={e => setCsSexo(e.target.value)} className={inputCls}>
                            <option value="">Selecione...</option>
                            {SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Classificação Final</label>
                        <input value={classiFin} onChange={e => setClassiFin(sanitizeSafeCode(e.target.value, 20))} className={inputCls} placeholder="Ex: Confirmado" maxLength={20} />
                    </div>
                    <div>
                        <label className={labelCls}>Evolução</label>
                        <input value={evolucao} onChange={e => setEvolucao(sanitizeSafeCode(e.target.value, 20))} className={inputCls} placeholder="Ex: Cura" maxLength={20} />
                    </div>
                    <div>
                        <label className={labelCls}>Nome do Bairro</label>
                        <input value={nmBairro} onChange={e => setNmBairro(sanitizeSafeText(e.target.value, 120))} className={inputCls} maxLength={120} />
                    </div>
                    <div>
                        <label className={labelCls}>ID do Bairro</label>
                        <input type="number" value={idBairro} onChange={e => setIdBairro(digitsOnly(e.target.value, 6))} className={inputCls} min={0} max={999999} inputMode="numeric" />
                    </div>
                    <div>
                        <label className={labelCls}>Idade</label>
                        <input type="number" value={idade} onChange={e => setIdade(digitsOnly(e.target.value, 3))} className={inputCls} min={0} max={130} inputMode="numeric" />
                    </div>
                </div>

                {error && (
                    <p className="mx-6 mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <button onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 rounded bg-indigo-600 px-5 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                    >
                        {saving && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}
