const VARIANT_BY_STATUS = {
  Lead: "info",
  Active: "success",
  Inactive: "neutral",
  Draft: "warning",
  Confirmed: "success",
  Cancelled: "danger",
  IN: "success",
  OUT: "danger",
};

export default function StatusBadge({ status }) {
  const variant = VARIANT_BY_STATUS[status] || "neutral";
  return <span className={`badge badge-${variant}`}>{status}</span>;
}
