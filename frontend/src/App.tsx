import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AskQuestionPage } from './pages/AskQuestionPage';
import { QuestionDetailPage } from './pages/QuestionDetailPage';
import { QuestionDiscoverPage } from './pages/QuestionDiscoverPage';
import { QuestionLibraryPage } from './pages/QuestionLibraryPage';
import { TeacherQueuePage } from './pages/TeacherQueuePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { FriendsPage } from './pages/FriendsPage';
import { MessagesPage } from './pages/MessagesPage';
import { SupportPage } from './pages/SupportPage';

const ProtectedRoute: React.FC<{ role?: string | string[] }> = ({ role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to profile completion if not completed (except for the complete-profile page)
  if (!user.profileCompleted && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/questions/discover" element={<QuestionDiscoverPage />} />
        <Route path="/questions/:id" element={<QuestionDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />

        {/* Profile completion (auth required, no role check) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
        </Route>

        {/* Authenticated routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/library" element={<QuestionLibraryPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>

        {/* Student-only routes */}
        <Route element={<ProtectedRoute role="STUDENT" />}>
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/student/ask" element={<AskQuestionPage />} />
        </Route>

        {/* Teacher-only routes */}
        <Route element={<ProtectedRoute role="TEACHER" />}>
          <Route path="/teacher/queue" element={<TeacherQueuePage />} />
        </Route>

        {/* Admin-only routes */}
        <Route element={<ProtectedRoute role="ADMIN" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
