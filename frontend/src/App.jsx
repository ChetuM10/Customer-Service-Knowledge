import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import CustomersPage from "./pages/CustomersPage";
import TicketsPage from "./pages/TicketsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ArticlesPage from "./pages/ArticlesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import KnowledgeGapsPage from "./pages/KnowledgeGapsPage";
import AuditLogsPage from "./pages/AuditLogsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/analytics" replace />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="gaps" element={<KnowledgeGapsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
