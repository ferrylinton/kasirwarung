import { useToastStore } from '../stores/toastStore';

export function useToast() {
  const { addToast, removeToast, toasts } = useToastStore();

  const success = (message: string, title?: string) => {
    addToast({ type: 'success', message, title });
  };

  const error = (message: string, title?: string) => {
    addToast({ type: 'error', message, title });
  };

  const warning = (message: string, title?: string) => {
    addToast({ type: 'warning', message, title });
  };

  const info = (message: string, title?: string) => {
    addToast({ type: 'info', message, title });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

export default useToast;
