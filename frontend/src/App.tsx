import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { CompanySetup } from './pages/CompanySetup';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Callback } from './pages/Callback';
import AdminPanel from './pages/AdminPanel';
import { Layout } from './components/Layout';
import { SyncStatus } from './pages/SyncStatus';
import { MigrationReport } from './pages/MigrationReport';
import { UserGuide } from './pages/UserGuide';

// Auth Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin Guard
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const MainApp: React.FC = () => {
  const { setContext } = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const initialized = useRef(false);
  const [params] = useSearchParams();

  const companyId = params.get('company_id');
  const projectId = params.get('project_id');
  const companyName = params.get('company_name');
  const projectName = params.get('project_name');
  const organizationId = params.get('organization_id');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (companyId) sessionStorage.setItem('CompanyId', companyId);
    if (projectId) sessionStorage.setItem('ProjectId', projectId);
    if (projectName) sessionStorage.setItem('ProjectName', projectName);
    if (companyName) sessionStorage.setItem('CompanyName', companyName);
    if (organizationId) sessionStorage.setItem('OrganizationId', organizationId);

    if (companyId || companyName || organizationId) {
      setContext(companyId, companyName, organizationId);
    }

    if (sessionStorage.getItem('CompanyId') && !useAuthStore.getState().companyId) {
      setContext(
        sessionStorage.getItem('CompanyId'),
        sessionStorage.getItem('CompanyName'),
        sessionStorage.getItem('OrganizationId')
      );
    }
  }, [companyId, projectId, companyName, projectName, organizationId, setContext]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <AntdApp>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<Callback />} />

          <Route element={<Layout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/company-setup"
              element={
                <ProtectedRoute>
                  <CompanySetup />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sync-status"
              element={
                <ProtectedRoute>
                  <SyncStatus />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />

            <Route
              path="/migration-report"
              element={
                <ProtectedRoute>
                  <MigrationReport />
                </ProtectedRoute>
              }
            />

            <Route path="/user-guide" element={<UserGuide />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="/instructions" element={<UserGuide />} />
        </Routes>
      </AntdApp>
    </ConfigProvider>
  );
};

export default MainApp;