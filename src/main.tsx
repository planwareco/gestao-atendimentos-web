import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { isAxiosError } from 'axios';
import '@fontsource-variable/plus-jakarta-sans';
import 'boxicons/css/boxicons.min.css';
import 'aos/dist/aos.css';
import './styles/main.scss';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Não insiste em erros de regra (4xx); tenta de novo só falhas de rede/servidor
      retry: (falhas, err) => falhas < 2 && !(isAxiosError(err) && (err.response?.status ?? 500) < 500),
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
