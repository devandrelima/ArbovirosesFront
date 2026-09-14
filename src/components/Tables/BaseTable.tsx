import { NeighborhoodInfo } from "../Entity/NeighborhoodInfo";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface BaseTableProps {
  neighborhoodData: NeighborhoodInfo[]
}

const BaseTable: React.FC<BaseTableProps> = ({neighborhoodData}) => {
  const navigate = useNavigate();
  const [rowsPerPage, setRowsPerPage] = useState<5 | 10 | 'all'>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const validNeighborhoodData = Array.isArray(neighborhoodData) ? neighborhoodData : [];

  const totalPages = rowsPerPage === 'all'
    ? 1
    : Math.max(1, Math.ceil(validNeighborhoodData.length / rowsPerPage));
  const visibleNeighborhoods = rowsPerPage === 'all'
    ? validNeighborhoodData
    : validNeighborhoodData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [neighborhoodData]);

  const irParaDashboardBairro = (nameBairro: String) => {
    const bairros = validNeighborhoodData.map((n) => n.nomeBairro).filter(Boolean).sort();
    navigate("/dashboard/bairro", { state: { bairro: nameBairro, bairros } });
  };

  // Validação de dados
  if (!neighborhoodData || !Array.isArray(neighborhoodData)) {
    return (
      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <p className="text-center py-4 text-black dark:text-white">
          Nenhum dado disponível
        </p>
      </div>
    );
  }

  if (neighborhoodData.length === 0) {
    return (
      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <p className="text-center py-4 text-black dark:text-white">
          Nenhum bairro encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                Bairros
              </th>
              <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                Notificados
              </th>
              <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                Curados
              </th>
              <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                Obitos
              </th>
              <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                Ignorados
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleNeighborhoods.map((neighborhoodItem, key) => (
              <tr key={`${neighborhoodItem.nomeBairro}-${(currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + key}`}>
                <td className="border-b border-[#eee] py-5 px-4 pl-9 dark:border-strokedark xl:pl-11">
                  <p 
                    onClick={() => irParaDashboardBairro(neighborhoodItem.nomeBairro || 'Desconhecido')}
                    className="font-medium text-primary hover:underline hover:cursor-pointer dark:text-primarydark"
                  >
                    {neighborhoodItem.nomeBairro || 'Não informado'}
                  </p>
                </td>
                <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {neighborhoodItem.casosReportados ?? 0}
                  </p>
                </td>
                <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {neighborhoodItem.curados ?? 0}
                  </p>
                </td>
                <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {neighborhoodItem.mortePorAgravo ?? 0}
                  </p>
                </td>
                <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {neighborhoodItem.igorados ?? neighborhoodItem.igorados ?? 0}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-body dark:text-bodydark">
          Exibir
          <select
            value={rowsPerPage}
            onChange={(event) => {
              const value = event.target.value;
              setRowsPerPage(value === 'all' ? 'all' : Number(value) as 5 | 10);
              setCurrentPage(1);
            }}
            className="rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            aria-label="Quantidade de bairros por página"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value="all">Todos</option>
          </select>
          bairros
        </label>

        {rowsPerPage !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded border border-stroke px-3 py-2 text-sm text-black transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-white"
            >
              Anterior
            </button>
            <span className="text-sm text-body dark:text-bodydark">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-stroke px-3 py-2 text-sm text-black transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-white"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseTable;
