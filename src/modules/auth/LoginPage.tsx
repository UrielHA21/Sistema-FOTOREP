import { useState, type FormEvent } from 'react';
import { Container, Paper, Title, TextInput, PasswordInput, Button, Alert, Box } from '@mantine/core';
import { useAuthStore } from './store';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Tras un login exitoso, navegamos a la ruta protegida (Dashboard)
      navigate('/', { replace: true });
    } catch (err) {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
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
    </Box>
  );
}
