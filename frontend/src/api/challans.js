import apiClient from "./client";

export function listChallans(params) {
  return apiClient.get("/challans", { params });
}

export function getChallan(id) {
  return apiClient.get(`/challans/${id}`);
}

export function createChallan(payload) {
  return apiClient.post("/challans", payload);
}

export function updateChallan(id, payload) {
  return apiClient.put(`/challans/${id}`, payload);
}

export function confirmChallan(id) {
  return apiClient.post(`/challans/${id}/confirm`);
}

export function cancelChallan(id) {
  return apiClient.post(`/challans/${id}/cancel`);
}

export function getChallanPdfUrl(id) {
  return `/challans/${id}/pdf`;
}

export function downloadChallanPdf(id) {
  return apiClient.get(`/challans/${id}/pdf`, { responseType: "blob" });
}
