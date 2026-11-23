import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';
import { isConfigured } from './lib/supabase';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Cows from './pages/Cows';
import CowDetail from './pages/CowDetail';
import RecordMilk from './pages/RecordMilk';
import MilkRecords from './pages/MilkRecords';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function SetupNotice() {
  return (
    <div className="center-box" style={{ minHeight: '100%' }}>
      <div className="card" style={{ maxWidth: 560, textAlign: 'left' }}>
        <h1 style={{ marginBottom: 10 }}>Connect Supabase to get started</h1>
        <p style={{ marginBottom: 10 }}>
          Copy <code>.env.example</code> to <code>.env</code>, add your project URL and publishable (anon) key,
          then restart <code>npm run dev</code>.
        </p>
        <p className="muted">Full steps are in README.md.</p>
      </div>
    </div>
  );
}

// Signed-in users who open /login or /register go straight to the dashboard
function PublicOnly({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  return session ? <Navigate to="/" replace /> : children;
}

export default function App() {
  if (!isConfigured) return <SetupNotice />;
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="cows" element={<Cows />} />
                <Route path="cows/:id" element={<CowDetail />} />
                <Route path="record-milk" element={<RecordMilk />} />
                <Route path="milk-records" element={<MilkRecords />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
