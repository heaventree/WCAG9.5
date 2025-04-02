import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Activity, Key, Info, Book, ArrowRight, CheckCircle, Globe, FileText, ShoppingBag, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { shopifyAPI } from '../../lib/integrations/shopify';
import type { ShopifySettings } from '../../types/integrations';
import { CopyToClipboard } from 'react-copy-to-clipboard';

export function ShopifySetup() {
  const [settings, setSettings] = useState<ShopifySettings>({
    apiKey: '',
    shop: '',
    accessToken: '',
    scanFrequency: 'weekly',
    autoFix: true,
    notifyAdmin: true,
    excludedPaths: [],
    theme: {
      id: '',
      name: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // Load existing settings
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const savedSettings = await shopifyAPI.getSettings();
        if (savedSettings) {
          setSettings(savedSettings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleValidateCredentials = async () => {
    try {
      setValidating(true);
      const isValid = await shopifyAPI.validateCredentials(settings.shop, settings.accessToken);
      
      if (isValid) {
        toast.success('Credentials validated successfully');
        
        // Get current theme
        const theme = await shopifyAPI.getCurrentTheme(settings.shop, settings.accessToken);
        setSettings({...settings, theme});
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to validate credentials');
    } finally {
      setValidating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      // Validate credentials first
      const isValid = await shopifyAPI.validateCredentials(settings.shop, settings.accessToken);
      if (!isValid) {
        throw new Error('Invalid Shopify credentials');
      }
      
      // Get current theme
      const theme = await shopifyAPI.getCurrentTheme(settings.shop, settings.accessToken);
      
      // Save settings
      const result = await shopifyAPI.saveSettings({...settings, theme});
      
      if (result.success) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shopify App Documentation Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start">
          <Book className="w-6 h-6 text-blue-600 mt-1" />
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-blue-900">Shopify App Setup</h2>
            <p className="mt-1 text-blue-700">
              Before connecting your Shopify store, you'll need to create a custom app in your Shopify admin. Follow our comprehensive documentation to get started.
            </p>
            <Link
              to="/docs/shopify"
              className="inline-flex items-center mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Book className="w-5 h-5 mr-2" />
              View Shopify Documentation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>

      {/* Credentials Management */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        {/* Shopify Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="border-b border-gray-200 pb-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
                <h2 className="ml-3 text-lg font-medium text-gray-900">
                  Shopify Credentials
                </h2>
              </div>
              <span className="text-sm font-medium text-gray-500">
                Connect your Shopify store
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Why do we need these credentials?</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    To integrate with your Shopify store, we need access to your store through the Shopify API. 
                    This allows us to scan your theme for accessibility issues and provide fixes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="shop" className="block text-sm font-medium text-gray-700">
                Shopify Store URL
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="shop"
                  value={settings.shop}
                  onChange={(e) => setSettings({...settings, shop: e.target.value})}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="your-store.myshopify.com"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Your Shopify store URL (must end with .myshopify.com)
              </p>
            </div>

            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700">
                Access Token
              </label>
              <div className="mt-1 relative">
                <input
                  type={showCredentials ? "text" : "password"}
                  id="accessToken"
                  value={settings.accessToken}
                  onChange={(e) => setSettings({...settings, accessToken: e.target.value})}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pr-12"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-blue-600 hover:text-blue-700"
                >
                  {showCredentials ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Access token from your custom Shopify app (starts with shpat_)
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleValidateCredentials}
                disabled={validating || !settings.shop || !settings.accessToken}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {validating ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Validating...
                  </>
                ) : (
                  'Validate Credentials'
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Shopify Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl"
        >
          <div className="border-b border-gray-200 pb-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Store className="w-6 h-6 text-blue-600" />
                <h2 className="ml-3 text-lg font-medium text-gray-900">
                  Shopify Configuration
                </h2>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="scanFrequency" className="block text-sm font-medium text-gray-700">
                  Scan Frequency
                </label>
                <select
                  id="scanFrequency"
                  value={settings.scanFrequency}
                  onChange={(e) => setSettings({ ...settings, scanFrequency: e.target.value })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="autoFix"
                      name="autoFix"
                      type="checkbox"
                      checked={settings.autoFix}
                      onChange={(e) => setSettings({ ...settings, autoFix: e.target.checked })}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="autoFix" className="font-medium text-gray-700">Auto-fix Issues</label>
                    <p className="text-gray-500">Automatically apply fixes to your Shopify theme when possible</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="notifyAdmin"
                      name="notifyAdmin"
                      type="checkbox"
                      checked={settings.notifyAdmin}
                      onChange={(e) => setSettings({ ...settings, notifyAdmin: e.target.checked })}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="notifyAdmin" className="font-medium text-gray-700">Notify Admin</label>
                    <p className="text-gray-500">Send notifications to Shopify store owner</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="excludedPaths" className="block text-sm font-medium text-gray-700">
                Excluded Paths (one per line)
              </label>
              <div className="mt-1">
                <textarea
                  id="excludedPaths"
                  rows={3}
                  value={settings.excludedPaths.join('\n')}
                  onChange={(e) => setSettings({ ...settings, excludedPaths: e.target.value.split('\n').filter(p => p.trim()) })}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="/cart&#10;/products/sample-product&#10;/collections/all"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Enter paths that should be excluded from accessibility scanning
              </p>
            </div>

            {/* Theme information display */}
            {settings.theme && settings.theme.id && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">Current Theme</h3>
                <div className="mt-2 flex items-center">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{settings.theme.name}</p>
                    <p className="text-xs text-gray-500">ID: {settings.theme.id}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={loading || !settings.shop || !settings.accessToken}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="-ml-1 mr-2 h-5 w-5" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Shopify Integration Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200"
        >
          <div className="flex items-start">
            <FileText className="w-6 h-6 text-blue-600 mt-1" />
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-blue-900">Shopify Integration Steps</h3>
              <ol className="mt-2 text-blue-700 space-y-3 list-decimal list-inside">
                <li>Create a custom app in your Shopify admin panel</li>
                <li>Set up the appropriate API permissions (read/write access to themes)</li>
                <li>Generate an access token in your Shopify admin</li>
                <li>Enter your store URL and access token above</li>
                <li>Configure scanning options</li>
                <li>Save settings and start your first scan</li>
              </ol>
              <div className="mt-4">
                <Link
                  to="/help/shopify-integration-guide"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700"
                >
                  Read the full integration guide
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}