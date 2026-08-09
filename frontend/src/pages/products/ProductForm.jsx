import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createProduct, getProduct, updateProduct } from "../../api/products";
import { parseApiError } from "../../utils/apiError";

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getProduct(id)
      .then((response) => {
        const product = response.data.data;
        setForm({
          name: product.name || "",
          sku: product.sku || "",
          category: product.category || "",
          unitPrice: String(product.unitPrice ?? ""),
          currentStock: String(product.currentStock ?? 0),
          minStockAlert: String(product.minStockAlert ?? 0),
          location: product.location || "",
        });
      })
      .catch((err) => setFormError(parseApiError(err).message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.sku.trim()) errors.sku = "SKU is required";
    if (form.unitPrice === "" || Number.isNaN(Number(form.unitPrice))) {
      errors.unitPrice = "Unit price is required";
    } else if (Number(form.unitPrice) < 0) {
      errors.unitPrice = "Unit price cannot be negative";
    }
    if (!isEdit && (form.currentStock === "" || Number(form.currentStock) < 0)) {
      errors.currentStock = "Initial stock cannot be negative";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim() || undefined,
      unitPrice: Number(form.unitPrice),
      minStockAlert: Number(form.minStockAlert) || 0,
      location: form.location.trim() || undefined,
    };
    if (!isEdit) {
      payload.currentStock = Number(form.currentStock) || 0;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(id, payload);
        navigate(`/products/${id}/stock-movements`);
      } else {
        const response = await createProduct(payload);
        navigate(`/products/${response.data.data.id}/stock-movements`);
      }
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-block"><span className="spinner" />Loading product...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{isEdit ? "Edit product" : "New product"}</h1>
        </div>
      </div>

      <div className="card">
        {formError && <div className="alert alert-error">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">
                Name<span className="required-mark">*</span>
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={fieldErrors.name ? "has-error" : ""}
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>

            <div className="field">
              <label htmlFor="sku">
                SKU<span className="required-mark">*</span>
              </label>
              <input
                id="sku"
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value)}
                className={fieldErrors.sku ? "has-error" : ""}
              />
              {fieldErrors.sku && <span className="field-error">{fieldErrors.sku}</span>}
            </div>

            <div className="field">
              <label htmlFor="category">Category</label>
              <input
                id="category"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="unitPrice">
                Unit price<span className="required-mark">*</span>
              </label>
              <input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setField("unitPrice", e.target.value)}
                className={fieldErrors.unitPrice ? "has-error" : ""}
              />
              {fieldErrors.unitPrice && <span className="field-error">{fieldErrors.unitPrice}</span>}
            </div>

            {isEdit ? (
              <div className="field">
                <label>Current stock</label>
                <input value={form.currentStock} disabled />
                <span className="hint">
                  Use <Link to={`/products/${id}/stock-movements`}>stock adjustment</Link> to change stock.
                </span>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="currentStock">Initial stock</label>
                <input
                  id="currentStock"
                  type="number"
                  min="0"
                  value={form.currentStock}
                  onChange={(e) => setField("currentStock", e.target.value)}
                  className={fieldErrors.currentStock ? "has-error" : ""}
                />
                {fieldErrors.currentStock && (
                  <span className="field-error">{fieldErrors.currentStock}</span>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="minStockAlert">Minimum stock alert</label>
              <input
                id="minStockAlert"
                type="number"
                min="0"
                value={form.minStockAlert}
                onChange={(e) => setField("minStockAlert", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
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
