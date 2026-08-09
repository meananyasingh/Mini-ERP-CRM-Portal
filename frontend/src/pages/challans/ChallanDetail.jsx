import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StatusBadge from "../../components/StatusBadge";
import {
  cancelChallan,
  confirmChallan,
  downloadChallanPdf,
  getChallan,
} from "../../api/challans";
import { parseApiError } from "../../utils/apiError";
import { useAuth } from "../../context/AuthContext";
import { canConfirmOrCancelChallan, canWriteChallanDraft } from "../../utils/permissions";

export default function ChallanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [stockErrors, setStockErrors] = useState([]);
  const [actionLoading, setActionLoading] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getChallan(id)
      .then((response) => setChallan(response.data.data))
      .catch((err) => setError(parseApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConfirm = async () => {
    setActionError("");
    setStockErrors([]);
    setActionLoading("confirm");
    try {
      await confirmChallan(id);
      load();
    } catch (err) {
      const parsed = parseApiError(err);
      setActionError(parsed.message);
      const shortfalls = (parsed.errors || []).filter((e) => e.field === "productId");
      if (shortfalls.length > 0) setStockErrors(shortfalls.map((e) => e.message));
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async () => {
    setActionError("");
    setStockErrors([]);
    setActionLoading("cancel");
    try {
      await cancelChallan(id);
      load();
    } catch (err) {
      setActionError(parseApiError(err).message);
    } finally {
      setActionLoading("");
    }
  };

  const handleDownloadPdf = async () => {
    setActionError("");
    setActionLoading("pdf");
    try {
      const response = await downloadChallanPdf(id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${challan.challanNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(parseApiError(err).message);
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return <div className="loading-block"><span className="spinner" />Loading challan...</div>;
  }

  if (error || !challan) {
    return <div className="alert alert-error">{error || "Challan not found."}</div>;
  }

  const snapshot = challan.customerSnapshot || {};
  const isDraft = challan.status === "Draft";

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{challan.challanNumber}</h1>
          <p>Created {new Date(challan.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex-row">
          <StatusBadge status={challan.status} />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadPdf}
            disabled={actionLoading === "pdf"}
          >
            {actionLoading === "pdf" ? "Preparing..." : "Download PDF"}
          </button>
          {isDraft && canWriteChallanDraft(user?.role) && (
            <Link to={`/challans/${id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
          )}
        </div>
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}
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

      <div className="card">
        <h2>Customer</h2>
        <div className="detail-grid">
          <div>
            <div className="detail-label">Name</div>
            <div className="detail-value">{snapshot.name || "—"}</div>
          </div>
          <div>
            <div className="detail-label">Mobile</div>
            <div className="detail-value">{snapshot.mobile || "—"}</div>
          </div>
          <div>
            <div className="detail-label">Business</div>
            <div className="detail-value">{snapshot.businessName || "—"}</div>
          </div>
          <div>
            <div className="detail-label">Address</div>
            <div className="detail-value">{snapshot.address || "—"}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Items</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {(challan.items || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.productSnapshot?.name}</td>
                  <td>{item.productSnapshot?.sku}</td>
                  <td className="text-right">₹{Number(item.productSnapshot?.unitPrice).toFixed(2)}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">₹{Number(item.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="challan-total-bar">
          <span>Total quantity</span>
          <span>{challan.totalQuantity}</span>
        </div>
      </div>

      {canConfirmOrCancelChallan(user?.role) && challan.status !== "Cancelled" && (
        <div className="card">
          <h2>Actions</h2>
          <div className="flex-row">
            {isDraft && (
              <button
                type="button"
                className="btn btn-success"
                onClick={handleConfirm}
                disabled={actionLoading === "confirm"}
              >
                {actionLoading === "confirm" ? "Confirming..." : "Confirm challan"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleCancel}
              disabled={actionLoading === "cancel"}
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel challan"}
            </button>
          </div>
          {!isDraft && challan.status === "Confirmed" && (
            <p className="hint" style={{ marginTop: "var(--space-3)" }}>
              Cancelling a confirmed challan will restock the dispatched items.
            </p>
          )}
        </div>
      )}

      <button type="button" className="btn btn-ghost" onClick={() => navigate("/challans")}>
        &larr; Back to challans
      </button>
    </div>
  );
}
