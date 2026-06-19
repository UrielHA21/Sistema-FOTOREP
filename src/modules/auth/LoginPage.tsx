import { useState, useEffect, type FormEvent } from 'react';
import { Container, Paper, Title, TextInput, PasswordInput, Button, Alert, Box, Group, Anchor, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from './store';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../core/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [resetOpened, { open: openReset, close: closeReset }] = useDisclosure(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // La navegación ahora la maneja el useEffect que escucha el estado isAuthenticated
    } catch (err) {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage({ type: 'success', text: 'Se ha enviado un enlace para restablecer la contraseña a tu correo.' });
    } catch (err: any) {
      setResetMessage({ type: 'error', text: 'Error al enviar el correo. Verifica que la dirección sea correcta.' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'var(--mantine-color-gray-0)' 
    }}>
      <Container size={420} w="100%">
        <Paper withBorder shadow="sm" p={30} radius="md">
          <Title ta="center" order={2} mb="xl">
            FOTOREP
          </Title>
          
          {error && (
            <Alert color="red" variant="light" mb="md">
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <TextInput
              label="Correo electrónico"
              placeholder="tu@correo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              mt="md"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            
            <Group justify="flex-end" mt="md">
              <Anchor component="button" type="button" size="sm" onClick={openReset}>
                ¿Olvidaste tu contraseña?
              </Anchor>
            </Group>

            <Button 
              fullWidth 
              mt="xl" 
              variant="filled" 
              type="submit" 
              loading={loading}
            >
              Iniciar sesión
            </Button>
          </form>
        </Paper>
      </Container>

      <Modal opened={resetOpened} onClose={closeReset} title="Restablecer contraseña" centered>
        <form onSubmit={handleResetPassword}>
          <Text size="sm" mb="md" c="dimmed">
            Ingresa tu correo electrónico para recibir un enlace y restablecer tu contraseña.
          </Text>
          
          {resetMessage && (
            <Alert color={resetMessage.type === 'success' ? 'green' : 'red'} variant="light" mb="md">
              {resetMessage.text}
            </Alert>
          )}

          <TextInput
            label="Correo electrónico"
            placeholder="tu@correo.com"
            required
            value={resetEmail}
            onChange={(e) => setResetEmail(e.currentTarget.value)}
            data-autofocus
          />
          <Button fullWidth mt="md" type="submit" loading={resetLoading}>
            Enviar enlace
          </Button>
        </form>
      </Modal>
    </Box>
  );
}
