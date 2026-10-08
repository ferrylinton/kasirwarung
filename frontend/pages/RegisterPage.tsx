import React from 'react';
import { RegisterView } from '../components/Auth/RegisterView.tsx';

export interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onRegisteredSuccess: (email: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin, onRegisteredSuccess }) => {
  return (
    <RegisterView
      onSwitchToLogin={onSwitchToLogin}
      onRegisteredSuccess={onRegisteredSuccess}
    />
  );
};

export default RegisterPage;
