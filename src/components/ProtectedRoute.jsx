import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Alert } from './ui';

export default function ProtectedRoute({ children }) {
  const { session, loading, farm, accountError, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Opening your farm…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!farm) {
    return (
      <div className="center-box">
        <Alert type="error">{accountError || 'Your farm could not be loaded.'}</Alert>
        <p>Check that the database migrations were run, then log in again.</p>
        <button className="btn" onClick={signOut}>Log out</button>
      </div>
    );
  }
  return children;
}
