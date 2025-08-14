// src/components/calendar/CalendarSyncStatus.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';


interface SyncResult {
  synced: number;
  updated: number;
  errors: string[];
  lastSync?: Date;
}

export default function CalendarSyncStatus() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const handleManualSync = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      const syncResult: SyncResult = {
        synced: data.data.synced,
        updated: data.data.updated,
        errors: data.data.errors,
        lastSync: new Date(),
      };

      setLastSyncResult(syncResult);

      if (data.data.errors.length === 0) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${data.data.synced} events, updated ${data.data.updated} appointments.`,
        });
      } else {
        toast({
          title: 'Sync Completed with Warnings',
          description: `Synced ${data.data.synced} events with ${data.data.errors.length} errors.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync with Google Calendar. Please try again.',
        variant: 'destructive',
      });
      console.error('Manual sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSyncStatusIcon = () => {
    if (!lastSyncResult) return <Clock className="h-4 w-4" />;
    if (lastSyncResult.errors.length === 0) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getSyncStatusText = () => {
    if (!lastSyncResult) return 'Not synced yet';
    if (lastSyncResult.errors.length === 0) return 'Sync successful';
    return `Sync completed with ${lastSyncResult.errors.length} warnings`;
  };

  const getSyncStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!lastSyncResult) return 'outline';
    if (lastSyncResult.errors.length === 0) return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Google Calendar Sync
        </CardTitle>
        <CardDescription>
          Sync appointments with the shared Google Calendar. All users will see updates in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSyncStatusIcon()}
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={getSyncStatusVariant()}>
              {getSyncStatusText()}
            </Badge>
          </div>
          
          {lastSyncResult?.lastSync && (
            <span className="text-xs text-muted-foreground">
              Last sync: {lastSyncResult.lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Sync Results */}
        {lastSyncResult && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Events synced:</span>
              <span className="font-medium">{lastSyncResult.synced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Appointments updated:</span>
              <span className="font-medium">{lastSyncResult.updated}</span>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {lastSyncResult?.errors && lastSyncResult.errors.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-yellow-600">Warnings:</span>
            <div className="space-y-1">
              {lastSyncResult.errors.slice(0, 3).map((error, index) => (
                <p key={index} className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
                  {error}
                </p>
              ))}
              {lastSyncResult.errors.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  ... and {lastSyncResult.errors.length - 3} more warnings
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
          <p className="font-medium mb-1">📅 Automatic Sync:</p>
          <p>Appointments automatically sync to all users' personal Google Calendars when created, updated, or deleted. No manual action required.</p>
        </div>
      </CardContent>
    </Card>
  );
}
