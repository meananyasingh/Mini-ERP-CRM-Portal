import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createChallan, getChallan, updateChallan } from "../../api/challans";
import { listCustomers } from "../../api/customers";
import { listProducts } from "../../api/products";
import { parseApiError } from "../../utils/apiError";

function newRow() {
  return { key: `${Date.now()}-${Math.random()}`, productId: "", quantity: "1" };
}

export default function ChallanCreate() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [loading, setLoading] = useState(isEdit);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([newRow()]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);
  const [formError, setFormError] = useState("");
  const [stockErrors, setStockErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listCustomers({ page: 1, limit: 200 }), listProducts({ page: 1, limit: 200 })])
      .then(([customerRes, productRes]) => {
        setCustomers(customerRes.data.data);
        setProducts(productRes.data.data);
      })
      .catch((err) => setFormError(parseApiError(err).message))
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getChallan(id)
      .then((response) => {
        const challan = response.data.data;
        if (challan.status !== "Draft") {
          setFormError("Only draft challans can be edited.");
          return;
        }
        setCustomerId(String(challan.customerId));
        setItems(
          (challan.items || []).map((item) => ({
            key: `${item.id}`,
            productId: String(item.productId),
            quantity: String(item.quantity),
          }))
        );
      })
      .catch((err) => setFormError(parseApiError(err).message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(String(p.id), p));
    return map;
  }, [products]);

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const estimatedTotal = items.reduce((sum, item) => {
    const product = productById.get(item.productId);
    const qty = Number(item.quantity) || 0;
    return sum + (product ? Number(product.unitPrice) * qty : 0);
  }, 0);

  const updateRow = (key, patch) => {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setItems((prev) => [...prev, newRow()]);

  const removeRow = (key) => setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const validate = () => {
    const errors = {};
    if (!customerId) errors.customerId = "Please select a customer";

    const rowErrors = items.map((row) => {
      const rowError = {};
      if (!row.productId) rowError.productId = "Select a product";
      if (!row.quantity || Number(row.quantity) <= 0) rowError.quantity = "Qty > 0";
      return rowError;
    });

    const productIds = items.map((r) => r.productId).filter(Boolean);
    const hasDuplicates = new Set(productIds).size !== productIds.length;
    if (hasDuplicates) errors.items = "Each product can only appear once — adjust the quantity instead.";

    setFieldErrors(errors);
    setItemErrors(rowErrors);
    return Object.keys(errors).length === 0 && rowErrors.every((r) => Object.keys(r).length === 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setStockErrors([]);
    if (!validate()) return;

    const payload = {
      customerId: Number(customerId),
      items: items.map((row) => ({ productId: Number(row.productId), quantity: Number(row.quantity) })),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateChallan(id, payload);
        navigate(`/challans/${id}`);
      } else {
        const response = await createChallan(payload);
        navigate(`/challans/${response.data.data.id}`);
      }
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
      const shortfalls = (parsed.errors || []).filter((e) => e.field === "productId");
      if (shortfalls.length > 0) setStockErrors(shortfalls.map((e) => e.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading || optionsLoading) {
    return <div className="loading-block"><span className="spinner" />Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{isEdit ? "Edit challan" : "New challan"}</h1>
          <p>Pick a customer and add the products to dispatch.</p>
        </div>
      </div>

      <div className="card">
        {formError && <div className="alert alert-error">{formError}</div>}
        {stockErrors.length > 0 && (
          <div className="alert alert-error">
            <strong>Insufficient stock:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {stockErrors.map((message, idx) => (
                <li key={idx}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="customerId">
              Customer<span className="required-mark">*</span>
            </label>
            <select
              id="customerId"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, customerId: undefined }));
              }}
              className={fieldErrors.customerId ? "has-error" : ""}
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.businessName ? `(${c.businessName})` : ""}
                </option>
              ))}
            </select>
            {fieldErrors.customerId && <span className="field-error">{fieldErrors.customerId}</span>}
          </div>

          <h3>Items</h3>
          {fieldErrors.items && <div className="alert alert-error">{fieldErrors.items}</div>}

          {items.map((row, index) => {
            const rowError = itemErrors[index] || {};
            const product = productById.get(row.productId);
            return (
              <div className="challan-item-row" key={row.key}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Product</label>
                  <select
                    value={row.productId}
                    onChange={(e) => updateRow(row.key, { productId: e.target.value })}
                    className={rowError.productId ? "has-error" : ""}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — ₹{Number(p.unitPrice).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {rowError.productId && <span className="field-error">{rowError.productId}</span>}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    className={rowError.quantity ? "has-error" : ""}
                  />
                  {rowError.quantity && <span className="field-error">{rowError.quantity}</span>}
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Line total (est.)</label>
                  <input
                    value={product ? `₹${(Number(product.unitPrice) * (Number(row.quantity) || 0)).toFixed(2)}` : "—"}
                    disabled
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => removeRow(row.key)}
                  disabled={items.length === 1}
                  aria-label="Remove item"
                >
                  Remove
                </button>
              </div>
            );
          })}

          <button type="button" className="btn btn-ghost" onClick={addRow}>
            + Add product
          </button>

          <div className="challan-total-bar">
            <span>Total quantity: {totalQuantity}</span>
            <span>Estimated total: ₹{estimatedTotal.toFixed(2)}</span>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Save as draft"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
