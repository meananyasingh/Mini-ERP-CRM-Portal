import apiClient from "./client";

export function login(email, password) {
  return apiClient.post("/auth/login", { email, password });
}

export function getCurrentUser() {
  return apiClient.get("/auth/me");
}

export function listUsers() {
  return apiClient.get("/auth/users");
}

export function createUser(payload) {
  return apiClient.post("/auth/users", payload);
}
