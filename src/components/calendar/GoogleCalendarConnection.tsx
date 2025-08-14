// src/components/calendar/GoogleCalendarConnection.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, CheckCircle, XCircle, ExternalLink, Unlink, RefreshCw } from 'lucide-react';

interface ConnectionStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export default function GoogleCalendarConnection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  // Check for connection success/error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('calendar_connected');
    const error = urlParams.get('calendar_error');

    if (connected === 'true') {
      toast({
        title: "Google Calendar Connected!",
        description: "Your appointments will now sync to your personal Google Calendar.",
      });
      checkConnectionStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      const errorMessages: { [key: string]: string } = {
        'missing_parameters': 'Missing authorization parameters',
        'invalid_user': 'Invalid user session',
        'connection_failed': 'Failed to connect to Google Calendar',
        'callback_failed': 'Authorization callback failed',
      };

      toast({
        title: "Connection Failed",
        description: errorMessages[error] || 'Failed to connect Google Calendar',
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const checkConnectionStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/google-calendar/status?userId=${user.id}`);
      const data = await response.json();

      if (data.success) {
        setStatus({
          connected: data.connected,
          email: data.email,
          connectedAt: data.connectedAt,
          lastSyncAt: data.lastSyncAt,
        });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      toast({
        title: "Error",
        description: "Failed to check Google Calendar connection status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!user) return;

    try {
      setConnecting(true);

      // Check if user is already signed in with Google
      const { isGoogleUser } = await import('@/lib/firebase/googleAuth');

      if (!isGoogleUser()) {
        toast({
          title: "Google Sign-in Required",
          description: "Please sign out and sign back in with Google to enable calendar integration.",
          variant: "destructive",
        });
        setConnecting(false);
        return;
      }

      // User is already signed in with Google, check if calendar permissions are available
      toast({
        title: "Calendar Integration",
        description: "Calendar integration is automatically enabled when you sign in with Google. If you don't see your calendar syncing, please sign out and sign back in with Google.",
      });

      // Refresh the connection status
      await checkConnectionStatus();

    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : 'Failed to connect Google Calendar',
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!user) return;

    try {
      setDisconnecting(true);
      const response = await fetch(`/api/google-calendar/status?userId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setStatus({ connected: false });
        toast({
          title: "Disconnected",
          description: "Google Calendar has been disconnected successfully",
        });
      } else {
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : 'Failed to disconnect Google Calendar',
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Checking connection status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Personal Google Calendar Integration
        </CardTitle>
        <CardDescription>
          When you sign in with Google, your personal Google Calendar automatically syncs with clinic appointments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          {status.connected ? (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
              <XCircle className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </div>

        {/* Connection Details */}
        {status.connected && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Connected Account:</span> {status.email}
            </div>
            {status.connectedAt && (
              <div>
                <span className="font-medium">Connected:</span> {new Date(status.connectedAt).toLocaleDateString()}
              </div>
            )}
            {status.lastSyncAt && (
              <div>
                <span className="font-medium">Last Sync:</span> {new Date(status.lastSyncAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Sign in with Google to automatically enable calendar sync</li>
            <li>• All clinic appointments appear in your personal Google Calendar</li>
            <li>• You can see appointments alongside your personal events</li>
            <li>• Appointments you create can be edited from Google Calendar</li>
            <li>• Other users' appointments are view-only in your calendar</li>
            <li>• All team members see the same appointments</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status.connected ? (
            <>
              <Button
                variant="outline"
                onClick={disconnectGoogleCalendar}
                disabled={disconnecting}
                className="flex items-center gap-2"
              >
                <Unlink className="h-4 w-4" />
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
              <Button
                variant="outline"
                onClick={checkConnectionStatus}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </Button>
            </>
          ) : (
            <Button
              onClick={connectGoogleCalendar}
              disabled={connecting}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {connecting ? 'Checking...' : 'Check Google Calendar Status'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
