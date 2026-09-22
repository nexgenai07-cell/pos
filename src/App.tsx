import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { areaForPath, canAccessArea, landingPathFor } from "@/lib/rbac";
import LoginPage from "@/pages/login/LoginPage";
import TableMapPage from "@/pages/pos/TableMapPage";
import OrderBuilderPage from "@/pages/pos/OrderBuilderPage";
import PaymentPage from "@/pages/pos/PaymentPage";
import KitchenQueuePage from "@/pages/kds/KitchenQueuePage";
import StockPage from "@/pages/admin/inventory/StockPage";
import RecipesPage from "@/pages/admin/inventory/RecipesPage";
import RecipeEditorPage from "@/pages/admin/inventory/RecipeEditorPage";
import SuppliersPage from "@/pages/admin/inventory/SuppliersPage";
import NewSupplierPage from "@/pages/admin/inventory/NewSupplierPage";
import EditSupplierPage from "@/pages/admin/inventory/EditSupplierPage";
import PurchasesPage from "@/pages/admin/inventory/PurchasesPage";
import NewPurchasePage from "@/pages/admin/inventory/NewPurchasePage";
import EditPurchasePage from "@/pages/admin/inventory/EditPurchasePage";
import DashboardPage from "@/pages/admin/dashboard/DashboardPage";
import MenuPage from "@/pages/admin/menu/MenuPage";
import ProductFormPage from "@/pages/admin/menu/ProductFormPage";
import CategoriesPage from "@/pages/admin/menu/CategoriesPage";
import DealsPage from "@/pages/admin/menu/DealsPage";
import DealFormPage from "@/pages/admin/menu/DealFormPage";
import TablesPage from "@/pages/admin/tables/TablesPage";
import StaffListPage from "@/pages/admin/staff/StaffListPage";
import NewStaffPage from "@/pages/admin/staff/NewStaffPage";
import StaffDetailPage from "@/pages/admin/staff/StaffDetailPage";
import EditStaffPage from "@/pages/admin/staff/EditStaffPage";
import OverviewPage from "@/pages/admin/reports/OverviewPage";
import SalesPage from "@/pages/admin/reports/SalesPage";
import ProductPerformancePage from "@/pages/admin/reports/ProductPerformancePage";
import PeakHoursPage from "@/pages/admin/reports/PeakHoursPage";
import MarginsPage from "@/pages/admin/reports/MarginsPage";
import TableTurnoverPage from "@/pages/admin/reports/TableTurnoverPage";
import WastagePage from "@/pages/admin/reports/WastagePage";
import RepeatCustomersPage from "@/pages/admin/reports/RepeatCustomersPage";
import SettingsPage from "@/pages/admin/settings/SettingsPage";
import { useQrBridgeSync } from "@/hooks/useQrBridgeSync";

