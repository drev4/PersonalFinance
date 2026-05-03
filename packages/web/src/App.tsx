import { lazy, Suspense } from 'react';
import type React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import { SkipLink } from './components/ui/skip-link';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { queryClient } from './lib/queryClient';

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/accounts/AccountDetailPage'));
const TransactionsPage = lazy(() => import('./pages/transactions/TransactionsPage'));
const BudgetsPage = lazy(() => import('./pages/budgets/BudgetsPage'));
const GoalsPage = lazy(() => import('./pages/goals/GoalsPage'));
const HoldingsPage = lazy(() => import('./pages/holdings/HoldingsPage'));
const IntegrationsPage = lazy(() => import('./pages/settings/IntegrationsPage'));
const ProfilePage = lazy(() => import('./pages/settings/ProfilePage'));
const CategoryRulesPage = lazy(() => import('./pages/settings/CategoryRulesPage'));
const CategoriesPage = lazy(() => import('./pages/settings/CategoriesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const SimulatorsPage = lazy(() => import('./pages/simulators/SimulatorsPage'));
const MortgagePage = lazy(() => import('./pages/simulators/MortgagePage'));
const LoanPage = lazy(() => import('./pages/simulators/LoanPage'));
const InvestmentPage = lazy(() => import('./pages/simulators/InvestmentPage'));
const EarlyRepaymentPage = lazy(() => import('./pages/simulators/EarlyRepaymentPage'));
const RetirementPage = lazy(() => import('./pages/simulators/RetirementPage'));
const SavedSimulationsPage = lazy(() => import('./pages/simulators/SavedSimulationsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));

function PageLoader(): React.ReactElement {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50"
      aria-label="Cargando pagina"
      role="status"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SkipLink />
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Root wrapper — catches all route-level errors */}
              <Route errorElement={<RouteErrorBoundary />}>
                {/* Rutas publicas — redirigen a /dashboard si ya autenticado */}
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>

                {/* Verificacion de email — publica sin restriccion */}
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                {/* Rutas protegidas con AppLayout */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/accounts" element={<AccountsPage />} />
                    <Route path="/accounts/:id" element={<AccountDetailPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/budgets" element={<BudgetsPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/holdings" element={<HoldingsPage />} />
                    <Route path="/settings/integrations" element={<IntegrationsPage />} />
                    <Route path="/settings/profile" element={<ProfilePage />} />
                    <Route path="/settings/category-rules" element={<CategoryRulesPage />} />
                    <Route path="/settings/categories" element={<CategoriesPage />} />
                    <Route path="/simulators" element={<SimulatorsPage />} />
                    <Route path="/simulators/mortgage" element={<MortgagePage />} />
                    <Route path="/simulators/loan" element={<LoanPage />} />
                    <Route path="/simulators/investment" element={<InvestmentPage />} />
                    <Route path="/simulators/early-repayment" element={<EarlyRepaymentPage />} />
                    <Route path="/simulators/retirement" element={<RetirementPage />} />
                    <Route path="/simulators/saved" element={<SavedSimulationsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                  </Route>
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>

        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
