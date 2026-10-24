import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Cloud, Eye, EyeOff, LoaderCircle, ShieldCheck, Utensils } from 'lucide-react';
import ProviderApp, { type ProviderData } from './ProviderApp';
import { loadProviderData } from './lib/providerRepository';
import { supabase, supabaseConfigured } from './lib/supabaseClient';

type AuthMode = 'signin' | 'signup';

export default function ProviderGate({ onBack }: { onBack: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<ProviderData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data: result, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(sessionError.message);
      setSession(result.session);
      setAuthReady(true);
    }).catch((reason: unknown) => {
      if (alive) {
        setError(reason instanceof Error ? reason.message : 'Could not read the sign-in session.');
        setAuthReady(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(nextSession);
      setError('');
      setMessage('');
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setData(null);
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setData(null);
    setDataLoading(true);
    setError('');
    loadProviderData(userId).then(result => {
      if (!cancelled) setData(result);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load provider records.');
    }).finally(() => {
      if (!cancelled) setDataLoading(false);
    });
    return () => { cancelled = true; };
  }, [session?.user.id]);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const { data: result, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (!result.session) {
          setMessage('Account created. Check your email for the confirmation link, then return here and sign in.');
        } else {
          setMessage('Account created successfully.');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPasswordRecovery(false);
      setPassword('');
      setMessage('Password updated. You can continue using your provider workspace.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!supabase) return;
    if (!email.trim()) {
      setError('Enter your email address first, then choose Forgot password.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setMessage('If an account exists for that email, a password reset link will be sent.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not request a password reset.');
    } finally {
      setBusy(false);
    }
  };

  if (!supabaseConfigured) {
    return <div className="auth-page"><section className="auth-card"><div className="auth-brand"><span><Cloud size={23}/></span><div><b>My Tiffin Provider</b><small>Supabase setup required</small></div></div><h1>Connect your database</h1><p>Create a <code>.env.local</code> file in the project root using the values from your Supabase dashboard.</p><pre>{'VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY'}</pre><p>Then restart <code>npm run dev</code>. Never use a secret or service-role key in frontend environment variables.</p><button className="btn btn-outline" onClick={onBack}><ArrowLeft size={16}/> Back</button></section></div>;
  }

  if (!authReady) return <div className="auth-page"><div className="auth-loading"><LoaderCircle className="spin" size={24}/> Checking your session…</div></div>;

  if (session?.user) {
    if (passwordRecovery) return <div className="auth-page"><section className="auth-card"><div className="auth-brand"><span><ShieldCheck size={23}/></span><div><b>My Tiffin Provider</b><small>Account recovery</small></div></div><h1>Choose a new password</h1><p>Use a strong password you do not use on other websites.</p><form className="auth-form" onSubmit={submitNewPassword}><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>{error&&<div className="auth-error" role="alert">{error}</div>}<button className="btn btn-primary auth-submit" disabled={busy}>{busy?'Updating…':'Update password'}</button></form></section></div>;
    if (error) return <div className="auth-page"><section className="auth-card"><div className="auth-brand"><span><Cloud size={23}/></span><div><b>My Tiffin Provider</b><small>Database connection</small></div></div><h1>Couldn't load your records</h1><p className="auth-error">{error}</p><div className="auth-actions"><button className="btn btn-outline" onClick={async () => { setError(''); setDataLoading(true); try { setData(await loadProviderData(session.user.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load records.'); } finally { setDataLoading(false); } }}>Try again</button><button className="btn btn-outline" onClick={() => supabase?.auth.signOut()}>Sign out</button></div></section></div>;
    if (dataLoading || !data) return <div className="auth-page"><div className="auth-loading"><LoaderCircle className="spin" size={24}/> Loading your cloud records…</div></div>;
    return <ProviderApp userId={session.user.id} userEmail={session.user.email || 'Signed-in provider'} initialData={data} onSignOut={() => { void supabase?.auth.signOut(); }} onBack={onBack} />;
  }

  return <div className="auth-page"><section className="auth-card"><button className="auth-back" onClick={onBack}><ArrowLeft size={16}/> Back to workspace selection</button><div className="auth-brand"><span><Utensils size={23}/></span><div><b>My Tiffin Provider</b><small>Secure cloud workspace</small></div></div><div className="auth-eyebrow"><ShieldCheck size={14}/> YOUR RECORDS, YOUR ACCOUNT</div><h1>{mode === 'signin' ? 'Welcome back' : 'Create provider account'}</h1><p>{mode === 'signin' ? 'Sign in to manage your customers, deliveries, and payments from any browser.' : 'Create an account to save your tiffin business records securely in Supabase.'}</p><form onSubmit={submitAuth} className="auth-form"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<div className="auth-password"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>{error && <div className="auth-error" role="alert">{error}</div>}{message && <div className="auth-message" role="status">{message}</div>}<button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <ShieldCheck size={17}/>} {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button></form><div className="auth-switch">{mode === 'signin' ? <>New to the app? <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create an account</button><button className="auth-forgot" onClick={resetPassword} disabled={busy}>Forgot password?</button></> : <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign in</button></>}</div><div className="auth-security"><ShieldCheck size={16}/><span>Database rules restrict provider records to the signed-in account. Use a unique, strong password.</span></div></section></div>;
}
