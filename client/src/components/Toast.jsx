import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
