import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { listCustomers } from "../../api/customers";
import { parseApiError } from "../../utils/apiError";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { useAuth } from "../../context/AuthContext";
import { canWriteCustomers } from "../../utils/permissions";

const STATUS_OPTIONS = ["Lead", "Active", "Inactive"];
const TYPE_OPTIONS = ["Retail", "Wholesale", "Distributor"];
const LIMIT = 10;

export default function CustomerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const page = Number(searchParams.get("page")) || 1;
  const status = searchParams.get("status") || "";
  const customerType = searchParams.get("customerType") || "";
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebouncedValue(searchInput);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch === currentSearch) return;
    updateParams({ search: debouncedSearch, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    setError("");
    listCustomers({
      search: searchParams.get("search") || "",
      status,
      customerType,
      page,
      limit: LIMIT,
    })
      .then((response) => {
        setRows(response.data.data);
        setMeta(response.data.meta);
      })
      .catch((err) => setError(parseApiError(err).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("search"), status, customerType, page]);

  const columns = [
    { key: "name", header: "Name", render: (row) => <strong>{row.name}</strong> },
    { key: "mobile", header: "Mobile" },
    { key: "businessName", header: "Business", render: (row) => row.businessName || "—" },
    { key: "customerType", header: "Type" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "nextFollowUpDate", header: "Next follow-up", render: (row) => row.nextFollowUpDate || "—" },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Customers</h1>
          <p>Track leads, accounts, and follow-ups.</p>
        </div>
        {canWriteCustomers(user?.role) && (
          <Link to="/customers/new" className="btn btn-primary">
            New customer
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        emptyMessage="No customers match your filters."
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: "Search name, mobile, email, business...",
        }}
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
              value={customerType}
              onChange={(e) => updateParams({ customerType: e.target.value, page: "1" })}
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
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
