import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './core/router';
import { useAuthStore } from './modules/auth/store';

function App() {
  const initializeAuthListener = useAuthStore((state) => state.initializeAuthListener);

  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => {
      unsubscribe();
    };
  }, [initializeAuthListener]);

  return <RouterProvider router={router} />;
}

export default App;