import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useState } from 'react'
import Login from './components/Login'
import PasswordReset from './components/PasswordReset'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import ProjectDetail from './pages/ProjectDetail'
import ProjectForm from './components/ProjectForm'
import ProjectList from './components/ProjectList'
import { useAuth } from './contexts/AuthContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-govuk-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-govuk-blue mx-auto"></div>
          <p className="mt-4 text-govuk-secondary-text">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-govuk-background">
      {/* Skip Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-govuk-focus focus:text-govuk-text focus:no-underline"
      >
        Skip to main content
      </a>

      {/* Navigation Header */}
      <nav className="bg-govuk-blue shadow-sm" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <Link to="/home" className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <svg className="h-12 w-12" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="50" height="50" rx="10" fill="white" fillOpacity="0.1"/>
                    <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
                    <circle cx="25" cy="40" r="2" fill="white"/>
                    <path d="M12 15L18 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M32 15L38 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Brand */}
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    DevForge
                  </h1>
                  <p className="text-white text-sm font-medium">
                    Internal Developer Platform
                  </p>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/home"
                className="text-white hover:text-govuk-focus transition-colors font-medium"
              >
                Home
              </Link>
              <Link
                to="/create"
                className="text-white hover:text-govuk-focus transition-colors font-medium"
              >
                Create Project
              </Link>
              <Link
                to="/dashboard"
                className="text-white hover:text-govuk-focus transition-colors font-medium"
              >
                Dashboard
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/analytics"
                  className="text-white hover:text-govuk-focus transition-colors font-medium"
                >
                  Analytics
                </Link>
              )}
              <div className="flex items-center space-x-4 text-white border-l border-white/20 pl-6">
                <span className="text-sm text-white">Welcome, {user?.username}</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-none transition-colors text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-govuk-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <svg className="h-8 w-8" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="50" height="50" rx="10" fill="#1d70b8"/>
                <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
                <circle cx="25" cy="40" r="2" fill="white"/>
              </svg>
              <div>
                <div className="text-sm font-semibold text-govuk-text">DevForge Platform</div>
                <div className="text-xs text-govuk-secondary-text">v0.1.0</div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-govuk-secondary-text">
              <a href="#" className="hover:text-govuk-link-hover transition-colors">Documentation</a>
              <a href="#" className="hover:text-govuk-link-hover transition-colors">API Reference</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-govuk-link-hover transition-colors">
                GitHub
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-govuk-border text-center">
            <p className="text-sm text-govuk-secondary-text">
              Powered by React, FastAPI, Kubernetes & ArgoCD • Built with ❤️ using Claude
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CreateProjectPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleProjectCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <AppLayout>
      {/* Hero Section */}
      <div className="bg-white border-b border-govuk-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-govuk-text sm:text-5xl">
              Build Services at
              <span className="text-govuk-blue"> Lightning Speed</span>
            </h2>
            <p className="mt-4 text-xl text-govuk-secondary-text max-w-3xl mx-auto">
              Create production-ready microservices with automated CI/CD, Kubernetes deployment, and monitoring in minutes
            </p>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="bg-white border border-govuk-border rounded-none p-4">
                <div className="text-3xl font-bold text-govuk-blue">2</div>
                <div className="text-sm text-govuk-secondary-text font-medium">Templates</div>
              </div>
              <div className="bg-white border border-govuk-border rounded-none p-4">
                <div className="text-3xl font-bold text-govuk-success">100%</div>
                <div className="text-sm text-govuk-secondary-text font-medium">Automated</div>
              </div>
              <div className="bg-white border border-govuk-border rounded-none p-4">
                <div className="text-3xl font-bold text-govuk-blue">&lt;5min</div>
                <div className="text-sm text-govuk-secondary-text font-medium">Deploy Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <ProjectForm onSuccess={handleProjectCreated} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ProjectList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-govuk-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-govuk-blue mx-auto"></div>
          <p className="mt-4 text-govuk-secondary-text">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
        <Route path="/password-reset" element={!user ? <PasswordReset /> : <Navigate to="/home" />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <AppLayout>
              <Home />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/create" element={
          <ProtectedRoute>
            <CreateProjectPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <ProjectDetail />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AppLayout>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
