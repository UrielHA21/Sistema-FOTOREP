import { AppShell, Burger, Group, Title, ActionIcon, Avatar, Menu, Box, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../modules/auth/store';
import { IconLogout, IconReportAnalytics, IconDatabase, IconShield } from '@tabler/icons-react';

export default function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const logout      = useAuthStore((state) => state.logout);
  const user        = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.userProfile);
  const navigate    = useNavigate();

  const isAdmin = userProfile?.rol === 'admin';

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={8}>
              <Title order={3} c="blue.7">FOTOREP</Title>
              {/* Indicador visual del rol (solo en desarrollo / para contexto) */}
              {isAdmin && (
                <Badge
                  size="xs"
                  variant="light"
                  color="orange"
                  leftSection={<IconShield size={10} />}
                >
                  Admin
                </Badge>
              )}
            </Group>
          </Group>
          <Menu shadow="md" width={220} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="transparent" size="lg">
                <Avatar color={isAdmin ? 'orange' : 'blue'} radius="xl" name={user?.email || 'User'} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Cuenta</Menu.Label>
              <Menu.Item c="dimmed" style={{ cursor: 'default' }}>{user?.email}</Menu.Item>
              <Menu.Label>Navegación</Menu.Label>
              <Menu.Item
                leftSection={<IconReportAnalytics size={14}/>}
                onClick={() => navigate('/')}
              >
                Reportes Fotográficos
              </Menu.Item>

              {/* SECCIÓN DE ADMIN: Solo visible para usuarios con rol 'admin' */}
              {isAdmin && (
                <Menu.Item
                  leftSection={<IconDatabase size={14}/>}
                  onClick={() => navigate('/admin/catalogos')}
                >
                  Administración de Datos
                </Menu.Item>
              )}

              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
              >
                Cerrar sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Main bg="gray.0">
        <Box maw={1200} mx="auto">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

