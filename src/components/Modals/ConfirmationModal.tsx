import React from 'react';
import { LogOut, Trash2, Edit3, AlertTriangle, X } from 'lucide-react';

export type ConfirmationType = 'LOGOUT' | 'DELETE' | 'UPDATE' | 'CUSTOM';

interface ConfirmationModalProps {
  isOpen: boolean;
  type?: ConfirmationType;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type = 'CUSTOM',
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'LOGOUT':
        return (
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
            <LogOut className="w-6 h-6" />
          </div>
        );
      case 'DELETE':
        return (
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'UPDATE':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
            <Edit3 className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
    }
  };

  const confirmBtnColor =
    type === 'LOGOUT' || type === 'DELETE' || isDestructive
      ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
      : type === 'UPDATE'
      ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
      : 'btn-theme-primary text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 p-6 transition-colors">
        <div className="flex justify-between items-start">
          {renderIcon()}
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{description}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer ${confirmBtnColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
