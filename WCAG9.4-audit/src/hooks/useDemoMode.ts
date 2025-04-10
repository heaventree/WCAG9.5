import { useState, useEffect, useCallback } from 'react';
import { Subscription } from './useSubscription';

// Local storage key for demo mode
const DEMO_MODE_KEY = 'wcag_demo_mode_enabled';

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    // Initialize from localStorage if available
    try {
      const storedValue = localStorage.getItem(DEMO_MODE_KEY);
      return storedValue === 'true';
    } catch (error) {
      return false;
    }
  });

  // Enable demo mode
  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    try {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
      window.dispatchEvent(new StorageEvent('storage', {
        key: DEMO_MODE_KEY,
        newValue: 'true'
      }));
    } catch (error) {
      console.error('Failed to store demo mode state:', error);
    }
  }, []);

  // Disable demo mode
  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
    try {
      localStorage.setItem(DEMO_MODE_KEY, 'false');
      window.dispatchEvent(new StorageEvent('storage', {
        key: DEMO_MODE_KEY,
        newValue: 'false'
      }));
    } catch (error) {
      console.error('Failed to store demo mode state:', error);
    }
  }, []);

  // Listen for storage changes to sync demo mode across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DEMO_MODE_KEY) {
        setIsDemoMode(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Get a demo subscription for testing payment interfaces
  const getDemoSubscription = useCallback((): Subscription => {
    return {
      id: 'demo-subscription-123',
      status: 'active',
      planId: 'professional',
      currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      isDemo: true,
      invoices: [
        {
          id: 'demo-invoice-1',
          amount: 99,
          currency: 'usd',
          status: 'paid',
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          pdfUrl: '#',
          description: 'Professional Plan (Monthly)'
        },
        {
          id: 'demo-invoice-2',
          amount: 99,
          currency: 'usd',
          status: 'paid',
          date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          pdfUrl: '#',
          description: 'Professional Plan (Monthly)'
        }
      ]
    };
  }, []);

  return {
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    getDemoSubscription
  };
}