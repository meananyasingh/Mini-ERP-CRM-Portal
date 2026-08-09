import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, updateCustomer } from "../../api/customers";
import { parseApiError } from "../../utils/apiError";

const EMPTY_FORM = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "Retail",
  address: "",
  status: "Lead",
  nextFollowUpDate: "",
  notes: "",
};

export default function CustomerForm() {
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
    getCustomer(id)
      .then((response) => {
        const customer = response.data.data;
        setForm({
          name: customer.name || "",
          mobile: customer.mobile || "",
          email: customer.email || "",
          businessName: customer.businessName || "",
          gstNumber: customer.gstNumber || "",
          customerType: customer.customerType || "Retail",
          address: customer.address || "",
          status: customer.status || "Lead",
          nextFollowUpDate: customer.nextFollowUpDate || "",
          notes: customer.notes || "",
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
    if (!form.mobile.trim()) errors.mobile = "Mobile number is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    const payload = {
      ...form,
      email: form.email.trim() || undefined,
      businessName: form.businessName.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      nextFollowUpDate: form.nextFollowUpDate || undefined,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateCustomer(id, payload);
        navigate(`/customers/${id}`);
      } else {
        const response = await createCustomer(payload);
        navigate(`/customers/${response.data.data.id}`);
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
    return <div className="loading-block"><span className="spinner" />Loading customer...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{isEdit ? "Edit customer" : "New customer"}</h1>
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
              <label htmlFor="mobile">
                Mobile<span className="required-mark">*</span>
              </label>
              <input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
                className={fieldErrors.mobile ? "has-error" : ""}
              />
              {fieldErrors.mobile && <span className="field-error">{fieldErrors.mobile}</span>}
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={fieldErrors.email ? "has-error" : ""}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="businessName">Business name</label>
              <input
                id="businessName"
                value={form.businessName}
                onChange={(e) => setField("businessName", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="gstNumber">GST number</label>
              <input
                id="gstNumber"
                value={form.gstNumber}
                onChange={(e) => setField("gstNumber", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="customerType">Customer type</label>
              <select
                id="customerType"
                value={form.customerType}
                onChange={(e) => setField("customerType", e.target.value)}
              >
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="nextFollowUpDate">Next follow-up date</label>
              <input
                id="nextFollowUpDate"
                type="date"
                value={form.nextFollowUpDate}
                onChange={(e) => setField("nextFollowUpDate", e.target.value)}
              />
            </div>

            <div className="field form-grid-full">
              <label htmlFor="address">Address</label>
              <textarea
                id="address"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>

            <div className="field form-grid-full">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create customer"}
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
