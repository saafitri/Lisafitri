/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginFormProps {
  onLoginSuccess: (token: string, user: any) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function LoginForm({ onLoginSuccess, triggerToast }: LoginFormProps) {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Lockout States
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  // Read saved failed attempts from localStorage (persists refresh)
  useEffect(() => {
    const savedAttempts = localStorage.getItem('login_attempts');
    const savedLockUntil = localStorage.getItem('login_lock_until');
    
    if (savedLockUntil) {
      const lockTime = new Date(savedLockUntil);
      if (lockTime > new Date()) {
        const remaining = Math.ceil((lockTime.getTime() - Date.now()) / 1000);
        setIsLocked(true);
        setLockSeconds(remaining);
        setFailedAttempts(5);
      } else {
        localStorage.removeItem('login_lock_until');
        localStorage.setItem('login_attempts', '0');
      }
    } else if (savedAttempts) {
      setFailedAttempts(parseInt(savedAttempts, 10));
    }
  }, []);

  // Lockout Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockSeconds > 0) {
      timer = setInterval(() => {
        setLockSeconds((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            localStorage.setItem('login_attempts', '0');
            localStorage.removeItem('login_lock_until');
            triggerToast('Kunci visual terbuka. Anda dapat mencoba login kembali.', 'success');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockSeconds, triggerToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      triggerToast(`Login terkunci. Coba lagi dalam ${lockSeconds} detik.`, 'error');
      return;
    }
    if (!identity || !password) {
      setErrorMsg('Mohon isi Email/Username dan Password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identity, password }),
      });

      const data = await res.json();

      if (res.status === 423 || data.locked) {
        // Handle lockout from server
        setIsLocked(true);
        setLockSeconds(data.remainingSecs || 60);
        const lockUntil = new Date(Date.now() + (data.remainingSecs || 60) * 1000);
        localStorage.setItem('login_lock_until', lockUntil.toISOString());
        localStorage.setItem('login_attempts', '5');
        setFailedAttempts(5);
        setErrorMsg(data.message);
        triggerToast('Terlalu banyak percobaan gagal. Akun dikunci secara visual.', 'error');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem('login_attempts', nextAttempts.toString());

        if (nextAttempts >= 5) {
          setIsLocked(true);
          setLockSeconds(60);
          const lockUntil = new Date(Date.now() + 60000);
          localStorage.setItem('login_lock_until', lockUntil.toISOString());
          setErrorMsg('Sistem Terkunci Visual! Salah password sebanyak 5 kali. Silakan tunggu 60 detik.');
          triggerToast('Salah password 5 kali. Sistem dikunci secara visual.', 'error');
        } else {
          setErrorMsg(data.message || 'Login gagal.');
          triggerToast(data.message || 'Password atau Username salah.', 'error');
        }
        setLoading(false);
        return;
      }

      // Success
      localStorage.setItem('login_attempts', '0');
      triggerToast(`Selamat datang kembali, ${data.user.nama}!`, 'success');
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal terhubung ke server autentikasi.');
      triggerToast('Gagal menghubungi server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="flex items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* Header Visual */}
        <div className="bg-[#008080] p-8 text-center text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-10 -mb-10 blur-xl"></div>
          <motion.div 
            animate={isLocked ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ repeat: Infinity, repeatDelay: 2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-md mb-4"
          >
            {isLocked ? (
              <Lock className="w-8 h-8 text-rose-300" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-teal-100" />
            )}
          </motion.div>
          <h2 className="text-2xl font-extrabold tracking-wider">SIDELKAS</h2>
          <p className="text-teal-100 text-[10px] mt-1.5 uppercase tracking-widest font-bold">
            Sistem Integrasi Data Layanan Kesehatan &amp; Jaminan Sosial
          </p>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                isLocked 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{isLocked ? 'AKUN TERKUNCI: ' : 'Pemberitahuan: '}</span>
                {errorMsg}
              </div>
            </motion.div>
          )}

          {isLocked && (
            <div className="text-center p-4 bg-rose-50 border border-rose-100 rounded-xl">
              <span className="block text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">
                Kunci Keamanan Visual Aktif
              </span>
              <span className="text-3xl font-extrabold text-rose-600 font-mono">
                {lockSeconds}s
              </span>
              <p className="text-[11px] text-rose-500 mt-2">
                Sistem mengunci input untuk mencegah serangan brute-force.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="identity" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Email atau Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="identity"
                  disabled={isLocked || loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="Masukkan email atau username"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  disabled={isLocked || loading}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50 disabled:bg-gray-100"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            id="btn-login"
            disabled={isLocked || loading}
            style={{ backgroundColor: isLocked ? '#9ca3af' : '#008080' }}
            className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isLocked ? (
              'Akun Terkunci Visual'
            ) : (
              'Masuk ke Sistem'
            )}
          </button>

          <div className="text-center pt-2">
            <span className="text-[11px] text-gray-400">
              Hak Cipta © 2026 Kementerian Terkait Sektor Kesehatan &amp; Jaminan Sosial.
            </span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
