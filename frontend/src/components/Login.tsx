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
        // Validate passwords match
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
    setFormData({
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    });
  };

  return (
    <div className="min-h-screen bg-govuk-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg className="h-16 w-16" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="50" height="50" rx="10" fill="#1d70b8"/>
              <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
              <circle cx="25" cy="40" r="2" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-govuk-text">DevForge</h1>
          <p className="text-govuk-secondary-text mt-2">Internal Developer Platform</p>
        </div>

        {/* Login/Register Card */}
        <div className="bg-white rounded-none shadow-sm border border-govuk-border p-8">
          <h2 className="text-2xl font-bold text-govuk-text mb-6">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>

          {error && (
            <div role="alert" className="bg-[#fce8e8] border-l-4 border-govuk-error text-govuk-error px-4 py-3 rounded-none mb-6">
              <p className="font-bold">There is a problem</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-govuk-text mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-govuk w-full"
                placeholder="you@example.com"
              />
            </div>

            {isRegistering && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-govuk-text mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="input-govuk w-full"
                  placeholder="johndoe"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-govuk-text mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input-govuk w-full"
                placeholder="••••••••"
              />
            </div>

            {isRegistering && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-govuk-text mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-govuk w-full"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-govuk w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={toggleMode}
              className="text-govuk-link hover:text-govuk-link-hover font-medium text-sm block w-full underline"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
            {!isRegistering && (
              <a
                href="/password-reset"
                className="text-govuk-link hover:text-govuk-link-hover font-medium text-sm block underline"
              >
                Forgot your password?
              </a>
            )}
          </div>
        </div>

        {/* Demo Info */}
        <div className="mt-6 bg-[#d2e4f5] border-l-4 border-govuk-blue rounded-none p-4 text-sm text-govuk-text">
          <p className="font-medium mb-1">Demo Mode</p>
          <p>Register a new account to get started. Your projects will be isolated to your account.</p>
        </div>
      </div>
    </div>
  );
}
