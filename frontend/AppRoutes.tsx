import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import TwoFactorAuth from "./pages/TwoFactorAuth";

import AppShell from "./layouts/AppShell";
import AuthGate from "./layouts/AuthGate";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/2fa" element={<TwoFactorAuth />} />

        {/* PRIVATE */}
        <Route
          path="/app/*"
          element={
            <AuthGate>
              <AppShell />
            </AuthGate>
          }
        />

        {/* DEFAULT */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
