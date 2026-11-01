import React, { useEffect, useState } from "react";
import { adminApi, unwrapError } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABEL } from "../components/RequireRole.jsx";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { adminApi.listUsers().then(setUsers).catch((e) => setError(unwrapError(e).message)); }, []);

  async function change(u, role) {
    setMsg(null); setError(null);
    try {
      const updated = await adminApi.setRole(u.id, role);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role: updated.role } : x)));
      setMsg(`Đã đổi ${u.fullName} thành "${ROLE_LABEL[role]}". Người này cần đăng nhập lại để quyền mới có hiệu lực.`);
    } catch (e) { setError(unwrapError(e).message); }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-dark mb-1">Quản trị</p>
      <h1 className="font-display text-3xl font-semibold mb-6">Người dùng và phân quyền</h1>
      {msg && <p className="text-teal text-sm mb-3">{msg}</p>}
      {error && <p className="text-coral text-sm mb-3">{error}</p>}
      {!users ? <p className="text-ink-60 text-sm">Đang tải...</p> : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-paper">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-60 font-mono text-xs uppercase">
              <tr><th className="p-3">Họ tên</th><th className="p-3">Email</th><th className="p-3">SĐT</th><th className="p-3">Vai trò</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-ink/10">
                  <td className="p-3 font-medium">{u.fullName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 font-mono">{u.phone || "-"}</td>
                  <td className="p-3">
                    <select value={u.role} disabled={String(u.id) === String(user.id)} onChange={(e) => change(u, e.target.value)}
                      className="rounded-lg border border-ink/15 bg-paper px-2 py-1.5 disabled:opacity-50">
                      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    {String(u.id) === String(user.id) && <span className="ml-2 text-xs text-ink-60">(bạn)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
