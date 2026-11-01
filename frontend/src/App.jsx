import React from "react";
import { Route, Routes } from "react-router-dom";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import Footer from "./components/Footer.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import BookingPage from "./pages/BookingPage.jsx";
import RequireRole from "./components/RequireRole.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import OperatorTripsPage from "./pages/OperatorTripsPage.jsx";
import StaffCheckInPage from "./pages/StaffCheckInPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import TicketPage from "./pages/TicketPage.jsx";
import TicketLookupPage from "./pages/TicketLookupPage.jsx";
import MyBookingsPage from "./pages/MyBookingsPage.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-paper font-body">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/trips/:tripId/seats" element={<BookingPage />} />
        <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
        <Route path="/tickets/:bookingId" element={<TicketPage />} />
        <Route path="/tra-cuu-ve" element={<TicketLookupPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/staff/check-in" element={<RequireRole roles={["STAFF", "OPERATOR", "ADMIN"]}><StaffCheckInPage /></RequireRole>} />
        <Route path="/operator/trips" element={<RequireRole roles={["OPERATOR", "ADMIN"]}><OperatorTripsPage /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={["ADMIN"]}><AdminUsersPage /></RequireRole>} />
      </Routes>
      <Footer />
    </div>
  );
}
