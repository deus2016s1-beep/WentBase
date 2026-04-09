import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: 'admin' | 'viewer') => {
    login(role);
    navigate('/dashboard');
  };

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Login</h1>
      <p>Выберите роль для входа.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" onClick={() => handleLogin('admin')}>
          Войти как Камал (admin)
        </button>
        <button type="button" onClick={() => handleLogin('viewer')}>
          Войти как Руслан (viewer)
        </button>
      </div>
    </div>
  );
};
