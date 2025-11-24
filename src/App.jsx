import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectSelect from './pages/ProjectSelect';
import InstallDevice from './pages/InstallDevice';
import ReportIssue from './pages/ReportIssue';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/projects" element={
              <ProtectedRoute>
                <ProjectSelect />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/install/:deviceType" element={
              <ProtectedRoute>
                <InstallDevice />
              </ProtectedRoute>
            } />
            <Route path="/report" element={
              <ProtectedRoute>
                <ReportIssue />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/projects" replace />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </AuthProvider>
  );
}
