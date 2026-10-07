export function AdminSidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>

        <div>
          <strong>SMSF</strong>
          <span>Admin Portal</span>
        </div>
      </div>

      <nav className="navigation">
        <p className="nav-label">
          MAIN MENU
        </p>

        <button className="nav-item">
          <span>⌂</span>
          Dashboard
        </button>

        <button className="nav-item active">
          <span>▦</span>
          Departments
        </button>

        <button className="nav-item">
          <span>♙</span>
          Users
        </button>

        <button className="nav-item">
          <span>⚙</span>
          Settings
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="admin-avatar">
          A
        </div>

        <div className="admin-info">
          <strong>Admin</strong>
          <span>Super Admin</span>
        </div>

        <button
          className="logout-button"
          aria-label="Logout"
        >
          ↪
        </button>
      </div>
    </aside>
  )
}