import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { createUser, listUsers } from "../api/auth";
import { parseApiError } from "../utils/apiError";

const ROLE_OPTIONS = ["admin", "sales", "warehouse", "accounts"];

const EMPTY_FORM = { name: "", email: "", password: "", role: "sales" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listUsers()
      .then((response) => setUsers(response.data.data))
      .catch((err) => setError(parseApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    if (!form.password || form.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (!form.role) errors.role = "Role is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSaving(true);
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setShowModal(false);
      load();
    } catch (error) {
      const parsed = parseApiError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (row) => <StatusBadge status={row.role} /> },
    { key: "createdAt", header: "Created", render: (row) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Users</h1>
          <p>Manage portal access and roles.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openModal}>
          New user
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        loading={loading}
        error={error}
        emptyMessage="No users found."
      />

      {showModal && (
        <Modal title="New user" onClose={() => setShowModal(false)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="userName">
                Name<span className="required-mark">*</span>
              </label>
              <input
                id="userName"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className={fieldErrors.name ? "has-error" : ""}
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="userEmail">
                Email<span className="required-mark">*</span>
              </label>
              <input
                id="userEmail"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={fieldErrors.email ? "has-error" : ""}
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="field">
              <label htmlFor="userPassword">
                Password<span className="required-mark">*</span>
              </label>
              <input
                id="userPassword"
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                className={fieldErrors.password ? "has-error" : ""}
              />
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            <div className="field">
              <label htmlFor="userRole">
                Role<span className="required-mark">*</span>
              </label>
              <select
                id="userRole"
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create user"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
