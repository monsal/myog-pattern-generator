import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Instructions from "./pages/Instructions";
import Print from "./pages/Print";

const router = createBrowserRouter([
  { path: "/", element: <Dashboard /> },
  { path: "/projects/:id", element: <Editor /> },
  { path: "/projects/:id/instructions", element: <Instructions /> },
  { path: "/projects/:id/print", element: <Print /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
