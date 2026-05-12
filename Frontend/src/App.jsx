import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateQuiz from './pages/CreateQuiz';
import GameRoom from './pages/GameRoom';
import Results from './pages/Results';
import ProfilePage from './pages/ProfilePage';
import AIAgent from './components/AIAgent';
import './index.css';

const AnimatedBackground = () => (
  <div className="animated-bg" aria-hidden="true">
    {/* Aurora gradient blobs */}
    <div className="aurora-blob aurora-blob--1" />
    <div className="aurora-blob aurora-blob--2" />
    <div className="aurora-blob aurora-blob--3" />
    <div className="aurora-blob aurora-blob--4" />
    {/* Flowing wave overlay */}
    <div className="wave-layer" />
    <div className="wave-layer wave-layer--2" />
    {/* Subtle dot grid */}
    <div className="dot-grid" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <AnimatedBackground />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AIAgent />
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-quiz"
              element={
                <ProtectedRoute>
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/room/:roomCode"
              element={
                <ProtectedRoute>
                  <GameRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:roomCode"
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
