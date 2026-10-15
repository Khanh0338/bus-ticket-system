import React from "react";
import { Route, Routes } from "react-router-dom";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import Footer from "./components/Footer.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SeatSelectionPage from "./pages/SeatSelectionPage.jsx";
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
        <Route path="/trips/:tripId/seats" element={<SeatSelectionPage />} />
        <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
        <Route path="/tickets/:bookingId" element={<TicketPage />} />
        <Route path="/tra-cuu-ve" element={<TicketLookupPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
      </Routes>
      <Footer />
    </div>
  );
}
