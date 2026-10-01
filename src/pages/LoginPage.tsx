import React from 'react';
import { LoginView } from '../components/Auth/LoginView.tsx';

export interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToVerify?: (token?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSwitchToRegister,
  onSwitchToVerify = () => {},
}) => {
  return (
    <LoginView
      onSwitchToRegister={onSwitchToRegister}
      onSwitchToVerify={onSwitchToVerify}
    />
  );
};

export default LoginPage;
