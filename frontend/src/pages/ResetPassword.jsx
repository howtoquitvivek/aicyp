import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import authService from '../services/firebase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const formVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.sendPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many requests. Please wait a moment.',
      };
      setError(messages[err.code] || 'Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={formVariants} initial="hidden" animate="visible" className="w-full flex flex-col justify-center">
      {/* Sleek Asymmetrical Left-Aligned Header */}
      <div className="mb-8 text-left">
        <h2 className="text-3xl font-bold text-neutral-900 mb-2.5 tracking-tight leading-tight">Reset your password</h2>
        <p className="text-sm text-neutral-500 font-medium">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {!success ? (
        <>
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100 mb-6">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleReset}>
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
            
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading}
              className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all duration-200 mt-2 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                'Sending…'
              ) : (
                <>
                  Send Reset Link <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>
        </>
      ) : (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-100 mb-6 leading-relaxed">
          <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>
            Reset link sent to <strong>{email}</strong>. Check your inbox and spam folder.
          </span>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-neutral-500 font-medium hover:text-neutral-800 transition-colors">
        <Link to="/login" className="inline-flex items-center gap-1.5 hover:underline">
          <ArrowLeft size={16} />
          Back to sign in
        </Link>
      </p>
    </motion.div>
  );
};

export default ResetPassword;