/**
 * Any authenticated staff member may pass, but the route's area (pos/kds/admin,
 * from the path) still has to allow their role — see src/lib/rbac.ts. A
 * kitchen account hitting /pos/table/:id/payment or a cashier hitting /kds
 * gets bounced to their own landing page instead of being let through.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { staff } = useAuth();
  const location = useLocation();
  if (!staff) return <Navigate to="/login" replace />;
  const area = areaForPath(location.pathname);
  if (area && !canAccessArea(staff.role, area)) {
    return <Navigate to={landingPathFor(staff.role)} replace />;
  }
  return <>{children}</>;
}

/** /admin/* is reachable for manager/owner only — see docs/architecture-plan.md §01/§02. */
function AdminRoute({ children }: { children: ReactNode }) {
  const { staff } = useAuth();
  if (!staff) return <Navigate to="/login" replace />;
  if (!canAccessArea(staff.role, "admin")) return <Navigate to={landingPathFor(staff.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  useQrBridgeSync(); // dev-only demo hack — see hooks/useQrBridgeSync.ts

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/pos" element={<ProtectedRoute><TableMapPage /></ProtectedRoute>} />
      <Route path="/pos/table/:tableId" element={<ProtectedRoute><OrderBuilderPage /></ProtectedRoute>} />
      <Route path="/pos/table/:tableId/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />

      <Route path="/kds" element={<ProtectedRoute><KitchenQueuePage /></ProtectedRoute>} />

      <Route path="/admin" element={<AdminRoute><Navigate to="/admin/dashboard" replace /></AdminRoute>} />
      <Route path="/admin/dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />

      <Route path="/admin/menu" element={<AdminRoute><MenuPage /></AdminRoute>} />
      <Route path="/admin/menu/new" element={<AdminRoute><ProductFormPage /></AdminRoute>} />
      <Route path="/admin/menu/categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />
      <Route path="/admin/menu/deals" element={<AdminRoute><DealsPage /></AdminRoute>} />
      <Route path="/admin/menu/deals/new" element={<AdminRoute><DealFormPage /></AdminRoute>} />
      <Route path="/admin/menu/deals/:productId/edit" element={<AdminRoute><DealFormPage /></AdminRoute>} />
      <Route path="/admin/menu/:productId/edit" element={<AdminRoute><ProductFormPage /></AdminRoute>} />

      <Route path="/admin/tables" element={<AdminRoute><TablesPage /></AdminRoute>} />

      <Route path="/admin/inventory/stock" element={<AdminRoute><StockPage /></AdminRoute>} />
      <Route path="/admin/inventory/recipes" element={<AdminRoute><RecipesPage /></AdminRoute>} />
      <Route path="/admin/inventory/recipes/:productId" element={<AdminRoute><RecipeEditorPage /></AdminRoute>} />
      <Route path="/admin/inventory/suppliers" element={<AdminRoute><SuppliersPage /></AdminRoute>} />
      <Route path="/admin/inventory/suppliers/new" element={<AdminRoute><NewSupplierPage /></AdminRoute>} />
      <Route path="/admin/inventory/suppliers/:supplierId/edit" element={<AdminRoute><EditSupplierPage /></AdminRoute>} />
      <Route path="/admin/inventory/purchases" element={<AdminRoute><PurchasesPage /></AdminRoute>} />
      <Route path="/admin/inventory/purchases/new" element={<AdminRoute><NewPurchasePage /></AdminRoute>} />
      <Route
        path="/admin/inventory/purchases/:purchaseId/edit"
        element={<AdminRoute><EditPurchasePage /></AdminRoute>}
      />

      <Route path="/admin/staff" element={<AdminRoute><StaffListPage /></AdminRoute>} />
      <Route path="/admin/staff/new" element={<AdminRoute><NewStaffPage /></AdminRoute>} />
      <Route path="/admin/staff/:staffId" element={<AdminRoute><StaffDetailPage /></AdminRoute>} />
      <Route path="/admin/staff/:staffId/edit" element={<AdminRoute><EditStaffPage /></AdminRoute>} />

      <Route path="/admin/reports" element={<AdminRoute><OverviewPage /></AdminRoute>} />
      <Route path="/admin/reports/sales" element={<AdminRoute><SalesPage /></AdminRoute>} />
      <Route path="/admin/reports/product-performance" element={<AdminRoute><ProductPerformancePage /></AdminRoute>} />
      <Route path="/admin/reports/peak-hours" element={<AdminRoute><PeakHoursPage /></AdminRoute>} />
      <Route path="/admin/reports/margins" element={<AdminRoute><MarginsPage /></AdminRoute>} />
      <Route path="/admin/reports/table-turnover" element={<AdminRoute><TableTurnoverPage /></AdminRoute>} />
      <Route path="/admin/reports/wastage" element={<AdminRoute><WastagePage /></AdminRoute>} />
      <Route path="/admin/reports/repeat-customers" element={<AdminRoute><RepeatCustomersPage /></AdminRoute>} />

      <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
