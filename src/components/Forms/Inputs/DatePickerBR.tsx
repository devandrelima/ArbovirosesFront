import { useEffect, useId, useState } from 'react';

interface Props {
    /** Valor interno no formato YYYY-MM-DD (ou vazio). */
    value: string;
    onChange: (isoValue: string) => void;
    label?: string;
    placeholder?: string;
    /** Data mínima, formato YYYY-MM-DD. */
    minDate?: string;
    /** Data máxima, formato YYYY-MM-DD. */
    maxDate?: string;
    className?: string;
    inputClassName?: string;
    id?: string;
}

/** Aplica a máscara dd/mm/aaaa a uma string de dígitos brutos. */
function applyMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte dd/mm/aaaa → YYYY-MM-DD. Retorna null se inválido ou incompleto. */
function maskedToISO(masked: string): string | null {
    if (masked.length !== 10) return null;
    const [dd, mm, yyyy] = masked.split('/');
    if (!dd || !mm || !yyyy || yyyy.length !== 4) return null;
    const d = parseInt(dd, 10);
    const m = parseInt(mm, 10);
    const y = parseInt(yyyy, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
    const date = new Date(y, m - 1, d);
    // Verifica se a data resultante bate com os inputs (evita 31/02, etc.)
    if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
    return `${yyyy}-${mm}-${dd}`;
}

/** Converte YYYY-MM-DD → dd/mm/aaaa. */
function isoToMasked(iso: string): string {
    if (!iso || iso.length !== 10) return '';
    const [yyyy, mm, dd] = iso.split('-');
    return `${dd}/${mm}/${yyyy}`;
}

export function DatePickerBR({
    value,
    onChange,
    label,
    placeholder = 'dd/mm/aaaa',
    minDate,
    maxDate,
    className = '',
    inputClassName = '',
    id,
}: Props) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const [display, setDisplay] = useState(() => isoToMasked(value));
    const [error, setError]     = useState('');

    // Sincroniza quando o pai limpa o valor (ex.: "Limpar filtros")
    useEffect(() => {
        const expected = isoToMasked(value);
        if (expected !== display) {
            setDisplay(expected);
            setError('');
        }
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw    = e.target.value;
        const masked = applyMask(raw);
        setDisplay(masked);

        if (masked === '') {
            setError('');
            onChange('');
            return;
        }

        if (masked.length < 10) {
            setError('');
            onChange('');
            return;
        }

        const iso = maskedToISO(masked);
        if (!iso) {
            setError('Data inválida');
            onChange('');
            return;
        }

        if (minDate && iso < minDate) {
            setError(`Data anterior ao início permitido`);
            onChange('');
            return;
        }

        if (maxDate && iso > maxDate) {
            setError(`Data posterior ao fim permitido`);
            onChange('');
            return;
        }

        setError('');
        onChange(iso);
    }

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium text-gray-500 dark:text-bodydark2 uppercase tracking-wide">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                type="text"
                inputMode="numeric"
                value={display}
                onChange={handleChange}
                placeholder={placeholder}
                maxLength={10}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className={`rounded border px-3 py-1.5 text-sm w-40 bg-white dark:bg-form-input text-gray-800 dark:text-bodydark placeholder-gray-400 dark:placeholder-bodydark2 focus:outline-none transition ${inputClassName} ${
                    error
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-gray-300 dark:border-form-strokedark focus:border-indigo-500'
                }`}
            />
            {error && (
                <span id={errorId} className="text-xs text-red-500 dark:text-meta-1">{error}</span>
            )}
        </div>
    );
}
