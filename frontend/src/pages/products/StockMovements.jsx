import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { adjustStock, getProduct, listStockMovements } from "../../api/products";
import { parseApiError } from "../../utils/apiError";
import { useAuth } from "../../context/AuthContext";
import { canWriteStockMovements } from "../../utils/permissions";

const LIMIT = 10;

export default function StockMovements() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState("");

  const [movements, setMovements] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [quantityChanged, setQuantityChanged] = useState("");
  const [movementType, setMovementType] = useState("IN");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadProduct = () => {
    setProductLoading(true);
    getProduct(id)
      .then((response) => setProduct(response.data.data))
      .catch((err) => setProductError(parseApiError(err).message))
      .finally(() => setProductLoading(false));
  };

  const loadMovements = () => {
    setListLoading(true);
    setListError("");
    listStockMovements(id, { page, limit: LIMIT })
      .then((response) => {
        setMovements(response.data.data);
        setMeta(response.data.meta);
      })
      .catch((err) => setListError(parseApiError(err).message))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  const validate = () => {
    const errors = {};
    if (!quantityChanged || Number(quantityChanged) <= 0) {
      errors.quantityChanged = "Quantity must be greater than 0";
    }
    if (!reason.trim()) errors.reason = "Reason is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdjust = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await adjustStock(id, {
        quantityChanged: Number(quantityChanged),
        movementType,
        reason: reason.trim(),
      });
      setQuantityChanged("");
      setReason("");
      loadProduct();
      setPage(1);
      loadMovements();
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "createdAt", header: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: "movementType", header: "Type", render: (row) => <StatusBadge status={row.movementType} /> },
    { key: "quantityChanged", header: "Quantity", align: "right" },
    { key: "reason", header: "Reason" },
  ];

  if (productLoading) {
    return <div className="loading-block"><span className="spinner" />Loading product...</div>;
  }

  if (productError || !product) {
    return <div className="alert alert-error">{productError || "Product not found."}</div>;
  }

  const isLowStock = product.currentStock <= product.minStockAlert;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{product.name}</h1>
          <p>
            SKU {product.sku} {product.category && `· ${product.category}`}
          </p>
        </div>
        <div className="detail-value">
          Current stock:{" "}
          <strong className={isLowStock ? "text-danger" : undefined}>{product.currentStock}</strong>
          {isLowStock && (
            <span className="badge badge-danger" style={{ marginLeft: 8 }}>
              Low stock
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Movement log</h2>
        <DataTable
          columns={columns}
          rows={movements}
          loading={listLoading}
          error={listError}
          emptyMessage="No stock movements recorded yet."
          pagination={{
            page,
            totalPages: meta.totalPages,
            total: meta.total,
            limit: LIMIT,
            onPageChange: setPage,
          }}
        />
      </div>

      {canWriteStockMovements(user?.role) && (
        <div className="card">
          <h2>Adjust stock</h2>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleAdjust} noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="movementType">Movement type</label>
                <select
                  id="movementType"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                >
                  <option value="IN">IN (add stock)</option>
                  <option value="OUT">OUT (remove stock)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="quantityChanged">
                  Quantity<span className="required-mark">*</span>
                </label>
                <input
                  id="quantityChanged"
                  type="number"
                  min="1"
                  value={quantityChanged}
                  onChange={(e) => {
                    setQuantityChanged(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, quantityChanged: undefined }));
                  }}
                  className={fieldErrors.quantityChanged ? "has-error" : ""}
                />
                {fieldErrors.quantityChanged && (
                  <span className="field-error">{fieldErrors.quantityChanged}</span>
                )}
              </div>
              <div className="field form-grid-full">
                <label htmlFor="reason">
                  Reason<span className="required-mark">*</span>
                </label>
                <input
                  id="reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                  }}
                  className={fieldErrors.reason ? "has-error" : ""}
                />
                {fieldErrors.reason && <span className="field-error">{fieldErrors.reason}</span>}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Apply adjustment"}
              </button>
            </div>
          </form>
        </div>
      )}

      <button type="button" className="btn btn-ghost" onClick={() => navigate("/products")}>
        &larr; Back to products
      </button>
    </div>
  );
}
