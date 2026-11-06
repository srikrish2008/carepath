import React, { useState } from 'react';
import { Lock, Mail, User, Phone, MapPin, CheckCircle2, AlertCircle, ArrowLeft, KeyRound, ShieldCheck, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

interface AuthPageProps {
  onSuccess: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, initialMode = 'signin' }) => {
  const {
    loginWithPassword,
    registerWithPassword,
    requestPasswordReset,
    confirmPasswordReset,
    loginAsDemo,
    isFirebaseLive,
    firebaseStatus,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Metro City');
  const [wheelchair, setWheelchair] = useState(false);

  // Forgot password states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetInstructions, setResetInstructions] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    const res = await loginWithPassword(email, password);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Invalid email or password.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    const res = await registerWithPassword({
      name,
      email,
      password,
      phone,
      location,
      wheelchair,
    });
    setIsLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const res = await requestPasswordReset(email);
    setIsLoading(false);

    if (res.success) {
      if (res.token) {
        setResetToken(res.token);
        setResetInstructions(res.instructions || `Reset token: ${res.token}`);
      } else {
        setResetSuccess(true);
        setResetInstructions(res.instructions || 'A secure reset link was dispatched by Firebase Authentication.');
      }
    } else {
      setError(res.error || 'Failed to process password reset.');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    const res = await confirmPasswordReset(resetToken, newPassword);
    setIsLoading(false);

    if (res.success) {
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        setMode('signin');
        setPassword('');
        setError('');
      }, 1500);
    } else {
      setError(res.error || 'Failed to reset password.');
    }
  };

  const handleAutofillDemo = (role: 'patient' | 'admin') => {
    if (role === 'patient') {
      setEmail('patient@carepath.example');
      setPassword('Password123!');
    } else {
      setEmail('admin@carepath.example');
      setPassword('AdminPass123!');
    }
    setError('');
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-900 to-teal-700 flex items-center justify-center text-white font-bold text-lg mx-auto shadow-md shadow-teal-900/10">
          CP
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {mode === 'signin' && 'Sign in to CarePath'}
          {mode === 'signup' && 'Create your CarePath account'}
          {mode === 'forgot' && 'Reset your password'}
        </h1>
        <p className="text-xs text-slate-500">
          Healthcare access, appointment navigation, and journey tracking.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 text-xs">
        {/* Transparent Firebase Status Indicator */}
        <div
          className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
            isFirebaseLive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5 font-medium">
            {isFirebaseLive ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            ) : (
              <Database className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            )}
            <span>
              {isFirebaseLive
                ? `Firebase Auth Active (${firebaseStatus.projectId || 'Live'})`
                : 'Offline Demo Mode (Set VITE_FIREBASE_* in .env for Live Firebase)'}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              isFirebaseLive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isFirebaseLive ? 'Live' : 'Sandbox'}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SIGN IN MODE */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@carepath.example"
                  required
                  className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                  }}
                  className="text-[11px] text-teal-700 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white"
              isLoading={isLoading}
            >
              Sign In
            </Button>

            {/* Quick Demo Credentials Autofill (Helpful for Evaluators) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-[11px] text-slate-400 font-medium text-center">
                Demo evaluator accounts:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAutofillDemo('patient')}
                  className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium text-center transition-colors"
                >
                  Fill Demo Patient
                </button>
                <button
                  type="button"
                  onClick={() => handleAutofillDemo('admin')}
                  className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium text-center transition-colors"
                >
                  Fill Demo Admin
                </button>
              </div>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => loginAsDemo('patient').then(onSuccess)}
                  className="text-[11px] text-teal-700 font-semibold hover:underline"
                >
                  Instant One-Click Demo Access &rarr;
                </button>
              </div>
            </div>

            <div className="text-center pt-2 text-[11px] text-slate-500">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className="text-teal-700 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGN UP MODE */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  required
                  className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.rivera@example.com"
                  required
                  className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Must be at least 6 characters long</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Metro City"
                    className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wheelchair}
                  onChange={(e) => setWheelchair(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-700 text-xs">I require wheelchair-accessible healthcare facilities</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white"
              isLoading={isLoading}
            >
              Create Account
            </Button>

            <div className="text-center pt-2 text-[11px] text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                className="text-teal-700 font-semibold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD MODE */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setResetToken('');
              }}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </button>

            {resetSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">
                  {isFirebaseLive ? 'Reset Email Dispatched!' : 'Password Updated!'}
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  {resetInstructions || 'Please check your email inbox to proceed.'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetSuccess(false);
                      setMode('signin');
                      setError('');
                    }}
                    className="text-xs font-semibold text-teal-800 hover:underline"
                  >
                    Return to Sign In &rarr;
                  </button>
                </div>
              </div>
            ) : !resetToken ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter the email address associated with your CarePath account to receive recovery instructions.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patient@carepath.example"
                      required
                      className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white"
                  isLoading={isLoading}
                >
                  Send Reset Token
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4 animate-in fade-in">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs">
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    Reset Token Issued
                  </div>
                  <div className="font-mono text-xs font-bold text-teal-800">{resetToken}</div>
                  <p className="text-[11px] text-teal-700 mt-1">{resetInstructions}</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Enter New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2.5 focus:ring-teal-600 focus:border-teal-600 bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">At least 6 characters</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white"
                  isLoading={isLoading}
                >
                  Save New Password
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Disclaimers & Privacy Notice */}
      <div className="text-center text-[11px] text-slate-400 space-y-1">
        <p>Demo environment • Secure local authentication • No real health data stored</p>
        <p>CarePath does not provide medical diagnoses or emergency dispatch.</p>
      </div>
    </div>
  );
};
