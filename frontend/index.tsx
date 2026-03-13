import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./layouts/AuthContext"; // ou "../contexts/AuthContext" conforme seu projeto

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </React.StrictMode>
);

