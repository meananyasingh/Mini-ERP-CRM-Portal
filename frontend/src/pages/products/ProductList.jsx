import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DataTable from "../../components/DataTable";
import { listProducts } from "../../api/products";
import { parseApiError } from "../../utils/apiError";
import useDebouncedValue from "../../utils/useDebouncedValue";
import { useAuth } from "../../context/AuthContext";
import { canWriteProducts } from "../../utils/permissions";

const LIMIT = 10;

function isLowStock(product) {
  return product.currentStock <= product.minStockAlert;
}

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";
  const lowStock = searchParams.get("lowStock") === "true";
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
    listProducts({
      search: searchParams.get("search") || "",
      category,
      lowStock: lowStock || undefined,
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
  }, [searchParams.get("search"), category, lowStock, page]);

  const columns = [
    { key: "name", header: "Name", render: (row) => <strong>{row.name}</strong> },
    { key: "sku", header: "SKU" },
    { key: "category", header: "Category", render: (row) => row.category || "—" },
    {
      key: "unitPrice",
      header: "Unit price",
      align: "right",
      render: (row) => `₹${Number(row.unitPrice).toFixed(2)}`,
    },
    {
      key: "currentStock",
      header: "Stock",
      align: "right",
      render: (row) => (
        <span className={isLowStock(row) ? "text-danger" : undefined} style={{ fontWeight: 600 }}>
          {row.currentStock}
          {isLowStock(row) && " ⚠"}
        </span>
      ),
    },
    { key: "minStockAlert", header: "Min alert", align: "right" },
    { key: "location", header: "Location", render: (row) => row.location || "—" },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="table-actions">
          <Link
            to={`/products/${row.id}/stock-movements`}
            className="btn btn-secondary btn-sm"
            onClick={(e) => e.stopPropagation()}
          >
            Stock log
          </Link>
          {canWriteProducts(user?.role) && (
            <Link
              to={`/products/${row.id}/edit`}
              className="btn btn-secondary btn-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Products</h1>
          <p>Catalogue and stock levels.</p>
        </div>
        {canWriteProducts(user?.role) && (
          <Link to="/products/new" className="btn btn-primary">
            New product
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        emptyMessage="No products match your filters."
        onRowClick={(row) => navigate(`/products/${row.id}/stock-movements`)}
        rowClassName={(row) => (isLowStock(row) ? "is-flagged" : "")}
        search={{
          value: searchInput,
          onChange: setSearchInput,
          placeholder: "Search name, SKU...",
        }}
        filters={
          <>
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => updateParams({ category: e.target.value, page: "1" })}
              style={{ maxWidth: 160 }}
            />
            <label className="flex-row" style={{ fontSize: 13, fontWeight: 500 }}>
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={lowStock}
                onChange={(e) => updateParams({ lowStock: e.target.checked ? "true" : "", page: "1" })}
              />
              Low stock only
            </label>
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
