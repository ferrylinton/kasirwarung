import React from 'react';
import { VerifyEmailView } from '../components/Auth/VerifyEmailView.tsx';

export interface VerifyEmailPageProps {
  initialToken?: string;
  initialEmail?: string;
  onVerifiedSuccess: () => void;
  onBackToLogin: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = (props) => {
  return <VerifyEmailView {...props} />;
};

export default VerifyEmailPage;
