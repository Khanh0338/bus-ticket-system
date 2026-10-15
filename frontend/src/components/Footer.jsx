import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-ink text-paper mt-16">
      <div className="max-w-5xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="font-display font-bold text-lg flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber inline-block" />
            BẾN VÉ
          </p>
          <p className="text-paper/60 text-sm leading-relaxed">
            Hệ thống đặt vé xe khách trực tuyến xây dựng theo kiến trúc hướng dịch vụ (microservices).
          </p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber mb-3">Hỗ trợ</p>
          <ul className="space-y-2 text-sm text-paper/70">
            <li><Link to="/tra-cuu-ve" className="hover:text-amber transition-colors">Tra cứu vé</Link></li>
            <li><Link to="/my-bookings" className="hover:text-amber transition-colors">Vé của tôi</Link></li>
            <li><Link to="/login" className="hover:text-amber transition-colors">Đăng nhập / Đăng ký</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-amber mb-3">Về dự án</p>
          <p className="text-paper/60 text-sm leading-relaxed">
            Đồ án môn Phát triển phần mềm hướng dịch vụ (INT1448) — PTITHCM.
          </p>
          <p className="text-paper/40 text-xs font-mono mt-3">
            Node.js · React · MySQL · Redis · Docker
          </p>
        </div>
      </div>
      <div className="border-t border-paper/10 py-4 text-center text-paper/40 text-xs font-mono">
        Dữ liệu chuyến xe và thanh toán trong hệ thống chỉ mang tính minh họa.
      </div>
    </footer>
  );
}
