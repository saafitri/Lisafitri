/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, Eye, EyeOff, HelpCircle, ChevronDown, ChevronUp, Key, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginFormProps {
  onLoginSuccess: (token: string, user: any) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function LoginForm({ onLoginSuccess, triggerToast }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login States
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(true); // Open by default for ease of use during demo!
  
  // Registration States
  const [regNama, setRegNama] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regErrorMsg, setRegErrorMsg] = useState('');
  
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNama || !regNik || !regEmail || !regUsername || !regPassword) {
      setRegErrorMsg('Semua kolom wajib diisi.');
      return;
    }
    if (regNik.length !== 16 || !/^\d+$/.test(regNik)) {
      setRegErrorMsg('NIK harus berjumlah tepat 16 digit angka.');
      return;
    }
    
    setRegLoading(true);
    setRegErrorMsg('');
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama: regNama,
          nik: regNik,
          email: regEmail,
          username: regUsername,
          password: regPassword
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setRegErrorMsg(data.message || 'Registrasi gagal.');
        triggerToast(data.message || 'Registrasi gagal.', 'error');
        return;
      }
      
      triggerToast('Pendaftaran berhasil! Silakan masuk dengan akun baru Anda.', 'success');
      // Autofill to login tab
      setIdentity(regUsername);
      setPassword(regPassword);
      setActiveTab('login');
      setErrorMsg('');
      
      // Clear registration form
      setRegNama('');
      setRegNik('');
      setRegEmail('');
      setRegUsername('');
      setRegPassword('');
    } catch (err) {
      console.error(err);
      setRegErrorMsg('Gagal menghubungkan ke server.');
      triggerToast('Gagal terhubung ke server.', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  const handleAutofill = (userRole: string, userIdent: string) => {
    // Clear lockout completely for premium demo convenience!
    setIsLocked(false);
    setLockSeconds(0);
    setFailedAttempts(0);
    localStorage.removeItem('login_lock_until');
    localStorage.setItem('login_attempts', '0');
    setErrorMsg('');
    
    setIdentity(userIdent);
    setPassword('password123');
    triggerToast(`Akun ${userRole} diisi otomatis!`, 'success');
  };

  const demoUsers = [
    { role: 'Admin (Nurul Kaifa)', ident: 'admin@test.com', desc: 'Kelola penduduk & audit log keamanan.' },
    { role: 'Penduduk (Qistysofiah)', ident: 'Qisty_1', desc: 'Lihat data diri & tracking bansos.' },
    { role: 'Op. Kesehatan (Dr. Aulya)', ident: 'op.kesehatan@test.com', desc: 'Input & verifikasi layanan kesehatan.' },
    { role: 'Op. Sosial (Esranata)', ident: 'op.sosial@test.com', desc: 'Verifikasi & kelola pengajuan bansos.' },
    { role: 'Supervisor (Prof. Lisa)', ident: 'supervisor@test.com', desc: 'Persetujuan akhir, backup database, grafik.' },
  ];

  return (
    <div id="login-container" className="flex flex-col lg:flex-row items-stretch justify-center gap-6 min-h-[85vh] py-8 px-4 max-w-5xl mx-auto">
      {/* Kolom Kiri: Form Login / Registrasi */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col justify-between"
      >
        <div>
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

          {/* Tab Selector */}
          <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
            <button
              type="button"
              id="tab-login"
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'login'
                  ? 'bg-[#008080] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              id="tab-register"
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === 'register'
                  ? 'bg-[#008080] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Daftar NIK
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSubmit}
                className="p-8 space-y-5"
              >
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
                  <span className="text-[10px] text-gray-400 leading-normal block">
                    Hak Cipta © 2026 Kementerian Terkait Sektor Kesehatan &amp; Jaminan Sosial.
                  </span>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleRegister}
                className="p-8 space-y-4"
              >
                {regErrorMsg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl flex items-start gap-3 text-xs leading-relaxed"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{regErrorMsg}</div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  <div>
                    <label htmlFor="reg-nama" className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Nama Lengkap (Sesuai KTP)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        id="reg-nama"
                        disabled={regLoading}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50"
                        placeholder="Contoh: Budi Santoso"
                        value={regNama}
                        onChange={(e) => setRegNama(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-nik" className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      NIK (16 Digit KTP)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        id="reg-nik"
                        maxLength={16}
                        disabled={regLoading}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50 font-mono"
                        placeholder="Contoh: 3201020304050003"
                        value={regNik}
                        onChange={(e) => setRegNik(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        id="reg-email"
                        disabled={regLoading}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50"
                        placeholder="Contoh: budi@email.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-username" className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        id="reg-username"
                        disabled={regLoading}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50"
                        placeholder="Contoh: budi_santoso"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="password"
                        id="reg-password"
                        disabled={regLoading}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] transition-all disabled:opacity-50"
                        placeholder="Buat password baru"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-register"
                  disabled={regLoading}
                  className="w-full py-2.5 bg-[#008080] text-white font-semibold rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer disabled:opacity-60"
                >
                  {regLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Buat Akun NIK'
                  )}
                </button>

                <div className="text-center pt-1">
                  <span className="text-[9px] text-gray-400 block">
                    SIDELKAS menerapkan Single Identity Number (SIN) kependudukan nasional.
                  </span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Kolom Kanan: Panduan Demo & Presentasi */}
      <motion.div
        initial={{ opacity: 0, x: 25 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col justify-between"
      >
        <div>
          <div className="bg-slate-800 p-6 text-white relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-lg"></div>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-sm uppercase tracking-wider">Akses Khusus Dosen Penguji</h3>
            </div>
            <div className="mt-2 p-2.5 bg-teal-950/40 border border-teal-800/40 rounded-xl">
              <p className="text-[11px] font-semibold text-teal-300">
                Yth. Ibu Dr. Amalia Rahmah, ST., MT.
              </p>
              <p className="text-slate-300 text-[10px] mt-1 leading-relaxed">
                Silakan pilih salah satu peran di bawah ini untuk mensimulasikan sistem multi-pengguna secara instan sesuai dengan isi laporan sdr. Lisa Rahma Fitri.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                Pilih Akun Demo (Autofill Instan)
              </h4>
              <div className="space-y-2">
                {demoUsers.map((user) => (
                  <button
                    key={user.ident}
                    type="button"
                    onClick={() => handleAutofill(user.role, user.ident)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-[#008080]/60 hover:bg-teal-50/30 transition-all group flex items-start justify-between cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-800 group-hover:text-[#008080]">{user.role}</span>
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">@{user.ident}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal">{user.desc}</p>
                    </div>
                    <Key className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#008080] shrink-0 mt-0.5 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Catatan Penting Presentasi
              </h4>
              <ul className="text-[10.5px] text-gray-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-gray-700">Registrasi Akun Mandiri</strong>: Warga dapat mendaftar mandiri via tab <span className="font-semibold text-[#008080]">Daftar NIK</span> untuk mensimulasikan integrasi database Dinas dan Dukcapil secara real-time.
                </li>
                <li>
                  <strong className="text-gray-700">Alur Verifikasi</strong>: Tunjukkan bagaimana data pendaftaran mandiri warga masuk ke antrean operator dinas terlebih dahulu untuk divalidasi sebelum disetujui final oleh supervisor.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-gray-100 text-center font-mono">
          <span className="text-[10px] text-slate-400 block">
            ID Applet: ddbddaf4-efd4-49b5-ba96-27783ad3c3c4
          </span>
        </div>
      </motion.div>
    </div>
  );
}
