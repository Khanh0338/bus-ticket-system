import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi, unwrapError } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = mode === "login"
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form);
      login(result);
      const from = location.state?.from;
      navigate(from ? from.pathname + (from.search || "") : "/", { replace: true });
    } catch (err) {
      setError(unwrapError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-5">
      <div className="bg-paper border border-ink/10 rounded-2xl shadow-lg shadow-ink/5 p-7">
        <h1 className="font-display text-2xl font-semibold mb-1">
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>
        <p className="text-ink-60 text-sm mb-6">
          {mode === "login" ? "Đăng nhập để đặt vé xe khách." : "Vài bước để bắt đầu đặt vé."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              required
              placeholder="Họ và tên"
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber"
          />
          {mode === "register" && (
            <input
              placeholder="Số điện thoại (không bắt buộc)"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber"
            />
          )}
          <input
            required
            type="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-amber"
          />

          {error && <p className="text-coral text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper font-medium rounded-lg py-2.5 text-sm hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          className="w-full text-center text-sm text-ink-60 mt-4 hover:text-amber-dark transition-colors"
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </div>
  );
}
