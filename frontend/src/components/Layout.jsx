import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canManageUsers } from "../utils/permissions";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "▣", end: true },
  { to: "/customers", label: "Customers", icon: "▤" },
  { to: "/products", label: "Products", icon: "▦" },
  { to: "/challans", label: "Challans", icon: "▩" },
  { to: "/users", label: "Users", icon: "▥", requiresAdmin: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requiresAdmin || canManageUsers(user?.role)
  );

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">MX</span>
          Mini ERP + CRM
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operations</div>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              onClick={closeSidebar}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Signed in as {user?.role}</div>
      </aside>

      <div
        className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
      />

      <div className="app-main">
        <header className="topbar">
          <div className="flex-row">
            <button
              type="button"
              className="topbar-menu-btn"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              &#9776;
            </button>
            <span className="topbar-title">Operations Portal</span>
          </div>
          <div className="topbar-user">
            <div className="topbar-user-info">
              <div className="topbar-user-name">{user?.name}</div>
              <div className="topbar-user-role">{user?.role}</div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
