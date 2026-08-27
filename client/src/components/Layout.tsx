import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/pos", label: "New Sale (POS)", icon: "🧾" },
  { to: "/sales", label: "Sales", icon: "💰" },
  { to: "/products", label: "Products", icon: "📦" },
  { to: "/categories", label: "Categories", icon: "🏷️" },
  { to: "/purchases", label: "Purchases", icon: "🛒" },
  { to: "/suppliers", label: "Suppliers", icon: "🚚" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/repairs", label: "Repairs", icon: "🔧" },
  { to: "/reports", label: "Reports", icon: "📈" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">🔌</span>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-800">ElectroShop</div>
            <div className="text-xs text-slate-400">Business Software</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          {user?.role === "ADMIN" && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>🧑‍💼</span>
              Users
            </NavLink>
          )}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-sm">
            <div className="font-medium text-slate-800">{user?.name}</div>
            <div className="text-xs text-slate-400">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-hidden p-6">
        <Outlet />
      </main>
    </div>
  );
}
