import api from "../api/Api";

export interface ErrorsReportFilters {
    category?: string;
    startDate?: number;
    endDate?: number;
    idAgravo?: string;
}

export async function downloadErrorsPdfReport(filters: ErrorsReportFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.startDate != null) params.set("startDate", String(filters.startDate));
    if (filters.endDate != null) params.set("endDate", String(filters.endDate));
    if (filters.idAgravo) params.set("idAgravo", filters.idAgravo);

    const queryString = params.toString();
    const response = await api.get(`/notifications/errors/pdf${queryString ? "?" + queryString : ""}`, {
        responseType: "blob",
    });

    const blob = response.data;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    const hasFilters = Object.values(filters).some(value => value != null && value !== "");
    link.download = filters.category
        ? `erros-${filters.category.toLowerCase()}.pdf`
        : hasFilters ? "erros-filtrados.pdf" : "erros-todos.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
}
