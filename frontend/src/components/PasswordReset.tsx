import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function PasswordReset() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/password-reset/request`, {
        email,
      });

      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
        setSuccess('Reset token generated! Please copy it and use it below.');
        setStep('reset');
      } else {
        setSuccess('If the email exists, a reset token has been generated.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/api/v1/auth/password-reset/confirm`, {
        reset_token: resetToken,
        new_password: newPassword,
      });

      setSuccess('Password reset successfully! You can now login with your new password.');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg className="h-16 w-16" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="50" height="50" rx="10" fill="url(#gradient)"/>
              <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
              <circle cx="25" cy="40" r="2" fill="white"/>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="50" y2="50">
                  <stop offset="0%" stopColor="#4F46E5"/>
                  <stop offset="100%" stopColor="#EC4899"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Password Reset</h1>
          <p className="text-gray-600 mt-2">Reset your account password</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Reset Token</h2>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Requesting...' : 'Request Reset Token'}
              </button>

              {resetToken && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900 mb-2">Your Reset Token:</p>
                  <code className="block p-2 bg-white border border-yellow-300 rounded text-xs break-all">
                    {resetToken}
                  </code>
                  <p className="text-xs text-yellow-800 mt-2">
                    Copy this token and use it in the next step. It expires in 1 hour.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('reset')}
                className="w-full text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2"
              >
                I already have a reset token
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Reset Password</h2>

              <div>
                <label htmlFor="resetToken" className="block text-sm font-medium text-gray-700 mb-1">
                  Reset Token
                </label>
                <input
                  id="resetToken"
                  name="resetToken"
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Paste your reset token here"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2"
              >
                ← Back to request token
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <a href="/" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
              Back to Login
            </a>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Demo Mode</p>
          <p>In production, the reset token would be sent to your email. For demo purposes, it's displayed on screen.</p>
        </div>
      </div>
    </div>
  );
}
