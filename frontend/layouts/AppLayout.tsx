import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function getRole() {
  return (localStorage.getItem("role") || "CLIENT") as "ADMIN" | "CLIENT";
}

export default function AppLayout() {
  const role = getRole();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar role={role} onLogout={handleLogout} />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
