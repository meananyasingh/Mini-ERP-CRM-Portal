import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import { addFollowUp, getCustomer, listFollowUps } from "../../api/customers";
import { parseApiError } from "../../utils/apiError";
import { useAuth } from "../../context/AuthContext";
import { canWriteCustomers, canWriteFollowUps } from "../../utils/permissions";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFollowUps = () => {
    listFollowUps(id)
      .then((response) => setFollowUps(response.data.data))
      .catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([getCustomer(id), listFollowUps(id)])
      .then(([customerRes, followUpsRes]) => {
        setCustomer(customerRes.data.data);
        setFollowUps(followUpsRes.data.data);
      })
      .catch((err) => setError(parseApiError(err).message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddFollowUp = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!note.trim()) {
      setFieldErrors({ note: "Note is required" });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await addFollowUp(id, {
        note: note.trim(),
        followUpDate: followUpDate || undefined,
      });
      setNote("");
      setFollowUpDate("");
      loadFollowUps();
      const customerRes = await getCustomer(id);
      setCustomer(customerRes.data.data);
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-block"><span className="spinner" />Loading customer...</div>;
  }

  if (error || !customer) {
    return <div className="alert alert-error">{error || "Customer not found."}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{customer.name}</h1>
          <p>{customer.businessName || "Individual customer"}</p>
        </div>
        <div className="flex-row">
          <StatusBadge status={customer.status} />
          {canWriteCustomers(user?.role) && (
            <Link to={`/customers/${id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title-row">
          <h2 style={{ margin: 0 }}>Profile</h2>
        </div>
        <div className="detail-grid">
          <div>
            <div className="detail-label">Mobile</div>
            <div className="detail-value">{customer.mobile}</div>
          </div>
          <div>
            <div className="detail-label">Email</div>
            <div className="detail-value">{customer.email || "—"}</div>
          </div>
          <div>
            <div className="detail-label">GST number</div>
            <div className="detail-value">{customer.gstNumber || "—"}</div>
          </div>
          <div>
            <div className="detail-label">Customer type</div>
            <div className="detail-value">{customer.customerType}</div>
          </div>
          <div>
            <div className="detail-label">Next follow-up</div>
            <div className="detail-value">{customer.nextFollowUpDate || "—"}</div>
          </div>
          <div>
            <div className="detail-label">Address</div>
            <div className="detail-value">{customer.address || "—"}</div>
          </div>
        </div>
        {customer.notes && (
          <>
            <div className="detail-label" style={{ marginTop: "var(--space-4)" }}>
              Notes
            </div>
            <div className="detail-value">{customer.notes}</div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Follow-up timeline</h2>
        {followUps.length === 0 ? (
          <p className="text-muted">No follow-ups recorded yet.</p>
        ) : (
          <ul className="followup-timeline">
            {followUps.map((item) => (
              <li key={item.id} className="followup-item">
                <div className="followup-item-meta">
                  {new Date(item.createdAt).toLocaleString()}
                  {item.followUpDate && ` · Next follow-up: ${item.followUpDate}`}
                </div>
                <div>{item.note}</div>
              </li>
            ))}
          </ul>
        )}

        {canWriteFollowUps(user?.role) && (
          <form onSubmit={handleAddFollowUp} noValidate style={{ marginTop: "var(--space-5)" }}>
            <h3>Add follow-up</h3>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div className="field">
              <label htmlFor="note">
                Note<span className="required-mark">*</span>
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, note: undefined }));
                }}
                className={fieldErrors.note ? "has-error" : ""}
              />
              {fieldErrors.note && <span className="field-error">{fieldErrors.note}</span>}
            </div>
            <div className="field">
              <label htmlFor="followUpDate">Next follow-up date</label>
              <input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
              <span className="hint">Setting this updates the customer's next follow-up date.</span>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Add follow-up"}
              </button>
            </div>
          </form>
        )}
      </div>

      <button type="button" className="btn btn-ghost" onClick={() => navigate("/customers")}>
        &larr; Back to customers
      </button>
    </div>
  );
}
