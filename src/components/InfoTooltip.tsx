import React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';

interface InfoTooltipProps {
  text: string;
  label?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, label = 'Mais informações' }) => {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        role="img"
        aria-label={`${label}: ${text}`}
        className="inline-flex h-5 w-5 cursor-help items-center justify-center text-gray-500 transition group-hover:text-primary dark:text-gray-400"
      >
        <IconInfoCircle size={17} stroke={2} aria-hidden="true" />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[1000] mb-2 w-64 -translate-x-1/2 rounded-md bg-black px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-black dark:border-t-gray-700" />
      </span>
    </span>
  );
};

export default InfoTooltip;
