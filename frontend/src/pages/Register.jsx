import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import authService from '../services/firebase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" className="mr-2.5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const formVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const formatError = (code) => {
    const messages = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
    };
    return messages[code] || 'Something went wrong. Please try again.';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authService.registerWithEmail(email, password, name);
      setSuccess('Account created! Please verify your email, then sign in.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(formatError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(formatError(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={formVariants} initial="hidden" animate="visible" className="w-full flex flex-col justify-center">
      {/* Sleek Asymmetrical Left-Aligned Header */}
      <div className="mb-8 text-left">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2.5 tracking-tight leading-tight">Create your account</h2>
        <p className="text-sm text-neutral-500 font-medium">Join thousands of farmers using AI insights.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 mb-6">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-100 mb-6">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{success}</span>
        </div>
      )}

      {/* Modern Google Register Button */}
      <button
        className="w-full flex items-center justify-center h-12 border border-neutral-200 rounded-xl text-neutral-700 font-semibold hover:bg-neutral-50 transition-all duration-200 bg-white shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]"
        onClick={handleGoogleRegister}
        disabled={loading}
        type="button"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Styled Divider */}
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">or register with email</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleRegister}>
        <Input
          label="Full name"
          type="text"
          placeholder="John Farmer"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
        <Input
          label="Email address"
          type="email"
          placeholder="farmer@example.com"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min. 6 characters"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />

        <Button 
          type="submit" 
          fullWidth 
          disabled={loading}
          className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all duration-200 mt-2 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          {loading ? (
            'Creating account…'
          ) : (
            <>
              Create Account <ArrowRight size={16} />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-500 font-medium">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
};

export default Register;
