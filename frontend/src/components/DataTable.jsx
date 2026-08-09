import Pagination from "./Pagination";

/**
 * Generic paginated, searchable table.
 *
 * columns: [{ key, header, render?(row), align? }]
 * rows: array of records (already the current page)
 * pagination: { page, totalPages, total, limit, onPageChange }
 * search: { value, onChange, placeholder } — omit to hide the search box
 * filters: extra filter controls rendered next to the search box
 */
export default function DataTable({
  columns,
  rows,
  loading,
  error,
  emptyMessage = "No records found.",
  search,
  filters,
  pagination,
  onRowClick,
  rowKey = "id",
  rowClassName,
}) {
  const hasToolbar = Boolean(search || filters);

  return (
    <div>
      {hasToolbar && (
        <div className="toolbar">
          {search && (
            <div className="search-input-wrap">
              <input
                type="search"
                value={search.value}
                placeholder={search.placeholder || "Search..."}
                onChange={(event) => search.onChange(event.target.value)}
              />
            </div>
          )}
          {filters}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.align ? { textAlign: col.align } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="loading-block">
                    <span className="spinner" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="table-state-row text-danger">{error}</div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="table-state-row">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row[rowKey]}
                  className={[onRowClick ? "is-clickable" : "", rowClassName ? rowClassName(row) : ""]
                    .filter(Boolean)
                    .join(" ") || undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={col.align ? { textAlign: col.align } : undefined}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pagination && !loading && !error && rows.length > 0 && <Pagination {...pagination} />}
      </div>
    </div>
  );
}
