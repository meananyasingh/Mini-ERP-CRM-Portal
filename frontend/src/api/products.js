import apiClient from "./client";

export function listProducts(params) {
  return apiClient.get("/products", { params });
}

export function getProduct(id) {
  return apiClient.get(`/products/${id}`);
}

export function createProduct(payload) {
  return apiClient.post("/products", payload);
}

export function updateProduct(id, payload) {
  return apiClient.put(`/products/${id}`, payload);
}

export function listStockMovements(productId, params) {
  return apiClient.get(`/products/${productId}/stock-movements`, { params });
}

export function adjustStock(productId, payload) {
  return apiClient.post(`/products/${productId}/stock-adjust`, payload);
}
