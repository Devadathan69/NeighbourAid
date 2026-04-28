import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import Home from './pages/Home';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Matching from './pages/Matching';
import MissionTracker from './pages/MissionTracker';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Alerts from './pages/Alerts';
import AdminSetup from './pages/AdminSetup';
import ResilienceScore from './pages/ResilienceScore';
import ManageAdmins from './pages/ManageAdmins';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-slate-50 text-slate-800">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/setup-admin" element={<AdminSetup />} />
              
              {/* Admin Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/manage-admins" element={
                <ProtectedRoute requireAdmin>
                  <ManageAdmins />
                </ProtectedRoute>
              } />
              
              {/* Common protected routes or specific role routes */}
              <Route path="/matching" element={
                <ProtectedRoute>
                  <Matching />
                </ProtectedRoute>
              } />
              <Route path="/missions" element={
                <ProtectedRoute>
                  <MissionTracker />
                </ProtectedRoute>
              } />
              
              {/* Volunteer Routes */}
              <Route path="/profile" element={
                <ProtectedRoute requireVolunteer>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute requireVolunteer>
                  <Alerts />
                </ProtectedRoute>
              } />
              <Route path="/resilience" element={
                <ProtectedRoute>
                  <ResilienceScore />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
