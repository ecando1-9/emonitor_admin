import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import DevicesPage from './pages/DevicesPage';
import EmailPoolPage from './pages/EmailPoolPage';
import PromotionsPage from './pages/PromotionsPage';
import PlansPage from './pages/PlansPage';
import SecurityPage from './pages/SecurityPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogPage from './pages/AuditLogPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import EmergencyAlertsPage from './pages/EmergencyAlertsPage';
import NotFoundPage from './pages/NotFoundPage';

// AppLayout wrapper to handle auth checks and redirects
function AppLayout() {
  const { isAuthenticated, checkSession, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkSession();
  }, []); // <-- **** THIS IS THE FIX ****

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    } else if (isAuthenticated && location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading session...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

// Export routes for RouterProvider
const AppRoutes = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: '/', element: <OverviewPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/subscriptions', element: <SubscriptionsPage /> },
      { path: '/devices', element: <DevicesPage /> },
      { path: '/email-pool', element: <EmailPoolPage /> },
      { path: '/promotions', element: <PromotionsPage /> },
      { path: '/plans', element: <PlansPage /> },
      { path: '/security', element: <SecurityPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/audit', element: <AuditLogPage /> },
      { path: '/emergency-alerts', element: <EmergencyAlertsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export default AppRoutes;