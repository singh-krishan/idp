import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        await register(formData.email, formData.username, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setFormData({ email: '', username: '', password: '', confirmPassword: '' });
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="noise-overlay" />

      <div className="relative max-w-sm w-full animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 items-center justify-center shadow-glow-lg mb-4">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2L2 12h4v8h12v-8h4L12 2z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">DevForge</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Developer Platform</p>
        </div>

        {/* Form card */}
        <div className="glass-card p-8">
          <h2 className="font-display text-xl font-bold text-white mb-6">
            {isRegistering ? 'Create Account' : 'Welcome back'}
          </h2>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-slide-down">
              <p className="text-rose-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="input-label">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            {isRegistering && (
              <div className="animate-slide-down">
                <label htmlFor="username" className="input-label">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="johndoe"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="input-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div className="animate-slide-down">
                <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </span>
              ) : isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={toggleMode}
              className="text-accent-400 hover:text-accent-300 text-sm font-medium transition-colors"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
            {!isRegistering && (
              <a
                href="/password-reset"
                className="text-gray-500 hover:text-gray-400 text-sm block transition-colors no-underline"
              >
                Forgot your password?
              </a>
            )}
          </div>
        </div>

        {/* Demo hint */}
        <div className="mt-5 glass-card px-4 py-3 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-accent-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
            <span className="text-accent-400 text-xs">i</span>
          </div>
          <p className="text-sm text-gray-400">
            Register a new account to get started. Projects are isolated per account.
          </p>
        </div>
      </div>
    </div>
  );
}
