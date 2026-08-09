import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listCustomers } from "../api/customers";
import { listProducts } from "../api/products";
import { listChallans } from "../api/challans";
import { canWriteChallanDraft, canWriteCustomers, canWriteProducts } from "../utils/permissions";

const ROLE_DESCRIPTIONS = {
  admin: "Full access to users, customers, products, and challans.",
  sales: "Manage customers, follow-ups, and challans (draft, confirm, cancel).",
  warehouse: "Manage products, stock movements, and view challans.",
  accounts: "Read-only access to customers, products, and challans.",
};

function useCount(fetcher) {
  const [state, setState] = useState({ loading: true, value: null, error: false });

  useEffect(() => {
    let active = true;
    fetcher()
      .then((response) => {
        if (active) {
          setState({ loading: false, value: response.data.meta?.total ?? 0, error: false });
        }
      })
      .catch(() => {
        if (active) setState({ loading: false, value: null, error: true });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function SummaryCard({ label, state, to, sub }) {
  const display = state.loading ? "..." : state.error ? "—" : state.value;
  return (
    <Link to={to} className="summary-card" style={{ display: "block", textDecoration: "none" }}>
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value">{display}</div>
      {sub && <div className="summary-card-sub">{sub}</div>}
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const customerCount = useCount(() => listCustomers({ page: 1, limit: 1 }));
  const productCount = useCount(() => listProducts({ page: 1, limit: 1 }));
  const lowStockCount = useCount(() => listProducts({ page: 1, limit: 1, lowStock: true }));
  const draftChallanCount = useCount(() => listChallans({ page: 1, limit: 1, status: "Draft" }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Welcome back, {user?.name}</h1>
          <p>{ROLE_DESCRIPTIONS[user?.role] || "Operations overview."}</p>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard label="Total customers" state={customerCount} to="/customers" />
        <SummaryCard label="Total products" state={productCount} to="/products" />
        <SummaryCard
          label="Low stock products"
          state={lowStockCount}
          to="/products?lowStock=true"
          sub="At or below minimum alert level"
        />
        <SummaryCard label="Draft challans" state={draftChallanCount} to="/challans?status=Draft" />
      </div>

      {(canWriteCustomers(user?.role) ||
        canWriteProducts(user?.role) ||
        canWriteChallanDraft(user?.role)) && (
        <div className="card">
          <h2>Quick links</h2>
          <div className="flex-row" style={{ flexWrap: "wrap" }}>
            {canWriteCustomers(user?.role) && (
              <Link to="/customers/new" className="btn btn-secondary">
                New customer
              </Link>
            )}
            {canWriteProducts(user?.role) && (
              <Link to="/products/new" className="btn btn-secondary">
                New product
              </Link>
            )}
            {canWriteChallanDraft(user?.role) && (
              <Link to="/challans/new" className="btn btn-primary">
                New challan
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
