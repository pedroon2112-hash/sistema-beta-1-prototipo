import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from '@/components/ui/sonner'
import { OrderProvider } from '@/context/OrderContext'

// Normalize image paths supplied by the API for GitHub Pages subpath hosting.
if (import.meta.env.PROD) {
  const fixImages = () => {
    document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const raw = img.getAttribute("src");
      if (raw?.startsWith("/assets/")) {
        img.src = `${import.meta.env.BASE_URL.slice(0, -1)}${raw}`;
      } else if (raw?.startsWith("/uploads/")) {
        img.src = `https://sistema-beta-1-prototipo.onrender.com${raw}`;
      }
    });
  };
  new MutationObserver(fixImages).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["src"],
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <OrderProvider>
          <App />
          <Toaster mobileOffset={{ bottom: '92px' }} duration={2200} />
        </OrderProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
)
