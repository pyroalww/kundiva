import { Navigate } from 'react-router-dom';

/**
 * Public registration is disabled. Accounts are created by admins only.
 * Redirect to login page.
 */
export const RegisterPage: React.FC = () => {
  return <Navigate to="/login" replace />;
};
