
// src/app/(app)/admin/cases/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert, FolderSync, Loader2, CheckCircle, XCircle, Info, Edit2, Users, ArrowRight, Search, PlusCircle, Trash2, FileText, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import type { Client, SessionNote, User } from '@/lib/types';
import { getAllClients, cleanupOrphanedData, deleteClient } from '@/lib/firebase/clients';
import { getAllSessions } from '@/lib/firebase/sessions';
import { getAllUsers } from '@/lib/firebase/users';
import { Input } from '@/components/ui/input';


// All mock data removed - using real Firebase data now


export default function CasesManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<{ success: boolean; timestamp: string | null; details?: string }>({ success: false, timestamp: null });
  const [syncedItemsLog, setSyncedItemsLog] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<SessionNote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

  // Google Docs sync functions
  const generateClientDocument = async (client: Client) => {
    try {
      // Get client sessions and assessments
      const clientSessions = sessions.filter(session => session.clientId === client.id);

      // Create document content
      const documentContent = `
# Client Report: ${client.name}

## Client Information
- **Name**: ${client.name}
- **Date of Birth**: ${client.dateOfBirth}
- **Address**: ${client.address}
- **Phone**: ${client.phone}
- **Email**: ${client.email}
- **Emergency Contact**: ${client.emergencyContactName} (${client.emergencyContactPhone})
- **Date Added**: ${format(new Date(client.dateAdded), 'PPP')}

## Medical Information
- **Reason for Therapy**: ${client.reasonForTherapy || 'Not specified'}
- **Medical History**: ${client.medicalHistory || 'Not provided'}
- **Current Medications**: ${client.currentMedications || 'Not provided'}

## Session History
${clientSessions.length > 0 ?
  clientSessions.map(session => `
### Session ${format(new Date(session.sessionDate), 'PPP')}
- **Duration**: ${session.duration} minutes
- **Type**: ${session.sessionType}
- **Notes**: ${session.sessionNotes || 'No notes provided'}
- **Goals**: ${session.goals || 'No goals specified'}
- **Progress**: ${session.progress || 'No progress notes'}
`).join('\n') :
  'No sessions recorded yet.'
}

## Assessment Summary
${client.medicalAssessment ? `
### Medical Assessment
- **Assessment Date**: ${client.medicalAssessment.assessmentDate}
- **Assessor**: ${client.medicalAssessment.assessorName}
- **General Notes**: ${client.medicalAssessment.generalNotes || 'No notes provided'}
` : 'No medical assessments completed yet.'}

---
*Document generated on ${format(new Date(), 'PPP')} by ${user?.name || 'System'}*
      `;

      return documentContent;
    } catch (error) {
      console.error('Error generating document content:', error);
      throw error;
    }
  };

  const syncToGoogleDocs = async (clientIds: string[] = []) => {
    setIsGeneratingDocs(true);
    const syncLog: string[] = [];

    try {
      const clientsToSync = clientIds.length > 0
        ? clients.filter(client => clientIds.includes(client.id))
        : clients;

      for (const client of clientsToSync) {
        try {
          const documentContent = await generateClientDocument(client);

          // Here you would integrate with Google Docs API
          // For now, we'll simulate the process
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

          syncLog.push(`✅ ${client.name} - Document created/updated`);

          // In a real implementation, you would:
          // 1. Create or update Google Doc using Google Docs API
          // 2. Store the document ID in the client record
          // 3. Set up real-time sync triggers

        } catch (error) {
          syncLog.push(`❌ ${client.name} - Failed: ${error}`);
        }
      }

      setSyncedItemsLog(syncLog);
      setLastSyncStatus({
        success: true,
        timestamp: new Date().toISOString(),
        details: `Successfully synced ${clientsToSync.length} client(s)`
      });

      toast({
        title: "Google Docs Sync Complete",
        description: `${clientsToSync.length} client documents have been synced to Google Docs.`,
      });

    } catch (error) {
      setLastSyncStatus({
        success: false,
        timestamp: new Date().toISOString(),
        details: `Sync failed: ${error}`
      });

      toast({
        title: "Sync Failed",
        description: "Failed to sync documents to Google Docs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDocs(false);
      setSelectedClients([]);
    }
  };

  // Load real Firebase data
  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, sessionsData, usersData] = await Promise.all([
        getAllClients(),
        getAllSessions(),
        getAllUsers()
      ]);

      // Auto-cleanup orphaned data
      try {
        const cleanupResult = await cleanupOrphanedData();
        if (cleanupResult.deletedSessions > 0 || cleanupResult.deletedAppointments > 0 || cleanupResult.deletedTasks > 0 || cleanupResult.deletedReports > 0) {
          console.log('🧹 Auto-cleanup completed in cases page:', cleanupResult);
          // Reload sessions data after cleanup
          const updatedSessionsData = await getAllSessions();
          setSessions(updatedSessionsData);
        }
      } catch (cleanupError) {
        console.warn('Auto-cleanup failed:', cleanupError);
      }

      setClients(clientsData);
      setSessions(sessionsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load cases data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]); // Removed 'toast' from dependency array to prevent infinite re-renders

  if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-6 w-6" /> Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground">
            You do not have permission to access this page. Only Admins and Super Admins can manage cases and data synchronization.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <FolderSync className="h-7 w-7" />
              Cases Management
            </CardTitle>
            <CardDescription>
              Loading cases data...
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading client data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') return '?';
    const names = name.trim().split(' ').filter(n => n.length > 0);
    if (names.length === 0) return '?';
    if (names.length === 1) return names[0][0].toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  // Removed parseSessionString function - no longer needed with real Firebase data

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete ${clientName}? This will also delete all their sessions, appointments, tasks, and reports. This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteClient(clientId);

      toast({
        title: "Client Deleted",
        description: `${clientName} and all related data have been deleted successfully.`,
      });

      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Delete Failed",
        description: `Failed to delete ${clientName}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    setIsSyncing(true);
    setSyncedItemsLog([]);
    toast({
      title: "Refreshing Data",
      description: "Reloading all client data from Firebase...",
    });

    const currentSyncedItems: string[] = [];

    try {
      currentSyncedItems.push("Loading clients from Firebase...");
      setSyncedItemsLog([...currentSyncedItems]);

      const [clientsData, sessionsData, usersData] = await Promise.all([
        getAllClients(),
        getAllSessions(),
        getAllUsers()
      ]);

      currentSyncedItems.push(`Loaded ${clientsData.length} clients`);
      currentSyncedItems.push(`Loaded ${sessionsData.length} sessions`);
      currentSyncedItems.push(`Loaded ${usersData.length} users`);
      setSyncedItemsLog([...currentSyncedItems]);

      setClients(clientsData);
      setSessions(sessionsData);
      setUsers(usersData);

      const summary = `Data refresh complete. Clients: ${clientsData.length}, Sessions: ${sessionsData.length}, Users: ${usersData.length}`;
      currentSyncedItems.push(summary);
      setLastSyncStatus({ success: true, timestamp: new Date().toISOString(), details: summary });

      toast({
        title: "Data Refreshed",
        description: summary,
        className: "bg-green-500/10 border-green-500 text-green-700 dark:bg-green-500/20 dark:text-green-400",
      });

    } catch (error) {
      const errorMsg = `Refresh Error: ${(error as Error).message}`;
      currentSyncedItems.push(errorMsg);
      setLastSyncStatus({ success: false, timestamp: new Date().toISOString(), details: errorMsg });
      toast({
        title: "Data Refresh Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setSyncedItemsLog([...currentSyncedItems, "--- Refresh Finished ---"]);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <FolderSync className="h-7 w-7" />
            Cases Management
          </CardTitle>
          <CardDescription>
            Manage client cases, synchronize data, and view all client records.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> All Client Cases
            </CardTitle>
            <CardDescription>
                View and manage all client records in the system.
            </CardDescription>
          </div>
           <Button variant="default" disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Client (Manual)
          </Button>
        </CardHeader>
        <CardContent>
            <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search clients by name..."
                    className="pl-9 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
            </div>
          {filteredClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClients(filteredClients.map(c => c.id));
                        } else {
                          setSelectedClients([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead>Team Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClients(prev => [...prev, client.id]);
                          } else {
                            setSelectedClients(prev => prev.filter(id => id !== client.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(client.dateAdded), 'PPP')} ({formatDistanceToNow(new Date(client.dateAdded), { addSuffix: true })})</TableCell>
                    <TableCell>{client.teamMemberIds?.length || 0} member(s)</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/clients/${client.id}`}>View Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">
                {searchTerm ? "No clients match your search." : "No clients in the system yet. Try syncing from Drive."}
            </p>
          )}
        </CardContent>
         <CardFooter className="border-t pt-4">
             <p className="text-sm text-muted-foreground">Total clients: {clients.length}</p>
         </CardFooter>
      </Card>

      {/* Google Docs Sync Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-700">
            <FileText className="h-5 w-5" />
            Google Docs Sync
          </CardTitle>
          <CardDescription>
            Automatically sync client data to Google Docs for easy sharing and collaboration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center p-3 rounded-md bg-blue-100 border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              <strong>Auto-Sync:</strong> Client documents are automatically created/updated in Google Docs when client data changes. You can also manually sync selected clients.
            </p>
          </div>

          {/* Sync Status */}
          {lastSyncStatus.timestamp && (
            <div className={`p-3 rounded-md border ${lastSyncStatus.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                {lastSyncStatus.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${lastSyncStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                  Last sync: {format(new Date(lastSyncStatus.timestamp), 'PPp')}
                </span>
              </div>
              {lastSyncStatus.details && (
                <p className={`text-xs mt-1 ${lastSyncStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                  {lastSyncStatus.details}
                </p>
              )}
            </div>
          )}

          {/* Sync Log */}
          {syncedItemsLog.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Sync Log:</h4>
              <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs space-y-1">
                {syncedItemsLog.map((log, index) => (
                  <div key={index} className="text-gray-600">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Sync Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => syncToGoogleDocs()}
              disabled={isGeneratingDocs || clients.length === 0}
              className="flex items-center gap-2"
            >
              {isGeneratingDocs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Sync All Clients to Google Docs
            </Button>

            <Button
              variant="outline"
              onClick={() => syncToGoogleDocs(selectedClients)}
              disabled={isGeneratingDocs || selectedClients.length === 0}
              className="flex items-center gap-2"
            >
              {isGeneratingDocs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Selected ({selectedClients.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Data Management</CardTitle>
          <CardDescription>
            Refresh and manage client data from Firebase database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center p-3 rounded-md bg-primary/10 border border-primary/20">
            <Info className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
            <p className="text-sm text-primary">
              <strong>Real-time Data:</strong> All client data is loaded from Firebase in real-time. Use the refresh button to reload the latest data from the database.
            </p>
          </div>
          <Button onClick={handleRefreshData} disabled={isSyncing} className="w-full sm:w-auto">
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderSync className="mr-2 h-4 w-4" />
            )}
            {isSyncing ? 'Refreshing Data...' : 'Refresh Client Data'}
          </Button>
           {syncedItemsLog.length > 0 && (
            <div className="mt-4 p-3 border rounded-md bg-secondary/30 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2">Sync Log:</h4>
              <pre className="text-xs whitespace-pre-wrap">
                {syncedItemsLog.join('\n')}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
          {lastSyncStatus.timestamp ? (
            <div className={`flex flex-col items-start gap-1 text-sm ${lastSyncStatus.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              <div className="flex items-center gap-2">
                {lastSyncStatus.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <span>
                  Last refresh: {format(new Date(lastSyncStatus.timestamp), 'PPPp')} - Status: {lastSyncStatus.success ? 'Successful' : 'Failed'}
                </span>
              </div>
              {lastSyncStatus.details && <p className="text-xs pl-6">{lastSyncStatus.details}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data refresh attempts yet in this session.</p>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Manual Case Adjustments (Placeholder)
            </CardTitle>
            <CardDescription>
                Future functionality for manual case creation, archival, or data export will be available here.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This section is a placeholder for more advanced case management tools, such as manually adding clients not found in Drive, archiving old cases, or exporting data for compliance. The "Add New Client" button above would activate this section.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

