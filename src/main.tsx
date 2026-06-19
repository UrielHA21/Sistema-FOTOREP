import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModalsProvider } from '@mantine/modals';
import RootThemeProvider from './core/RootThemeProvider';
import App from './App';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { Notifications } from '@mantine/notifications';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootThemeProvider>
      <Notifications />
      <ModalsProvider>
        <App />
      </ModalsProvider>
    </RootThemeProvider>
  </React.StrictMode>,
);