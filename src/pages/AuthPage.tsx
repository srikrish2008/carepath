import React, { useState } from 'react';
import { Lock, Mail, User, Sparkles, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { Button } from '../components/common/Button';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { loginWithEmail, register, loginAsDemo } = useAuth();
  const { t } = useI18n();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(t.auth.validation.emailRequired);
      return;
    }

    if (password.length < 6) {
      setError(t.auth.validation.passwordShort);
      return;
    }

    setIsLoading(true);

    if (isRegistering) {
      if (!name.trim()) {
        setError(t.auth.validation.nameRequired);
        setIsLoading(false);
        return;
      }
      const ok = await register({ email, name });
      setIsLoading(false);
      if (ok) onSuccess();
    } else {
      const ok = await loginWithEmail(email, name);
      setIsLoading(false);
      if (ok) onSuccess();
    }
  };

  const handleDemoAccess = (role: 'patient' | 'admin') => {
    loginAsDemo(role);
    onSuccess();
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-teal-600 flex items-center justify-center text-white font-bold mx-auto shadow-md shadow-brand-500/20">
          CP
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {isRegistering ? t.auth.registerTitle : t.auth.loginTitle}
        </h1>
        <p className="text-xs text-slate-500">{t.app.subtitle}</p>
      </div>

      {/* Instant Judge Demo Access Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-brand-50 border border-teal-200 text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-teal-900">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>{t.auth.demoJudgeBtn}</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          {t.auth.demoJudgeDesc}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="bg-white"
            onClick={() => handleDemoAccess('patient')}
          >
            {t.auth.asPatient}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDemoAccess('admin')}
          >
            {t.auth.asAdmin}
          </Button>
        </div>
      </div>

      {/* Demo Environment Privacy Notice */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px]">
          {t.app.dataEntryNotice}
        </p>
      </div>

      {/* Traditional Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs"
      >
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        {isRegistering && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t.auth.nameLabel}</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 mb-1">{t.auth.emailLabel}</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@carepath.example"
              required
              className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">{t.auth.passwordLabel}</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full text-xs rounded-lg border-slate-300 pl-9 pr-3 py-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 mt-2"
          isLoading={isLoading}
        >
          {isRegistering ? t.auth.registerBtn : t.auth.loginBtn}
        </Button>

        <div className="text-center pt-2 text-[11px] text-slate-500">
          {isRegistering ? t.auth.haveAccount : t.auth.noAccount}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-brand-600 font-semibold hover:underline"
          >
            {isRegistering ? t.auth.loginBtn : t.auth.registerBtn}
          </button>
        </div>
      </form>
    </div>
  );
};
