import * as XLSX from 'xlsx';
import api from '../../service/api/Api';

interface NotificationError {
  idNotification: number;
  idAgravo: string;
  idadePaciente: number;
  dataNotification: string;
  dataPrimeiroSintoma: string;
  dataNascimento: string | null;
  classificacao: string;
  sexo: string;
  idBairro: number;
  nomeBairro: string;
  evolucao: string;
  semanaEpidemiologica: number;
  iteration: number;
}

function formatarData(data: string | null): string | null {
  if (!data) return null;
  const dateObj = new Date(data);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toLocaleDateString('pt-BR'); // dd/MM/yyyy
}

export default async function gerarArquivoComErros() {
  try {
    const response = await api.get<{ data: NotificationError[] }>('/notifications/errors');
    const data = response.data.data;

    const headers = [
      'NU_NOTIFIC', 'ID_AGRAVO', 'DT_NOTIFIC', 'DT_SIN_PRI',
      'DT_NASC', 'CLASSI_FIN', 'CS_SEXO', 'ID_BAIRRO',
      'NM_BAIRRO', 'EVOLUCAO'
    ];

    const worksheetData = [
      headers,
      ...data.map(item => [
        item.idNotification,
        item.idAgravo,
        formatarData(item.dataNotification),
        formatarData(item.dataPrimeiroSintoma),
        formatarData(item.dataNascimento),
        item.classificacao,
        item.sexo,
        item.idBairro, 
        item.nomeBairro, 
        item.evolucao
      ].map(value => value ?? 'DADO NÃO INFORMADO'))
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    XLSX.utils.book_append_sheet(wb, ws, 'Notificações com erro');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });

    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notificacoes_incompletas.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar o arquivo:', error);
    alert('Erro ao gerar o arquivo com erros.');
  }
}
