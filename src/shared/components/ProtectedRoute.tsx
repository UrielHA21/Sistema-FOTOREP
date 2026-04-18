import { Navigate, Outlet } from 'react-router-dom';
import { Center, Loader, Title, Text, Button } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useAuthStore } from '../../modules/auth/store';

interface ProtectedRouteProps {
  /** Si es true, solo usuarios con rol 'admin' pueden acceder. */
  requireAdmin?: boolean;
}

/**
 * Guardián de Rutas (RBAC).
 *
 * - Sin sesión activa → redirige a /login.
 * - requireAdmin=true y rol !== 'admin' → muestra página 403 (Acceso Denegado).
 * - Todo OK → renderiza <Outlet />.
 */
export default function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const userProfile = useAuthStore((state) => state.userProfile);

  // 1. Esperar a que Firebase resuelva la sesión y el perfil de Firestore
  if (!isInitialized) {
    return (
      <Center h="100vh">
        <Loader type="dots" size="xl" />
      </Center>
    );
  }

  // 2. Sin sesión → Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Ruta restringida a administradores
  if (requireAdmin && userProfile?.rol !== 'admin') {
    return (
      <Center h="100vh" style={{ flexDirection: 'column', gap: 16 }}>
        <IconLock size={64} stroke={1.2} color="var(--mantine-color-red-5)" />
        <Title order={2} c="dark.5">Acceso Denegado</Title>
        <Text c="dimmed" ta="center" maw={400}>
          No tienes permisos para acceder a esta sección.
          Contacta al administrador si crees que esto es un error.
        </Text>
        <Button variant="light" component="a" href="/">
          Volver al Dashboard
        </Button>
      </Center>
    );
  }

  // 4. Acceso permitido
  return <Outlet />;
}
