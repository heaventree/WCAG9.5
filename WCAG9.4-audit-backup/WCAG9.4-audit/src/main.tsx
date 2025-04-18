import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Import global styles for accessibility features
import './index.css';
// Import theme variables first for proper CSS cascade
import './styles/theme-variables.css';
import './styles/main.css';
import './styles/accessibility.css';
import './styles/blog.css';
import './styles/modules/animations.css';
import './styles/modules/banner.css';
import './styles/modules/cta.css';
import './styles/modules/features.css';
import './styles/modules/footer.css';
import './styles/modules/header.css';
import './styles/modules/pricing.css';
import './styles/modules/testimonials.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);