import React from 'react';
import { DashboardProvider } from './dashboard/DashboardContext';
import { DashboardLayout } from './dashboard/DashboardLayout';

export const DashboardApp: React.FC = () => {
  console.log('RENDER DashboardApp!');
  return (
    <DashboardProvider>
      <DashboardLayout />
    </DashboardProvider>
  );
};

export default DashboardApp;
