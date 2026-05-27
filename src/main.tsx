import { StrictMode, Suspense, lazy, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Instructions = lazy(() => import("./pages/Instructions"));
const Print = lazy(() => import("./pages/Print"));

const Fallback = () => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#A8A29E",
      fontFamily: "Nunito, system-ui, sans-serif",
      fontWeight: 700,
      letterSpacing: "0.04em",
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "3px solid rgba(61,107,143,0.18)",
        borderTopColor: "#3D6B8F",
        animation: "spin 0.8s linear infinite",
        marginRight: 12,
      }}
    />
    Loading…
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const wrap = (el: ReactElement) => <Suspense fallback={<Fallback />}>{el}</Suspense>;

const router = createBrowserRouter([
  { path: "/", element: wrap(<Dashboard />) },
  { path: "/projects/:id", element: wrap(<Editor />) },
  { path: "/projects/:id/instructions", element: wrap(<Instructions />) },
  { path: "/projects/:id/print", element: wrap(<Print />) },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
