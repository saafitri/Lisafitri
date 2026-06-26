/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import NavigationLayout from './components/NavigationLayout';
import UserLanding from './components/UserLanding';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import Toast, { ToastType } from './components/Toast';
import { Role } from './types';

export default function App() {
  // Session States
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [user, setUser] = useState<any | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  // App Routing State
  const [currentView, setCurrentView] = useState<string>('login');

  // Toast States
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('info');
  const [toastVisible, setToastVisible] = useState(false);

  // Trigger toast helper
  const triggerToast = (msg: string, type: ToastType = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  };

  // Check login session (validate token on load)
  const checkSession = async (savedToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        // Route dynamically based on Role
        routeUser(data.user.role);
      } else {
        // Token stale, clear
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      triggerToast('Gagal terhubung ke server autentikasi. Menggunakan sesi lokal.', 'warning');
      // Decrypt/Parse token locally if server is temporarily unreachable (offline-resilience fallback)
      try {
        const base64Url = savedToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const parsed = JSON.parse(jsonPayload);
        setUser(parsed);
        routeUser(parsed.role);
      } catch (e) {
        handleLogout();
      }
    } finally {
      setLoadingMe(false);
    }
  };

  const routeUser = (role: Role) => {
    if (role === 'user') {
      setCurrentView('user-landing');
    } else if (role.startsWith('operator_')) {
      setCurrentView('operator-dashboard');
    } else if (role === 'admin') {
      setCurrentView('admin-approval');
    } else if (role === 'supervisor') {
      setCurrentView('supervisor-dashboard');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('jwt_token');
    if (savedToken) {
      checkSession(savedToken);
    } else {
      setLoadingMe(false);
      setCurrentView('login');
    }
  }, []);

  // Visual Session Warning (Sesi Anda akan berakhir dalam 5 menit)
  // Since JWT token is configured for 1 hour (60 minutes) in server,
  // we trigger a session alert 55 minutes after login activity.
  useEffect(() => {
    let sessionWarningTimer: NodeJS.Timeout;
    if (token && user) {
      // 55 minutes = 3300000 ms
      sessionWarningTimer = setTimeout(() => {
        triggerToast('Sesi Anda akan berakhir dalam 5 menit karena regulasi keamanan. Harap simpan pekerjaan Anda.', 'warning');
      }, 3300000);
    }
    return () => clearTimeout(sessionWarningTimer);
  }, [token, user]);

  const handleLoginSuccess = (newToken: string, loggedInUser: any) => {
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    routeUser(loggedInUser.role);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.removeItem('jwt_token');
    setToken(null);
    setUser(null);
    setCurrentView('login');
    triggerToast('Anda telah keluar dari sesi dengan aman.', 'info');
  };

  // Render view conditionally based on RBAC
  const renderViewContent = () => {
    if (!user) return <LoginForm onLoginSuccess={handleLoginSuccess} triggerToast={triggerToast} />;

    switch (currentView) {
      case 'user-landing':
        if (user.role !== 'user') return <div className="text-xs text-red-500 font-bold">Akses Ditolak. Peran Anda tidak sesuai.</div>;
        return <UserLanding user={user} token={token!} triggerToast={triggerToast} />;

      case 'operator-dashboard':
        if (!user.role.startsWith('operator_')) return <div className="text-xs text-red-500 font-bold">Akses Ditolak. Peran Anda tidak sesuai.</div>;
        return <OperatorDashboard user={user} token={token!} triggerToast={triggerToast} />;

      case 'admin-approval':
      case 'admin-users':
      case 'admin-logs':
      case 'admin-backup':
        if (user.role !== 'admin') return <div className="text-xs text-red-500 font-bold">Akses Ditolak. Peran Anda tidak sesuai.</div>;
        return <AdminDashboard token={token!} triggerToast={triggerToast} initialSubTab={currentView} />;

      case 'supervisor-dashboard':
      case 'supervisor-reports':
        if (user.role !== 'supervisor') return <div className="text-xs text-red-500 font-bold">Akses Ditolak. Peran Anda tidak sesuai.</div>;
        return <SupervisorDashboard token={token!} triggerToast={triggerToast} />;

      default:
        return <div className="text-xs text-gray-400">Pemberitahuan: Halaman tidak ditemukan atau sedang dikembangkan.</div>;
    }
  };

  if (loadingMe) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#008080] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <h4 className="text-sm font-extrabold text-gray-700 tracking-wider uppercase">Memuat Sesi Aman</h4>
          <p className="text-xs text-gray-400 font-medium font-mono">Menghubungkan Portal Integrasi Nasional...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Toast Notification Helper */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        isVisible={toastVisible} 
        onClose={() => setToastVisible(false)} 
      />

      {user ? (
        <NavigationLayout 
          user={user} 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onLogout={handleLogout}
        >
          {renderViewContent()}
        </NavigationLayout>
      ) : (
        <div className="py-12 px-4 max-w-7xl mx-auto">
          {renderViewContent()}
        </div>
      )}

    </div>
  );
}
