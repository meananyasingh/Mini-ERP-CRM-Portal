import apiClient from "./client";

export function listCustomers(params) {
  return apiClient.get("/customers", { params });
}

export function getCustomer(id) {
  return apiClient.get(`/customers/${id}`);
}

export function createCustomer(payload) {
  return apiClient.post("/customers", payload);
}

export function updateCustomer(id, payload) {
  return apiClient.put(`/customers/${id}`, payload);
}

export function listFollowUps(customerId) {
  return apiClient.get(`/customers/${customerId}/followups`);
}

export function addFollowUp(customerId, payload) {
  return apiClient.post(`/customers/${customerId}/followups`, payload);
}
