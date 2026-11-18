import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, CheckCircle2, ShieldCheck, Mail, Phone, Lock, User, ArrowLeft } from 'lucide-react';
import { CLOUDINARY_MEDIA } from '../constants/cloudinaryMedia';

export default function GoogleCompleteProfilePage({ setActiveTab }) {
  const { pendingGoogleAuth, completeGoogleProfile, savePendingGoogleAuth } = useAuth();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load pending Google profile info from context or sessionStorage
  const effectiveGoogleAuth = pendingGoogleAuth || (() => {
    try {
      return JSON.parse(sessionStorage.getItem('nmd_pending_google_auth') || 'null');
    } catch (_) {
      return null;
    }
  })();

  useEffect(() => {
    if (effectiveGoogleAuth?.name && !name) {
      setName(effectiveGoogleAuth.name);
    }
  }, [effectiveGoogleAuth]);

  // If no Google auth session exists, safely redirect back to login
  if (!effectiveGoogleAuth || !effectiveGoogleAuth.idToken) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-emerald-100">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Google Session</h2>
          <p className="text-gray-600 text-sm mb-6">
            Please sign in with your Google account first to complete your profile setup.
          </p>
          <button
            onClick={() => setActiveTab('login')}
            className="w-full bg-[#0D5C3A] hover:bg-[#083B25] text-white font-semibold py-3 px-4 rounded-xl transition duration-200"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanDigits = mobile.trim().replace(/\D/g, '');
    if (cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setError('Mobile number must start with 6, 7, 8, or 9.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    const res = await completeGoogleProfile({
      name: name.trim(),
      mobile: cleanDigits,
      password,
      portal: effectiveGoogleAuth.portal || 'customer',
    });
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.user.role === 'delivery_boy') {
        localStorage.setItem('nmd_current_tab', 'delivery-boy-app');
        setActiveTab('delivery-boy-app');
      } else {
        const postLoginCustomerPage = localStorage.getItem('nmd_post_login_customer_page');
        if (postLoginCustomerPage) {
          localStorage.removeItem('nmd_post_login_customer_page');
        }
        if (window.innerWidth <= 768) {
          const targetPage = ['dashboard', 'products', 'subscription', 'deliveries', 'profile'].includes(postLoginCustomerPage)
            ? postLoginCustomerPage
            : 'profile';
          localStorage.setItem('nmd_customer_page', targetPage);
          localStorage.setItem('nmd_current_tab', 'customer-portal');
          setActiveTab('customer-portal');
        } else {
          localStorage.setItem('nmd_current_tab', 'home');
          setActiveTab('home');
        }
      }
    } else {
      setError(res.message || 'Unable to complete your registration. Please try again.');
    }
  };

  const handleCancel = () => {
    savePendingGoogleAuth(null);
    sessionStorage.removeItem('nmd_pending_google_auth');
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-lg w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <img
            src={CLOUDINARY_MEDIA.logo}
            alt="Natural Milk Dairy"
            className="h-16 mx-auto mb-3 object-contain cursor-pointer"
            onClick={() => setActiveTab('home')}
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14241A] tracking-tight">
            Complete Your Profile
          </h1>
          <p className="mt-1 text-sm text-[#597361]">
            Just a few quick details to activate your doorstep morning milk deliveries.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#E2ECE3] overflow-hidden">
          {/* Google Verified Account Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-[#EAF5EE] to-emerald-50 border-b border-[#BBF7D0] p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              {effectiveGoogleAuth.picture ? (
                <img
                  src={effectiveGoogleAuth.picture}
                  alt={effectiveGoogleAuth.name || 'Google User'}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white border border-[#BBF7D0] flex items-center justify-center font-black text-lg text-[#0D5C3A] shadow-sm">
                  G
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-gray-900 truncate">
                    {effectiveGoogleAuth.name || 'Google Account'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    Verified with Google
                  </span>
                </div>
                {/* Email is shown automatically and locked/read-only */}
                <div className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0D5C3A] bg-white/80 py-0.5 px-2 rounded-md inline-flex border border-emerald-200">
                  <Mail className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{effectiveGoogleAuth.email}</span>
                  <Lock className="w-3 h-3 text-gray-400 ml-1 flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <span className="font-bold text-base leading-none">!</span>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Google Email Field (Read-only / Locked) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Google Email Address <span className="text-emerald-700 font-semibold normal-case">(Automatic)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={effectiveGoogleAuth.email}
                  disabled
                  readOnly
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl font-medium cursor-not-allowed select-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This verified Google email will be linked to your account for one-click access.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#0D5C3A] focus:border-transparent outline-none transition duration-150"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-sm">
                  <Phone className="w-4 h-4 mr-1 text-[#0D5C3A]" />
                  +91
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-20 pr-4 py-3 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#0D5C3A] focus:border-transparent outline-none transition duration-150"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Required for doorstep delivery updates and morning milk drop confirmations.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Create Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-11 pr-11 py-3 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#0D5C3A] focus:border-transparent outline-none transition duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enables password login as an alternative to Google Sign-In anytime.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-11 pr-11 py-3 bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-[#0D5C3A] focus:border-transparent outline-none transition duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0D5C3A] hover:bg-[#083B25] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Completing Setup...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Complete Registration & Sign In</span>
                  </>
                )}
              </button>
            </div>

            {/* Back / Cancel */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel and return to Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
