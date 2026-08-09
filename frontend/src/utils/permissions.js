// Central permission matrix mirroring CONTRACT.md section 1.
// Each helper answers "can a user with this role do X?".

export const ROLES = ["admin", "sales", "warehouse", "accounts"];

export function canManageUsers(role) {
  return role === "admin";
}

export function canWriteCustomers(role) {
  return role === "admin" || role === "sales";
}

export function canWriteFollowUps(role) {
  return role === "admin" || role === "sales";
}

export function canWriteProducts(role) {
  return role === "admin" || role === "warehouse";
}

export function canWriteStockMovements(role) {
  return role === "admin" || role === "warehouse";
}

export function canWriteChallanDraft(role) {
  return role === "admin" || role === "sales";
}

export function canConfirmOrCancelChallan(role) {
  return role === "admin" || role === "sales";
}

export function canViewChallanPdf(_role) {
  // All authenticated roles may view/download the PDF per contract.
  return true;
}
