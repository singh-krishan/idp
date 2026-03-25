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
    <div className="min-h-screen bg-govuk-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg className="h-16 w-16" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="50" height="50" rx="10" fill="#1d70b8"/>
              <path d="M25 10L15 20H20V35H30V20H35L25 10Z" fill="white"/>
              <circle cx="25" cy="40" r="2" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-govuk-text">Password Reset</h1>
          <p className="text-govuk-secondary-text mt-2">Reset your account password</p>
        </div>

        <div className="bg-white rounded-none shadow-sm border border-govuk-border p-8">
          {error && (
            <div role="alert" className="bg-[#fce8e8] border-l-4 border-govuk-error text-govuk-error px-4 py-3 rounded-none mb-6">
              <p className="font-bold">There is a problem</p>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-[#e7f2ed] border-l-4 border-govuk-success text-govuk-success px-4 py-3 rounded-none mb-6">
              <p className="font-bold">Success</p>
              <p>{success}</p>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <h2 className="text-2xl font-bold text-govuk-text mb-4">Request Reset Token</h2>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-govuk-text mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-govuk w-full"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-govuk w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Requesting...' : 'Request Reset Token'}
              </button>

              {resetToken && (
                <div className="mt-4 p-4 bg-[#fff7e6] border-l-4 border-govuk-warning rounded-none">
                  <p className="text-sm font-medium text-govuk-text mb-2">Your Reset Token:</p>
                  <code className="block p-2 bg-white border border-govuk-border rounded-none text-xs break-all">
                    {resetToken}
                  </code>
                  <p className="text-xs text-govuk-text mt-2">
                    Copy this token and use it in the next step. It expires in 1 hour.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('reset')}
                className="w-full text-govuk-link hover:text-govuk-link-hover font-medium text-sm mt-2 underline"
              >
                I already have a reset token
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-govuk-text mb-4">Reset Password</h2>

              <div>
                <label htmlFor="resetToken" className="block text-sm font-medium text-govuk-text mb-1">
                  Reset Token
                </label>
                <input
                  id="resetToken"
                  name="resetToken"
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="input-govuk w-full"
                  placeholder="Paste your reset token here"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-govuk-text mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-govuk w-full"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-govuk-text mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-govuk w-full"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-govuk w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full text-govuk-link hover:text-govuk-link-hover font-medium text-sm mt-2 underline"
              >
                ← Back to request token
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <a href="/" className="text-govuk-link hover:text-govuk-link-hover font-medium text-sm underline">
              Back to Login
            </a>
          </div>
        </div>

        <div className="mt-6 bg-[#d2e4f5] border-l-4 border-govuk-blue rounded-none p-4 text-sm text-govuk-text">
          <p className="font-medium mb-1">Demo Mode</p>
          <p>In production, the reset token would be sent to your email. For demo purposes, it's displayed on screen.</p>
        </div>
      </div>
    </div>
  );
}
