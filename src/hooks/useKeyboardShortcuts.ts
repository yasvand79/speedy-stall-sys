import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
  onNewOrder?: () => void;
  onPayment?: () => void;
  onPrint?: () => void;
}

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          handlers?.onNewOrder?.();
          break;
        case 'F2':
          e.preventDefault();
          handlers?.onPayment?.();
          break;
        case 'F3':
          e.preventDefault();
          handlers?.onPrint?.();
          break;
        case 'F4':
          e.preventDefault();
          navigate('/kitchen');
          break;
        case 'F5':
          // Let browser handle refresh
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, navigate]);
}
