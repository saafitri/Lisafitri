/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DataStatus } from '../types';

interface StatusBadgeProps {
  status: DataStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let bgClass = '';
  let textClass = '';
  let label = '';

  switch (status) {
    case 'pending':
      bgClass = 'bg-[#F1C40F]/15 border-[#F1C40F]/30';
      textClass = 'text-amber-800 dark:text-amber-300';
      label = 'Pending';
      break;
    case 'terverifikasi':
      bgClass = 'bg-[#2ECC71]/15 border-[#2ECC71]/30';
      textClass = 'text-emerald-800 dark:text-emerald-300';
      label = 'Terverifikasi';
      break;
    case 'aktif':
      bgClass = 'bg-emerald-600/15 border-emerald-600/30';
      textClass = 'text-emerald-900 font-semibold';
      label = 'Aktif';
      break;
    case 'ditolak':
      bgClass = 'bg-[#E74C3C]/15 border-[#E74C3C]/30';
      textClass = 'text-rose-800 dark:text-rose-300';
      label = 'Ditolak';
      break;
    default:
      bgClass = 'bg-gray-100 border-gray-200';
      textClass = 'text-gray-800';
      label = String(status);
  }

  return (
    <span
      id={`badge-${status}`}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${bgClass} ${textClass}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current"></span>
      {label}
    </span>
  );
}
