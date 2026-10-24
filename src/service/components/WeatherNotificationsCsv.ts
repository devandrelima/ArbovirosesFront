import api from "../api/Api";

async function downloadCsv(endpoint: string, filename: string): Promise<void> {
    const response = await api.get(endpoint, { responseType: "blob" });

    const downloadUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
}

export function downloadNotificationsWithWeatherCsv(): Promise<void> {
    return downloadCsv("/weather/export/notifications", "notifications_com_clima.csv");
}

export function downloadDailyCityWeatherCsv(): Promise<void> {
    return downloadCsv("/weather/export/daily", "clima_diario_cidade.csv");
}
