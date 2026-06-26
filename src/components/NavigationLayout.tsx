/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Menu, X, LogOut, Shield, User as UserIcon, LayoutDashboard, 
  FileText, Users, Database, ShieldAlert, CheckSquare, HeartHandshake, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role } from '../types';

interface NavigationLayoutProps {
  user: {
    id: string;
    email: string;
    nama: string;
    role: Role;
    nik?: string;
  };
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function NavigationLayout({ 
  user, 
  currentView, 
  onViewChange, 
  onLogout, 
  children 
}: NavigationLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Translate role label to Indonesian for polished UI display
  const getRoleLabel = (role: Role) => {
    switch (role) {
      case 'user': return 'Penduduk (User)';
      case 'operator_kesehatan': return 'Operator Kesehatan';
      case 'operator_sosial': return 'Operator Sosial / Dukcapil';
      case 'admin': return 'Administrator (Editor)';
      case 'supervisor': return 'Supervisor (Pejabat)';
      default: return role;
    }
  };

  // Define dynamic menu based on RBAC
  const getMenuItems = () => {
    const items = [];
    if (user.role === 'user') {
      items.push(
        { id: 'user-landing', label: 'Form Mandiri & Riwayat', icon: <FileText className="w-5 h-5" /> }
      );
    }
    if (user.role === 'operator_kesehatan' || user.role === 'operator_sosial') {
      items.push(
        { id: 'operator-dashboard', label: 'Antrean Verifikasi', icon: <CheckSquare className="w-5 h-5" /> }
      );
    }
    if (user.role === 'admin') {
      items.push(
        { id: 'admin-approval', label: 'Validasi Akhir (Accept)', icon: <ShieldAlert className="w-5 h-5" /> },
        { id: 'admin-users', label: 'Manajemen Pengguna', icon: <Users className="w-5 h-5" /> },
        { id: 'admin-logs', label: 'Audit Log & Live Tracker', icon: <Eye className="w-5 h-5" /> },
        { id: 'admin-backup', label: 'Backup & Konfigurasi', icon: <Database className="w-5 h-5" /> }
      );
    }
    if (user.role === 'supervisor') {
      items.push(
        { id: 'supervisor-dashboard', label: 'Dashboard Terpusat', icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: 'supervisor-reports', label: 'Filter & Ekspor Laporan', icon: <HeartHandshake className="w-5 h-5" /> }
      );
    }
    return items;
  };

  const menuItems = getMenuItems();

  return (
    <div id="app-shell" className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <header id="mobile-topbar" className="md:hidden flex items-center justify-between bg-white px-5 py-4 border-b border-gray-100 shadow-sm z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#008080] flex items-center justify-center text-white font-extrabold text-xs">SD</div>
          <span className="font-extrabold text-xs tracking-wider text-gray-800 uppercase">SIDELKAS</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 cursor-pointer"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION - #66B9BF (Soft Blue) */}
      <aside 
        id="sidebar-navigation"
        className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out md:static md:flex md:flex-col w-64 bg-[#66B9BF] text-white shrink-0 shadow-xl z-40`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-base shadow-inner">
              SD
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight tracking-wide">SIDELKAS</h1>
              <p className="text-[10px] text-teal-50 mt-0.5 tracking-wider font-semibold uppercase">Kesehatan &amp; Bansos</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white/75 hover:text-white focus:outline-none p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info (Mini card in sidebar) */}
        <div className="p-5 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-[#66B9BF] flex items-center justify-center font-extrabold text-sm border-2 border-white/20">
              {user.nama.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-xs truncate leading-normal text-white">{user.nama}</h4>
              <p className="text-[10px] text-teal-100 font-medium truncate mt-0.5 bg-black/10 px-2 py-0.5 rounded-md inline-block">
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <span className="block px-3 text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">MENU UTAMA</span>
          {menuItems.map((item) => {
            const isActive = currentView === item.id || (item.id === 'admin-logs' && ['admin-users', 'admin-backup', 'admin-approval'].includes(currentView) === false && currentView.startsWith('admin-'));
            return (
              <button
                key={item.id}
                id={`menu-item-${item.id}`}
                onClick={() => {
                  onViewChange(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white text-[#66B9BF] shadow-md shadow-[#66B9BF]/20 scale-[1.02]' 
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 bg-black/5 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 justify-center text-[10px] text-teal-50 font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Sesi Terenkripsi JWT</span>
          </div>
          <button
            onClick={onLogout}
            id="sidebar-btn-logout"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-100 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-500/25 cursor-pointer mt-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Aplikasi</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div id="main-content-layout" className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* DESKTOP TOPBAR */}
        <header id="desktop-topbar" className="hidden md:flex items-center justify-between bg-white px-8 py-4.5 border-b border-gray-100 shadow-sm z-20">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              Lembaga Sektoral
            </h2>
            <p className="text-lg font-bold text-gray-800 tracking-tight mt-0.5">
              Portal SIDELKAS - Integrasi Data Kesehatan &amp; Jaminan Sosial NIK
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-emerald-800 tracking-wide uppercase">Koneksi Aman</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                id="topbar-profile-btn"
                className="flex items-center gap-3 p-1 rounded-xl hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-100 focus:outline-none"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#008080] to-[#66B9BF] text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {user.nama.charAt(0)}
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-gray-700 leading-none">{user.nama}</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5 font-semibold uppercase">{getRoleLabel(user.role)}</span>
                </div>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    {/* Backdrop to close */}
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      id="profile-dropdown"
                      className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20"
                    >
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Akun Terdaftar</span>
                        <span className="block text-xs font-bold text-gray-700 truncate mt-0.5">{user.email}</span>
                        {user.nik && <span className="block text-[10px] font-mono text-gray-500 mt-1">NIK: {user.nik}</span>}
                      </div>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Keluar Sesi</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* VIEW SCROLLABLE BODY */}
        <main id="view-body" className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
