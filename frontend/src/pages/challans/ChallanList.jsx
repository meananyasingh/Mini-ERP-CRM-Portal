import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { listChallans } from "../../api/challans";
import { listCustomers } from "../../api/customers";
import { parseApiError } from "../../utils/apiError";
import { useAuth } from "../../context/AuthContext";
import { canWriteChallanDraft } from "../../utils/permissions";

const STATUS_OPTIONS = ["Draft", "Confirmed", "Cancelled"];
const LIMIT = 10;

export default function ChallanList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const page = Number(searchParams.get("page")) || 1;
  const status = searchParams.get("status") || "";
  const customerId = searchParams.get("customerId") || "";

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  useEffect(() => {
    listCustomers({ page: 1, limit: 100 })
      .then((response) => setCustomerOptions(response.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    listChallans({ status, customerId, page, limit: LIMIT })
      .then((response) => {
        setRows(response.data.data);
        setMeta(response.data.meta);
      })
      .catch((err) => setError(parseApiError(err).message))
      .finally(() => setLoading(false));
  }, [status, customerId, page]);

  const columns = [
    { key: "challanNumber", header: "Challan #", render: (row) => <strong>{row.challanNumber}</strong> },
    {
      key: "customer",
      header: "Customer",
      render: (row) => row.customerSnapshot?.name || row.customer?.name || "—",
    },
    { key: "totalQuantity", header: "Total qty", align: "right" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "createdAt", header: "Created", render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Challans</h1>
          <p>Delivery challans and dispatch records.</p>
        </div>
        {canWriteChallanDraft(user?.role) && (
          <Link to="/challans/new" className="btn btn-primary">
            New challan
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        emptyMessage="No challans match your filters."
        onRowClick={(row) => navigate(`/challans/${row.id}`)}
        filters={
          <>
            <select value={status} onChange={(e) => updateParams({ status: e.target.value, page: "1" })}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={customerId}
              onChange={(e) => updateParams({ customerId: e.target.value, page: "1" })}
              style={{ maxWidth: 220 }}
            >
              <option value="">All customers</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
        pagination={{
          page,
          totalPages: meta.totalPages,
          total: meta.total,
          limit: LIMIT,
          onPageChange: (nextPage) => updateParams({ page: String(nextPage) }),
        }}
      />
    </div>
  );
}
