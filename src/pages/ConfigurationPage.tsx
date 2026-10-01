import React from 'react';
import { ConfigurationView } from '../components/Settings/ConfigurationView.tsx';

export interface ConfigurationPageProps {
  onRequestLogout?: () => void;
  onNavigateToPOS?: () => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = (props) => {
  return <ConfigurationView {...props} />;
};

export default ConfigurationPage;
