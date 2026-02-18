export function openReportCardPdf(reportCardId: number) {
  const url = `${import.meta.env.VITE_API_URL}/report-cards/${reportCardId}/pdf`;
  window.open(url, "_blank");
}
