import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Billing from "./pages/Billing";
import Staff from "./pages/Staff";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Branches from "./pages/Branches";
import StaffPerformance from "./pages/StaffPerformance";
import InviteCodes from "./pages/InviteCodes";
import UserApprovals from "./pages/UserApprovals";
import PublicMenu from "./pages/PublicMenu";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/menu/:branchCode" element={<PublicMenu />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute allowedRoles={['developer', 'central_admin', 'branch_admin']}><Menu /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute allowedRoles={['developer', 'central_admin', 'branch_admin', 'billing']}><Billing /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute allowedRoles={['developer', 'central_admin']}><Branches /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute allowedRoles={['developer', 'central_admin', 'branch_admin']}><Staff /></ProtectedRoute>} />
            <Route path="/staff-performance" element={<ProtectedRoute allowedRoles={['developer', 'central_admin', 'branch_admin']}><StaffPerformance /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['developer', 'central_admin', 'branch_admin']}><Reports /></ProtectedRoute>} />
            <Route path="/invite-codes" element={<ProtectedRoute allowedRoles={['developer', 'central_admin']}><InviteCodes /></ProtectedRoute>} />
            <Route path="/user-approvals" element={<ProtectedRoute allowedRoles={['developer', 'central_admin', 'branch_admin']}><UserApprovals /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['developer']}><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
