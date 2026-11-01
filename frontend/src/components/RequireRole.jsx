import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const ROLE_LABEL = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên soát vé",
  OPERATOR: "Nhà xe",
  ADMIN: "Quản trị viên"
};

export default function RequireRole({ roles, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(role)) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-coral mb-2">403</p>
        <h1 className="font-display text-2xl font-semibold mb-2">Bạn không có quyền truy cập</h1>
        <p className="text-ink-60 text-sm mb-6">Trang này dành cho: {roles.map((r) => ROLE_LABEL[r]).join(", ")}.</p>
        <Link to="/" className="text-amber-dark font-medium text-sm hover:text-amber">← Về trang chủ</Link>
      </div>
    );
  }
  return children;
}
