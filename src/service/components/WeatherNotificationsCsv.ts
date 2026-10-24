import api from "../api/Api";

export async function downloadNotificationsWithWeatherCsv(): Promise<void> {
    const response = await api.get("/weather/export/notifications", {
        responseType: "blob",
    });

    const downloadUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "notifications_com_clima.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
}
