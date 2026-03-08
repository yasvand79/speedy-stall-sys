import React, { createContext, useContext } from 'react';
import { useThermalPrinter as useThermalPrinterHook } from '@/hooks/useThermalPrinter';

type ThermalPrinterContextType = ReturnType<typeof useThermalPrinterHook>;

const ThermalPrinterContext = createContext<ThermalPrinterContextType | null>(null);

export function ThermalPrinterProvider({ children }: { children: React.ReactNode }) {
  const printer = useThermalPrinterHook();

  return (
    <ThermalPrinterContext.Provider value={printer}>
      {children}
    </ThermalPrinterContext.Provider>
  );
}

export function useThermalPrinter(): ThermalPrinterContextType {
  const context = useContext(ThermalPrinterContext);
  if (!context) {
    throw new Error('useThermalPrinter must be used within a ThermalPrinterProvider');
  }
  return context;
}
