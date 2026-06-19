import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './core/router';
import { useAuthStore } from './modules/auth/store';
import AccessibilityWidget from './modules/accessibility/AccessibilityWidget';

function App() {
  const initializeAuthListener = useAuthStore((state) => state.initializeAuthListener);

  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => {
      unsubscribe();
    };
  }, [initializeAuthListener]);

  return (
    <>
      <RouterProvider router={router} />
      <AccessibilityWidget />
    </>
  );
}

export default App;