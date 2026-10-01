import React from 'react';
import { LoginView } from '../components/Auth/LoginView.tsx';

export interface LoginPageProps {
  onSwitchToRegister: () => void;
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister, onLoginSuccess }) => {
  return (
    <LoginView
      onSwitchToRegister={onSwitchToRegister}
      onLoginSuccess={onLoginSuccess}
    />
  );
};

export default LoginPage;
