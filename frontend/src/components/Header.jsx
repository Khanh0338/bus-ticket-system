import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL } from "./RequireRole.jsx";

export default function Header() {
  const { user, isAuthenticated, logout, role } = useAuth();
  const linkCls = "text-paper/70 hover:text-amber transition-colors hidden sm:inline";
  const navigate = useNavigate();

  return (
    <header className="bg-ink text-paper">
      <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-xl tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber inline-block" />
          BẾN VÉ
        </Link>
        <nav className="flex items-center gap-6 font-body text-sm">
          <Link to="/tra-cuu-ve" className="text-paper/70 hover:text-amber transition-colors hidden sm:inline">
            Tra cứu vé
          </Link>
          {["STAFF", "OPERATOR", "ADMIN"].includes(role) && <Link to="/staff/check-in" className={linkCls}>Soát vé</Link>}
          {["OPERATOR", "ADMIN"].includes(role) && <Link to="/operator/trips" className={linkCls}>Quản lý chuyến</Link>}
          {role === "ADMIN" && <Link to="/admin/users" className={linkCls}>Người dùng</Link>}
          {isAuthenticated && (
            <Link to="/my-bookings" className="text-paper/70 hover:text-amber transition-colors hidden sm:inline">
              Vé của tôi
            </Link>
          )}
          {isAuthenticated ? (
            <>
              <span className="text-paper/70">
                <span className="text-paper font-medium">{user.fullName}</span>
                <span className="ml-2 text-[10px] font-mono uppercase tracking-wide bg-paper/10 text-amber px-2 py-0.5 rounded-full">{ROLE_LABEL[role]}</span>
              </span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="px-3 py-1.5 rounded-full border border-paper/30 hover:border-amber hover:text-amber transition-colors"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-full bg-amber text-ink font-medium hover:bg-amber-dark transition-colors"
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
