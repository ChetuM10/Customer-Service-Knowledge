import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// Temporary Page Skeleton
function PageSkeleton({ title, description }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Stat Cards Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="card card-interactive">
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Total Records
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, marginTop: "6px" }}>
            --
          </div>
        </div>
        <div className="card card-interactive">
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Active Status
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "6px",
              color: "var(--accent)",
            }}
          >
            Ready
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card">
        <h2 style={{ fontSize: "18px", fontWeight: 600 }}>{title}</h2>
        <p
          style={{
            fontSize: "13.5px",
            color: "var(--text-secondary)",
            marginTop: "6px",
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/customers" replace />} />
          <Route
            path="customers"
            element={
              <PageSkeleton
                title="Customers Module"
                description="Customer list, search, create, edit & delete will live here."
              />
            }
          />
          <Route
            path="tickets"
            element={
              <PageSkeleton
                title="Support Tickets & ML Classification"
                description="Raise tickets and view AI-predicted categories & confidence scores."
              />
            }
          />
          <Route
            path="categories"
            element={
              <PageSkeleton
                title="Knowledge Categories"
                description="Manage active/inactive categories for knowledge articles."
              />
            }
          />
          <Route
            path="articles"
            element={
              <PageSkeleton
                title="Knowledge Articles & Versions"
                description="Create articles, manage Draft → Approved → Published → Retired, and inspect versions."
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
