import { useState } from 'react';
import { Card, StatusBadge } from '../common';
import { useServerStatus } from '../../hooks/useServerStatus';
import axios from 'axios';

/**
 * DeviceConnection component displays device setup instructions
 * and server status information for connecting e-ink devices
 */
export function DeviceConnection() {
  const { status, isChecking, checkStatus } = useServerStatus();

  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const [deviceAuthTestResult, setDeviceAuthTestResult] = useState<{
    status: 'success' | 'error';
    httpStatus: number;
    message: string;
    details?: string;
  } | null>(null);
  const [isTestingDeviceAuth, setIsTestingDeviceAuth] = useState(false);

  // Build the full API URL that devices should use
  const deviceApiUrl = `http://${status.localIp}:${status.port}`;

  /**
   * Copy text to clipboard with fallback for non-HTTPS contexts
   */
  const handleCopyUrl = async () => {
    try {
      // Try modern clipboard API first (requires secure context)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(deviceApiUrl);
      } else {
        // Fallback for non-HTTPS contexts (e.g., accessing via LAN IP)
        const textArea = document.createElement('textarea');
        textArea.value = deviceApiUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  /**
   * Test Device API Authentication
   * Tests if device endpoints accept HTTP_ID header WITHOUT JWT authentication
   */
  const testDeviceAPIAuth = async () => {
    setIsTestingDeviceAuth(true);
    setDeviceAuthTestResult(null);

    try {
      // Test the /api/setup endpoint WITHOUT Authorization header
      // Devices send only HTTP_ID header, not JWT tokens
      const response = await axios.get(
        `http://${status.localIp}:${status.port}/api/setup`,
        {
          headers: {
            'HTTP_ID': 'AA:BB:CC:DD:EE:FF', // Test MAC address
            // NO Authorization header - devices don't use JWT!
          },
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        setDeviceAuthTestResult({
          status: 'success',
          httpStatus: 200,
          message: 'Device endpoint is working correctly!',
          details: 'Endpoint accepts HTTP_ID header without requiring JWT authentication. Devices should be able to connect.',
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          // 401 Unauthorized means the endpoint is incorrectly requiring JWT auth
          setDeviceAuthTestResult({
            status: 'error',
            httpStatus: 401,
            message: 'Authentication Error Detected!',
            details: 'The /api/setup endpoint is returning 401 Unauthorized. This means it\'s incorrectly requiring JWT authentication. Device endpoints should NOT require JWT - they use HTTP_ID header instead.',
          });
        } else if (error.response) {
          setDeviceAuthTestResult({
            status: 'error',
            httpStatus: error.response.status,
            message: `HTTP Error ${error.response.status}`,
            details: error.response.data?.message || error.response.statusText,
          });
        } else if (error.code === 'ECONNABORTED') {
          setDeviceAuthTestResult({
            status: 'error',
            httpStatus: 0,
            message: 'Connection Timeout',
            details: 'Request timed out. Backend may be slow or unresponsive.',
          });
        } else if (error.code === 'ERR_NETWORK') {
          setDeviceAuthTestResult({
            status: 'error',
            httpStatus: 0,
            message: 'Network Error',
            details: 'Cannot reach backend server. Check if Docker containers are running.',
          });
        } else {
          setDeviceAuthTestResult({
            status: 'error',
            httpStatus: 0,
            message: 'Unknown Error',
            details: error.message,
          });
        }
      }
    } finally {
      setIsTestingDeviceAuth(false);
    }
  };

  /**
   * Test API connection from browser's perspective
   */
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test 1: Check if we can reach the backend at all
      const backendUrl = '/api/dashboard/stats';
      const token = localStorage.getItem('inker_session');

      const response = await axios.get(backendUrl, {
        timeout: 5000,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.status === 200) {
        setTestResult({
          success: true,
          message: 'Connection successful! API is reachable from browser.',
          details: `Backend responded with status 200. Device API URL: ${deviceApiUrl}`,
        });
      }
    } catch (error) {
      let message = 'Connection failed';
      let details = '';

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          message = 'Connection timeout';
          details = 'The request took too long to complete. Backend may be slow or unresponsive.';
        } else if (error.code === 'ERR_NETWORK') {
          message = 'Network error';
          details = 'Cannot reach backend server. Check if Docker containers are running.';
        } else if (error.response) {
          message = `HTTP Error ${error.response.status}`;
          details = error.response.data?.message || error.response.statusText;

          // 401 means server is online but endpoint requires auth
          if (error.response.status === 401) {
            setTestResult({
              success: true,
              message: 'API is online (requires authentication for this endpoint)',
              details: `Backend is responding. Device API URL: ${deviceApiUrl}`,
            });
            setIsTesting(false);
            return;
          }
        } else {
          details = error.message;
        }
      }

      setTestResult({
        success: false,
        message,
        details,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Test Tool */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Connection Test Tool</h2>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3b82f6' }}
            onMouseEnter={(e) => { if (!isTesting) e.currentTarget.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { if (!isTesting) e.currentTarget.style.backgroundColor = '#3b82f6'; }}
          >
            {isTesting ? (
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            Test API Connection
          </button>
        </div>

        {testResult && (
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
              borderColor: testResult.success ? '#86efac' : '#fca5a5'
            }}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {testResult.success ? (
                  <svg
                    className="h-5 w-5"
                    style={{ color: '#16a34a' }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    style={{ color: '#dc2626' }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3
                  className="text-sm font-medium"
                  style={{ color: testResult.success ? '#16a34a' : '#dc2626' }}
                >
                  {testResult.message}
                </h3>
                {testResult.details && (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: testResult.success ? '#16a34a' : '#dc2626' }}
                  >
                    {testResult.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-text-secondary">
          This test checks if your browser can reach the backend API. If the test passes but
          your device still cannot connect, see the troubleshooting section below.
        </p>
      </Card>

      {/* Device API Authentication Test Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Device API Authentication Test</h2>
          <button
            type="button"
            onClick={testDeviceAPIAuth}
            disabled={isTestingDeviceAuth}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3b82f6' }}
            onMouseEnter={(e) => { if (!isTestingDeviceAuth) e.currentTarget.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { if (!isTestingDeviceAuth) e.currentTarget.style.backgroundColor = '#3b82f6'; }}
          >
            {isTestingDeviceAuth ? (
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            Test Device API (No Auth)
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-4">
          This test checks if device endpoints (like /api/setup) work WITHOUT JWT authentication.
          Devices use the HTTP_ID header (MAC address) for identification, not JWT tokens.
        </p>

        {deviceAuthTestResult && (
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: deviceAuthTestResult.status === 'success' ? '#dcfce7' : '#fee2e2',
              borderColor: deviceAuthTestResult.status === 'success' ? '#86efac' : '#fca5a5'
            }}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {deviceAuthTestResult.status === 'success' ? (
                  <svg
                    className="h-6 w-6"
                    style={{ color: '#16a34a' }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    style={{ color: '#dc2626' }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-sm font-medium"
                    style={{ color: deviceAuthTestResult.status === 'success' ? '#16a34a' : '#dc2626' }}
                  >
                    {deviceAuthTestResult.message}
                  </h3>
                  <span
                    className="px-2 py-1 text-xs font-semibold rounded"
                    style={{
                      backgroundColor: deviceAuthTestResult.httpStatus === 200 ? '#dcfce7' : '#fee2e2',
                      color: deviceAuthTestResult.httpStatus === 200 ? '#16a34a' : '#dc2626'
                    }}
                  >
                    HTTP {deviceAuthTestResult.httpStatus}
                  </span>
                </div>
                {deviceAuthTestResult.details && (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: deviceAuthTestResult.status === 'success' ? '#16a34a' : '#dc2626' }}
                  >
                    {deviceAuthTestResult.details}
                  </p>
                )}

                {/* Expected vs Actual Behavior */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-start">
                    <span className="text-xs font-semibold text-text-secondary w-24">Expected:</span>
                    <span className="text-xs text-text-secondary flex-1">
                      Device endpoints should return 200 OK without JWT authentication
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-xs font-semibold text-text-secondary w-24">Actual:</span>
                    <span className="text-xs text-text-secondary flex-1">
                      HTTP {deviceAuthTestResult.httpStatus} - {deviceAuthTestResult.status === 'success' ? 'Working correctly' : 'Authentication required (BROKEN)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Troubleshooting for 401 Errors */}
        {deviceAuthTestResult?.httpStatus === 401 && (
          <div className="mt-4 p-4 bg-status-warning-bg border border-status-warning-border rounded-lg">
            <h3 className="text-md font-semibold text-status-warning-text mb-2">
              How to Fix 401 Authentication Errors
            </h3>
            <div className="space-y-3 text-sm text-status-warning-text">
              <div>
                <h4 className="font-semibold">Problem:</h4>
                <p className="mt-1">
                  The device endpoint is requiring JWT authentication, but devices only send the
                  HTTP_ID header (MAC address), not JWT tokens.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Solution:</h4>
                <p className="mt-1">
                  The backend controller for device endpoints must use the <code className="bg-status-warning-bg border border-status-warning-border px-1 rounded">@Public()</code> decorator
                  to bypass JWT authentication guards.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Backend Code to Check:</h4>
                <div className="mt-2 bg-border-dark text-text-inverse p-3 rounded font-mono text-xs overflow-x-auto">
                  <pre>{`// backend/src/setup/setup.controller.ts
import { Public } from '../auth/decorators/public.decorator';

@Controller('setup')
export class SetupController {

  @Public()  // <-- This decorator is REQUIRED
  @Get()
  async getSetup(@Headers('http_id') httpId: string) {
    // Device identification via HTTP_ID header
    // No JWT authentication needed
    return { ... };
  }
}`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Files to Verify:</h4>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li><code className="bg-bg-muted px-1 rounded">backend/src/setup/setup.controller.ts</code> - Check @Public() decorator</li>
                  <li><code className="bg-bg-muted px-1 rounded">backend/src/devices/devices.controller.ts</code> - Device endpoints</li>
                  <li><code className="bg-bg-muted px-1 rounded">backend/src/auth/decorators/public.decorator.ts</code> - Decorator exists</li>
                  <li><code className="bg-bg-muted px-1 rounded">backend/src/auth/guards/jwt-auth.guard.ts</code> - Respects @Public()</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">How Devices Authenticate:</h4>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>Devices send <code className="bg-bg-muted px-1 rounded">HTTP_ID</code> header with their MAC address</li>
                  <li>Backend identifies device using MAC address, NOT JWT token</li>
                  <li>Device endpoints must be marked with <code className="bg-bg-muted px-1 rounded">@Public()</code></li>
                  <li>Browser endpoints (dashboard) use JWT for user authentication</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Server Status Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Server Status</h2>
          <button
            type="button"
            onClick={checkStatus}
            disabled={isChecking}
            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
          >
            {isChecking ? (
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">Backend API</span>
            <StatusBadge status={status.isOnline ? 'online' : 'offline'} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">Browser Access</span>
            <StatusBadge status={status.isOnline ? 'online' : 'offline'} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">API Base URL</span>
            <code className="text-sm bg-bg-muted px-2 py-1 rounded">
              {status.apiUrl}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">Server IP</span>
            <code className="text-sm bg-bg-muted px-2 py-1 rounded">
              {status.localIp}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">Server Port</span>
            <code className="text-sm bg-bg-muted px-2 py-1 rounded">
              {status.port}
            </code>
          </div>

          {status.lastChecked && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-muted">Last Checked</span>
              <span className="text-sm text-text-secondary">
                {status.lastChecked.toLocaleTimeString()}
              </span>
            </div>
          )}

          {status.error && !status.isOnline && (
            <div className="mt-4 p-3 bg-status-error-bg border border-status-error-border rounded-lg">
              <p className="text-sm text-status-error-text">
                <strong>Error:</strong> {status.error}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Device Connection Instructions */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Connect Your E-Ink Device
        </h2>

        <div className="space-y-4">
          {/* API URL Display */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Device API URL
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-sm bg-bg-muted px-4 py-3 rounded-lg border border-border-default font-mono">
                {deviceApiUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold text-white rounded-xl transition-all duration-200"
                style={{ backgroundColor: copied ? '#22c55e' : '#3b82f6' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = copied ? '#16a34a' : '#2563eb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = copied ? '#22c55e' : '#3b82f6'; }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Enter this URL in your device's WiFi captive portal setup
            </p>
          </div>

          {/* Status Warning */}
          {!status.isOnline && (
            <div className="p-4 bg-status-warning-bg border border-status-warning-border rounded-lg">
              <p className="text-sm text-status-warning-text">
                <strong>Warning:</strong> The backend server appears to be offline.
                Devices will not be able to connect until the server is running.
              </p>
            </div>
          )}

          {/* Step-by-step Instructions */}
          <div className="mt-6">
            <h3 className="text-md font-semibold text-text-primary mb-3">
              Setup Instructions
            </h3>
            <ol className="space-y-3 list-decimal list-inside text-sm text-text-secondary">
              <li>
                <strong>Power on your e-ink device</strong>
                <p className="ml-6 mt-1 text-text-secondary">
                  The device will boot and enter WiFi setup mode
                </p>
              </li>
              <li>
                <strong>Connect to the device's WiFi network</strong>
                <p className="ml-6 mt-1 text-text-secondary">
                  Look for a WiFi network named "TRMNL-XXXX" or similar
                </p>
              </li>
              <li>
                <strong>Open the captive portal</strong>
                <p className="ml-6 mt-1 text-text-secondary">
                  Your browser should automatically open the setup page. If not, navigate to
                  <code className="bg-bg-muted px-1 rounded ml-1">192.168.4.1</code>
                </p>
              </li>
              <li>
                <strong>Enter the API URL</strong>
                <p className="ml-6 mt-1 text-text-secondary">
                  Paste the API URL shown above: <code className="bg-bg-muted px-1 rounded">{deviceApiUrl}</code>
                </p>
              </li>
              <li>
                <strong>Configure WiFi credentials</strong>
                <p className="ml-6 mt-1 text-text-secondary">
                  Enter your WiFi network name (SSID) and password
                </p>
              </li>
              <li>
                <strong>Complete setup</strong>
                <p className="ml-6 mt-1 text-text-secondary">
                  The device will connect to your WiFi and register with this server
                </p>
              </li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Device Provisioning Info */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Device Auto-Provisioning
        </h2>

        <div className="space-y-3 text-sm text-text-secondary">
          <div>
            <h4 className="font-semibold text-text-primary">What happens when a device connects?</h4>
            <p className="mt-1">
              When a new device connects for the first time, it automatically registers itself
              with the server using its MAC address as a unique identifier.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary">Device Registration</h4>
            <ul className="mt-1 ml-6 list-disc space-y-1">
              <li>Device sends MAC address and model information</li>
              <li>Server creates a new device record in the database</li>
              <li>Device is assigned to your user account</li>
              <li>Device appears in the Devices list with "OFFLINE" status initially</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary">After Registration</h4>
            <ul className="mt-1 ml-6 list-disc space-y-1">
              <li>Device will show as "ONLINE" once it connects</li>
              <li>You can assign the device to a playlist</li>
              <li>Device will poll the server for screen updates</li>
              <li>Battery level and firmware version will be reported</li>
            </ul>
          </div>

          <div className="mt-4 p-3 bg-status-info-bg border border-status-info-border rounded-lg">
            <p className="text-sm text-status-info-text">
              <strong>Tip:</strong> After setup, check the "Devices" page to see your newly
              connected device and assign it to a playlist.
            </p>
          </div>
        </div>
      </Card>

      {/* Troubleshooting Guide - Expandable Accordion */}
      <Card>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#1f2937' }}>
          Troubleshooting Guide
        </h2>
        <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
          Click on any section below to expand and see detailed troubleshooting steps.
        </p>

        <div className="space-y-2">
          {/* Device Can't Connect */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => toggleSection('cant-connect')}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              style={{ backgroundColor: expandedSections.has('cant-connect') ? '#f9fafb' : '#ffffff' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔌</span>
                <span className="font-medium" style={{ color: '#1f2937' }}>Device can't connect to server</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections.has('cant-connect') ? 'rotate-180' : ''}`}
                style={{ color: '#6b7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has('cant-connect') && (
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
                  <p><strong>Common causes:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Device and server are on different networks</li>
                    <li>Firewall blocking port {status.port}</li>
                    <li>Incorrect API URL entered during device setup</li>
                    <li>Backend server not running</li>
                  </ul>
                  <p className="mt-3"><strong>Solutions:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Verify both device and server are on the same WiFi/LAN</li>
                    <li>Check that server is accessible at <code className="px-1 rounded" style={{ backgroundColor: '#e5e7eb' }}>{status.localIp}:{status.port}</code></li>
                    <li>Temporarily disable firewall to test connectivity</li>
                    <li>Re-enter the API URL on the device if incorrect</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Device Shows Offline */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => toggleSection('shows-offline')}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              style={{ backgroundColor: expandedSections.has('shows-offline') ? '#f9fafb' : '#ffffff' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📴</span>
                <span className="font-medium" style={{ color: '#1f2937' }}>Device shows offline in dashboard</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections.has('shows-offline') ? 'rotate-180' : ''}`}
                style={{ color: '#6b7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has('shows-offline') && (
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
                  <p><strong>Common causes:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Device hasn't polled the server recently</li>
                    <li>Device lost WiFi connection</li>
                    <li>Device is in sleep mode with long refresh interval</li>
                  </ul>
                  <p className="mt-3"><strong>Solutions:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Wait for the device's next refresh cycle (check refresh rate setting)</li>
                    <li>Power cycle the device to force reconnection</li>
                    <li>Check device's WiFi signal strength</li>
                    <li>Reduce the refresh interval for more frequent updates</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Screen Not Updating */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => toggleSection('not-updating')}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              style={{ backgroundColor: expandedSections.has('not-updating') ? '#f9fafb' : '#ffffff' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🖼️</span>
                <span className="font-medium" style={{ color: '#1f2937' }}>Screen not updating on device</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections.has('not-updating') ? 'rotate-180' : ''}`}
                style={{ color: '#6b7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has('not-updating') && (
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
                  <p><strong>Common causes:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>No playlist assigned to the device</li>
                    <li>Playlist has no screens</li>
                    <li>Device caching old image (same filename)</li>
                    <li>Screen render error on backend</li>
                  </ul>
                  <p className="mt-3"><strong>Solutions:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Assign a playlist to the device in Device settings</li>
                    <li>Add screens to the assigned playlist</li>
                    <li>Click "Refresh Devices" to force update</li>
                    <li>Check backend logs for rendering errors</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Connection Timeout */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => toggleSection('timeout')}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              style={{ backgroundColor: expandedSections.has('timeout') ? '#f9fafb' : '#ffffff' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⏱️</span>
                <span className="font-medium" style={{ color: '#1f2937' }}>Connection timeout errors</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections.has('timeout') ? 'rotate-180' : ''}`}
                style={{ color: '#6b7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has('timeout') && (
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
                  <p><strong>Common causes:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Firewall blocking incoming connections</li>
                    <li>Server overloaded or slow response</li>
                    <li>Network congestion or poor WiFi signal</li>
                  </ul>
                  <p className="mt-3"><strong>Solutions:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Allow port {status.port} in your firewall settings</li>
                    <li>Restart the backend service</li>
                    <li>Move device closer to WiFi router</li>
                    <li>Check server resource usage (CPU, memory)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Backend Not Responding */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => toggleSection('backend-down')}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              style={{ backgroundColor: expandedSections.has('backend-down') ? '#f9fafb' : '#ffffff' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🔧</span>
                <span className="font-medium" style={{ color: '#1f2937' }}>Backend server not responding</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections.has('backend-down') ? 'rotate-180' : ''}`}
                style={{ color: '#6b7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has('backend-down') && (
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
                  <p><strong>Common causes:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Backend service crashed or stopped</li>
                    <li>Database connection issue</li>
                    <li>Port conflict with another application</li>
                  </ul>
                  <p className="mt-3"><strong>Solutions:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Restart the backend service</li>
                    <li>Check application logs for errors</li>
                    <li>Verify database is running and accessible</li>
                    <li>Ensure port {status.port} is not used by another app</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Network Requirements */}
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
            <button
              type="button"
              onClick={() => toggleSection('requirements')}
              className="w-full flex items-center justify-between p-4 text-left transition-colors"
              style={{ backgroundColor: expandedSections.has('requirements') ? '#f9fafb' : '#ffffff' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <span className="font-medium" style={{ color: '#1f2937' }}>Network requirements checklist</span>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${expandedSections.has('requirements') ? 'rotate-180' : ''}`}
                style={{ color: '#6b7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.has('requirements') && (
              <div className="p-4 border-t" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                  <li className="flex items-center gap-2">
                    <svg className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Device and server on the same local network
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Firewall allows connections on port {status.port}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Server IP ({status.localIp}) is static or reserved
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Backend service is running and healthy
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-5 w-5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Device has stable WiFi connection
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
