import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
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
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-accent-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Link
      to={to}
      className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent-500 rounded-full" />
      )}
    </Link>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="noise-overlay" />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/home" className="flex items-center space-x-3 no-underline">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-glow">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2L2 12h4v8h12v-8h4L12 2z" />
                </svg>
              </div>
              <span className="font-display font-bold text-white text-lg tracking-tight">
                DevForge
              </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center space-x-1">
              <NavLink to="/home">Home</NavLink>
              <NavLink to="/create">Create</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/analytics">Analytics</NavLink>
              )}
            </div>

            {/* User area */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 hidden sm:block">
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="btn-ghost text-xs"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2L2 12h4v8h12v-8h4L12 2z" />
                </svg>
              </div>
              <span className="text-sm text-gray-500">
                DevForge <span className="text-gray-600">v0.2.0</span>
              </span>
            </div>
            <p className="text-xs text-gray-600">
              React + FastAPI + Kubernetes + ArgoCD
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
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Build Services at{' '}
              <span className="bg-gradient-to-r from-accent-400 to-cyber-cyan bg-clip-text text-transparent">
                Lightning Speed
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              Production-ready microservices with CI/CD, Kubernetes, and monitoring — deployed in minutes.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[
                { value: '4', label: 'Templates' },
                { value: '100%', label: 'Automated' },
                { value: '<5m', label: 'Deploy' },
              ].map((stat) => (
                <div key={stat.label} className="glass-card px-4 py-3 text-center">
                  <div className="text-xl font-display font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="animate-slide-up">
            <ProjectForm onSuccess={handleProjectCreated} />
          </div>
          <div className="animate-slide-up animate-stagger-2">
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
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-accent-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-500 animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-500 text-sm">Loading...</p>
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
