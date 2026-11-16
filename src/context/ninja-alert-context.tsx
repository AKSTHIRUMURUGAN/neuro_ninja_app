import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NinjaAlertModal, NinjaAlertOptions } from '../components/ui/ninja-alert-modal';
import { NinjaToast, NinjaToastOptions } from '../components/ui/ninja-toast';

interface NinjaAlertContextValue {
  showAlert: (options: NinjaAlertOptions) => void;
  showToast: (options: NinjaToastOptions) => void;
  hideAlert: () => void;
  hideToast: () => void;
}

const NinjaAlertContext = createContext<NinjaAlertContextValue | null>(null);

export function NinjaAlertProvider({ children }: { children: ReactNode }) {
  const [alertOptions, setAlertOptions] = useState<NinjaAlertOptions | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [toastOptions, setToastOptions] = useState<NinjaToastOptions | null>(null);

  const showAlert = useCallback((options: NinjaAlertOptions) => {
    setAlertOptions(options);
    setAlertVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertVisible(false);
    setTimeout(() => {
      setAlertOptions(null);
    }, 200);
  }, []);

  const showToast = useCallback((options: NinjaToastOptions) => {
    setToastOptions(options);
  }, []);

  const hideToast = useCallback(() => {
    setToastOptions(null);
  }, []);

  return (
    <NinjaAlertContext.Provider
      value={{
        showAlert,
        showToast,
        hideAlert,
        hideToast,
      }}
    >
      {children}
      <NinjaAlertModal
        visible={alertVisible}
        options={alertOptions}
        onDismiss={hideAlert}
      />
      <NinjaToast toast={toastOptions} onDismiss={hideToast} />
    </NinjaAlertContext.Provider>
  );
}

export function useNinjaAlert(): NinjaAlertContextValue {
  const context = useContext(NinjaAlertContext);
  if (!context) {
    throw new Error('useNinjaAlert must be used within a NinjaAlertProvider');
  }
  return context;
}
