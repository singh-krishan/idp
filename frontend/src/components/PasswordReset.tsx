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
      const response = await axios.post(`${API_URL}/api/v1/auth/password-reset/request`, { email });
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
        setSuccess('Reset token generated! Copy it and use it below.');
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
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/api/v1/auth/password-reset/confirm`, {
        reset_token: resetToken,
        new_password: newPassword,
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4 relative overflow-hidden">
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
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Password Reset</h1>
          <p className="text-gray-500 text-sm mt-1">Reset your account password</p>
        </div>

        {/* Form card */}
        <div className="glass-card p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-slide-down">
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-slide-down">
              <p className="text-emerald-400 text-sm">{success}</p>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <h2 className="font-display text-lg font-bold text-white mb-4">Request Reset Token</h2>

              <div>
                <label htmlFor="email" className="input-label">Email Address</label>
                <input
                  id="email" name="email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field" placeholder="you@example.com"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? 'Requesting...' : 'Request Reset Token'}
              </button>

              {resetToken && (
                <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-400 mb-2">Your Reset Token:</p>
                  <code className="block p-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-xs break-all text-gray-300 font-mono">
                    {resetToken}
                  </code>
                  <p className="text-[11px] text-gray-500 mt-2">Expires in 1 hour.</p>
                </div>
              )}

              <button type="button" onClick={() => setStep('reset')}
                className="w-full text-accent-400 hover:text-accent-300 text-sm font-medium mt-2 transition-colors">
                I already have a reset token
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="font-display text-lg font-bold text-white mb-4">Reset Password</h2>

              <div>
                <label htmlFor="resetToken" className="input-label">Reset Token</label>
                <input
                  id="resetToken" name="resetToken" type="text" required
                  value={resetToken} onChange={(e) => setResetToken(e.target.value)}
                  className="input-field font-mono text-xs" placeholder="Paste your reset token"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="input-label">New Password</label>
                <input
                  id="newPassword" name="newPassword" type="password" required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field" placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                <input
                  id="confirmPassword" name="confirmPassword" type="password" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field" placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button type="button" onClick={() => setStep('request')}
                className="w-full text-gray-500 hover:text-gray-400 text-sm font-medium mt-2 transition-colors">
                ← Back to request token
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <a href="/" className="text-accent-400 hover:text-accent-300 text-sm font-medium transition-colors no-underline">
              Back to Login
            </a>
          </div>
        </div>

        <div className="mt-5 glass-card px-4 py-3 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-accent-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
            <span className="text-accent-400 text-xs">i</span>
          </div>
          <p className="text-sm text-gray-400">
            Demo mode: reset token is displayed on screen instead of being emailed.
          </p>
        </div>
      </div>
    </div>
  );
}
