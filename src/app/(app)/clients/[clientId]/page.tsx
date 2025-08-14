
// src/app/(app)/clients/[clientId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { Client, SessionNote, User, Attachment, ToDoTask, ProgressReviewReport, MedicalAssessment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import SessionFeed from '@/components/sessions/SessionFeed';
import ToDoList from '@/components/todo/ToDoList';
import ProgressReportModal from '@/components/reports/ProgressReportModal';
import MedicalAssessmentTabs from '@/components/medical/MedicalAssessmentTabs';
import DocumentManagement from '@/components/documents/DocumentManagement';
import { generateProgressReport } from '@/ai/flows/generate-progress-report';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, User as UserIconProp, Users, Trash2, ListChecks, FileCog, Loader2, FileText, Stethoscope } from 'lucide-react';
import { format, formatDistanceToNow, addDays, startOfDay, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getClient, updateClient } from '@/lib/firebase/clients';
import { getSessionsByClient, createSession, updateSession, deleteSession } from '@/lib/firebase/sessions';
import { getTasksByClient, createTask, updateTask, deleteTask } from '@/lib/firebase/tasks';
import { getAllUsers } from '@/lib/firebase/users';
import { getAssessmentsByClient, createMedicalAssessment } from '@/lib/firebase/assessments';


export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<SessionNote[]>([]);
  const [todoTasks, setTodoTasks] = useState<ToDoTask[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [medicalAssessments, setMedicalAssessments] = useState<MedicalAssessment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedClinicianToAdd, setSelectedClinicianToAdd] = useState<string>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ProgressReviewReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');

  // Get clinicians and admins from real data
  const ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION = allUsers.filter(u =>
    u.role === 'Clinician' || u.role === 'Admin' || u.role === 'Super Admin'
  );
  const ADMIN_USER = allUsers.find(u => u.role === 'Admin' || u.role === 'Super Admin');
  const ADMIN_USER_ID = ADMIN_USER?.id || '';
  const ADMIN_USER_NAME = ADMIN_USER?.name || 'Admin';


  const canManageTeam = user && (user.role === 'Admin' || user.role === 'Super Admin');
  const isTeamMember = user && client && user.role === 'Clinician' && client.teamMemberIds?.includes(user.id);
  const canModifyNotesAndTasks = canManageTeam || isTeamMember;
  const canGenerateReport = canModifyNotesAndTasks;
  const canDeleteSystemGeneratedTasks = user?.role === 'Super Admin';


  const synchronizePresetTasks = useCallback((currentClient: Client, existingTasks: ToDoTask[], skipToast = false): ToDoTask[] => {
    if (!user) return existingTasks;
    let updatedTasks = [...existingTasks];
    let changesMade = false;

    const clientDateAdded = new Date(currentClient.dateAdded);

    const getFirstTeamMemberOrAdmin = (): Pick<User, 'id' | 'name'> => {
        if (currentClient.teamMemberIds && currentClient.teamMemberIds.length > 0) {
            const firstMemberId = currentClient.teamMemberIds[0];
            const member = ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(c => c.id === firstMemberId);
            if (member) return member;
        }
        return ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(c => c.id === ADMIN_USER_ID) || {id: ADMIN_USER_ID, name: ADMIN_USER_NAME};
    };

    const thirtyDayReviewDesc = "Conduct 1st Progress Review (30 days post-intake)";
    let thirtyDayReview = updatedTasks.find(task => task.description === thirtyDayReviewDesc && task.isSystemGenerated);
    if (!thirtyDayReview) {
      const dueDate30 = format(addDays(startOfDay(clientDateAdded), 30), 'yyyy-MM-dd');
      const assignedMember = getFirstTeamMemberOrAdmin();

      const assignedIds = new Set([assignedMember.id, ADMIN_USER_ID]);
      const assignedNames = new Set([assignedMember.name, ADMIN_USER_NAME]);

      thirtyDayReview = {
        id: `sys-${currentClient.id}-30day-${Date.now()}`,
        clientId: currentClient.id,
        description: thirtyDayReviewDesc,
        isDone: false,
        createdAt: new Date().toISOString(),
        addedByUserId: 'system',
        addedByUserName: 'System',
        assignedToUserIds: Array.from(assignedIds),
        assignedToUserNames: Array.from(assignedNames),
        dueDate: dueDate30,
        isSystemGenerated: true,
      };
      updatedTasks.push(thirtyDayReview);
      changesMade = true;
      if (!skipToast) {
        const assigneeText = `Assigned to ${Array.from(assignedNames).join(', ')}.`;
        toast({ title: "System Task Added", description: `"${thirtyDayReviewDesc}" scheduled. ${assigneeText}`, variant: "default" });
      }
    }

    if (thirtyDayReview && (thirtyDayReview.isDone || (thirtyDayReview.dueDate && isPast(addDays(new Date(thirtyDayReview.dueDate), 1))))) {
        const sixtyDayFollowUpDesc = "Conduct Follow-up Progress Review (60 days after 1st)";
        const sixtyDayFollowUpExpectedDueDate = thirtyDayReview.dueDate ? addDays(startOfDay(new Date(thirtyDayReview.dueDate)), 60) : addDays(startOfDay(clientDateAdded), 30 + 60);

        const existingSixtyDayReview = updatedTasks.find(task =>
            task.description === sixtyDayFollowUpDesc &&
            task.isSystemGenerated &&
            task.dueDate === format(sixtyDayFollowUpExpectedDueDate, 'yyyy-MM-dd')
        );

        if (!existingSixtyDayReview) {
            const assignedMember = getFirstTeamMemberOrAdmin();
            const assignedIds = new Set([assignedMember.id, ADMIN_USER_ID]);
            const assignedNames = new Set([assignedMember.name, ADMIN_USER_NAME]);

            const newSixtyDayReview: ToDoTask = {
                id: `sys-${currentClient.id}-60day-${Date.now()}`,
                clientId: currentClient.id,
                description: sixtyDayFollowUpDesc,
                isDone: false,
                createdAt: new Date().toISOString(),
                addedByUserId: 'system',
                addedByUserName: 'System',
                assignedToUserIds: Array.from(assignedIds),
                assignedToUserNames: Array.from(assignedNames),
                dueDate: format(sixtyDayFollowUpExpectedDueDate, 'yyyy-MM-dd'),
                isSystemGenerated: true,
            };
            updatedTasks.push(newSixtyDayReview);
            changesMade = true;
            if (!skipToast) {
              const assigneeText = `Assigned to ${Array.from(assignedNames).join(', ')}.`;
              toast({ title: "System Task Added", description: `"${sixtyDayFollowUpDesc}" scheduled. ${assigneeText}`, variant: "default" });
            }
        }
    }

    // Note: In real implementation, system-generated tasks would be created in Firebase
    // For now, we'll just return the updated tasks array
    return updatedTasks;
  }, [user, toast, ADMIN_USER_ID, ADMIN_USER_NAME, ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION]);


  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId || !user) return;

      try {
        setDataLoading(true);

        // Load all data in parallel with individual error handling
        const [clientData, sessionsData, tasksData, usersData, assessmentsData] = await Promise.allSettled([
          getClient(clientId),
          getSessionsByClient(clientId),
          getTasksByClient(clientId),
          getAllUsers(),
          getAssessmentsByClient(clientId)
        ]);

        // Handle client data
        if (clientData.status === 'fulfilled' && clientData.value) {
          setClient(clientData.value);
        } else {
          console.error('Failed to load client:', clientData.status === 'rejected' ? clientData.reason : 'Client not found');
          setClient(null);
        }

        // Handle sessions data
        if (sessionsData.status === 'fulfilled') {
          setSessions(sessionsData.value.sort((a, b) => new Date(b.dateOfSession).getTime() - new Date(a.dateOfSession).getTime()));
        } else {
          console.error('Failed to load sessions:', sessionsData.reason);
          setSessions([]);
        }

        // Handle tasks data
        if (tasksData.status === 'fulfilled') {
          setTodoTasks(tasksData.value);
        } else {
          console.error('Failed to load tasks:', tasksData.reason);
          setTodoTasks([]);
        }

        // Handle users data
        if (usersData.status === 'fulfilled') {
          setAllUsers(usersData.value);
        } else {
          console.error('Failed to load users:', usersData.reason);
          setAllUsers([]);
        }

        // Handle assessments data
        if (assessmentsData.status === 'fulfilled') {
          setMedicalAssessments(assessmentsData.value);
        } else {
          console.error('Failed to load assessments:', assessmentsData.reason);
          setMedicalAssessments([]);
        }

        // Synchronize preset tasks if client exists (skip toast on initial load)
        if (clientData.status === 'fulfilled' && clientData.value && tasksData.status === 'fulfilled') {
          try {
            const synchronizedTasks = synchronizePresetTasks(clientData.value, tasksData.value, true);
            setTodoTasks(synchronizedTasks);
          } catch (syncError) {
            console.error('Error synchronizing preset tasks:', syncError);
          }
        }
      } catch (error) {
        console.error('Error loading client data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load client data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadClientData();
  }, [clientId, user]);

  const handleAddSession = async (newSessionData: Omit<SessionNote, 'id' | 'sessionNumber' | 'createdAt' | 'updatedAt'>) => {
    try {
      const sessionNumber = sessions.length + 1;
      const sessionToCreate = {
        ...newSessionData,
        sessionNumber,
        attachments: newSessionData.attachments || [],
      };

      const createdSession = await createSession(sessionToCreate);
      setSessions(prevSessions => [createdSession, ...prevSessions].sort((a, b) => new Date(b.dateOfSession).getTime() - new Date(a.dateOfSession).getTime()));

      toast({
        title: "Session Added",
        description: "Session note has been successfully created.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddToDoTask = async (description: string, dueDate?: string, assignedToUserIdsInput?: string[]) => {
    if (!user || !client) return;

    try {
      const manuallyAssignedUserIds = new Set(assignedToUserIdsInput || []);
      if (ADMIN_USER_ID) {
        manuallyAssignedUserIds.add(ADMIN_USER_ID);
      }

      if (manuallyAssignedUserIds.size === 0) {
          toast({ title: "Assignee Required", description: "A task must be assigned to at least one team member.", variant: "destructive"});
          return;
      }

      const finalAssignedUserIds = Array.from(manuallyAssignedUserIds);
      const finalAssignedUserNames = finalAssignedUserIds.map(id => {
          const assignee = ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(c => c.id === id);
          return assignee?.name || (id === ADMIN_USER_ID ? ADMIN_USER_NAME : 'Unknown User');
      });

      const taskData = {
        clientId: client.id,
        description,
        isDone: false,
        addedByUserId: user.id,
        addedByUserName: user.name,
        assignedToUserIds: finalAssignedUserIds,
        assignedToUserNames: finalAssignedUserNames,
        dueDate: dueDate ? format(startOfDay(new Date(dueDate)), 'yyyy-MM-dd') : undefined,
        isSystemGenerated: false,
      };

      const createdTask = await createTask(taskData);
      setTodoTasks(prev => [...prev, createdTask]);

      const assigneeText = finalAssignedUserNames.length > 0 ? `Assigned to ${finalAssignedUserNames.join(', ')}.` : 'Unassigned.';
      toast({ title: "Task Added", description: `"${description}" has been added. ${assigneeText}` });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSessionUpdated = (updatedSession: SessionNote) => {
    try {
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === updatedSession.id ? updatedSession : session
        ).sort((a, b) => new Date(b.dateOfSession).getTime() - new Date(a.dateOfSession).getTime())
      );
    } catch (error) {
      console.error('Error updating session in state:', error);
    }
  };

  const handleSessionDeleted = (sessionId: string) => {
    try {
      setSessions(prevSessions =>
        prevSessions.filter(session => session.id !== sessionId)
      );
    } catch (error) {
      console.error('Error deleting session from state:', error);
    }
  };

  const handleToggleToDoTask = async (taskId: string) => {
    if (!user || !client) return;

    try {
      const task = todoTasks.find(t => t.id === taskId);
      if (!task) return;

      const isNowDone = !task.isDone;
      const updates = {
        isDone: isNowDone,
        completedAt: isNowDone ? new Date().toISOString() : undefined,
        completedByUserId: isNowDone ? user.id : undefined,
        completedByUserName: isNowDone ? user.name : undefined,
      };

      await updateTask(taskId, updates);

      const updatedTasks = todoTasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      setTodoTasks(updatedTasks);

      toast({
        title: `Task ${isNowDone ? 'Completed' : 'Marked Pending'}`,
        description: `"${task.description}" status updated.`
      });

      // Synchronize preset tasks if this was a system-generated task that was completed
      if (task.isSystemGenerated && isNowDone && client) {
        const newTaskList = synchronizePresetTasks(client, updatedTasks, false);
        setTodoTasks(newTaskList);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveToDoTask = async (taskId: string) => {
    if (!client) return;

    try {
      const taskToRemove = todoTasks.find(task => task.id === taskId);
      if (!taskToRemove) return;

      if (taskToRemove.isSystemGenerated && !canDeleteSystemGeneratedTasks) {
          toast({ title: "Deletion Denied", description: "System-generated tasks cannot be deleted by your role.", variant: "destructive"});
          return;
      }

      await deleteTask(taskId);

      const updatedTasks = todoTasks.filter(task => task.id !== taskId);
      setTodoTasks(updatedTasks);

      toast({ title: "Task Removed", description: `"${taskToRemove.description}" has been removed.` });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Medical Assessment Handlers
  const handleSaveAssessment = async (assessment: Omit<MedicalAssessment, 'id'>) => {
    try {
      console.log('🔄 STARTING handleSaveAssessment with data:', assessment);
      const savedAssessment = await createMedicalAssessment(assessment);
      console.log('✅ Assessment saved to Firebase:', savedAssessment);
      setMedicalAssessments(prev => [savedAssessment, ...prev]);
      toast({
        title: "Assessment Saved",
        description: "Medical assessment has been successfully saved.",
      });
    } catch (error) {
      console.error('❌ Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateDocument = async (clientId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          userId: user.id,
          userName: user.name,
          action: 'generate',
          options: { includeAllSessions: true }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }

      const result = await response.json();

      // Update client with document info
      if (client) {
        const updatedClient = {
          ...client,
          googleDocId: result.documentId,
          lastDocumentUpdate: new Date().toISOString()
        };
        setClient(updatedClient);
      }

      toast({
        title: result.isNew ? "Document Generated" : "Document Updated",
        description: result.isNew
          ? "Google Doc has been successfully generated."
          : "Google Doc has been updated with latest data.",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate document. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to be handled by the component
    }
  };

  const handleGenerateProgressReport = async () => {
    if (!client || !user) {
      toast({ title: "Error", description: "Client or user data not available.", variant: "destructive" });
      return;
    }
    if (sessions.length === 0) {
      toast({ title: "No Session Notes", description: "Cannot generate a report without any session notes for this client.", variant: "default" });
      return;
    }

    setIsGeneratingReport(true);
    setGeneratedReport(null);
    setIsReportModalOpen(true);

    try {
      const sessionNotesText = sessions
        .map(s => `Date: ${format(new Date(s.dateOfSession), 'yyyy-MM-dd')}\nClinician: ${s.attendingClinicianName}\nContent: ${s.content.replace(/<[^>]+>/g, ' ')}\n---`)
        .join('\n\n');

      const aiInput = {
        clientName: client.name,
        sessionNotesText: sessionNotesText,
      };

      const result = await generateProgressReport(aiInput);

      const newReport: ProgressReviewReport = {
        id: `report-${client.id}-${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        generatedAt: new Date().toISOString(),
        generatedByUserId: user.id,
        generatedByUserName: user.name,
        reportHtmlContent: result.reportHtmlContent,
      };
      setGeneratedReport(newReport);
      toast({ title: "Progress Report Generated", description: "The AI has drafted the progress report.", variant: "default" });

    } catch (error) {
      console.error("Error generating progress report:", error);
      toast({ title: "Report Generation Failed", description: (error as Error).message || "Could not generate the report. Please try again.", variant: "destructive" });
      setIsReportModalOpen(false);
    } finally {
      setIsGeneratingReport(false);
    }
  };


  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  const handleAddClinicianToTeam = async () => {
    if (!client || !selectedClinicianToAdd) return;

    try {
      if (client.teamMemberIds?.includes(selectedClinicianToAdd)) {
          toast({ title: "Clinician already on team", description: `${ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(c=>c.id === selectedClinicianToAdd)?.name} is already on this team.`, variant: "default" });
          return;
      }

      const updatedTeamMemberIds = [...(client.teamMemberIds || []), selectedClinicianToAdd];
      await updateClient(client.id, { teamMemberIds: updatedTeamMemberIds });

      const updatedClient = {
        ...client,
        teamMemberIds: updatedTeamMemberIds,
      };
      setClient(updatedClient);

      toast({ title: "Clinician Added", description: `${ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(c=>c.id === selectedClinicianToAdd)?.name} has been added to Team ${client.name}.`, variant: "default" });
      setSelectedClinicianToAdd('');
    } catch (error) {
      console.error('Error adding clinician to team:', error);
      toast({
        title: "Error",
        description: "Failed to add clinician to team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveClinicianFromTeam = async (clinicianIdToRemove: string) => {
    if (!client) return;

    try {
      const clinicianName = ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(c => c.id === clinicianIdToRemove)?.name || 'The clinician';
      const updatedTeamMemberIds = (client.teamMemberIds || []).filter(id => id !== clinicianIdToRemove);

      await updateClient(client.id, { teamMemberIds: updatedTeamMemberIds });

      const updatedClient = {
        ...client,
        teamMemberIds: updatedTeamMemberIds,
      };
      setClient(updatedClient);

      toast({ title: "Clinician Removed", description: `${clinicianName} has been removed from Team ${client.name}.`, variant: "default" });
    } catch (error) {
      console.error('Error removing clinician from team:', error);
      toast({
        title: "Error",
        description: "Failed to remove clinician from team. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle /> Client Not Found
          </CardTitle>
        </CardHeader>
        <CardDescription className="p-6 text-destructive-foreground">
          The client with ID "{clientId}" could not be found. Please check the ID or select another client.
        </CardDescription>
      </Card>
    );
  }

  const availableCliniciansToAdd = ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.filter(
    c => !client.teamMemberIds?.includes(c.id) && c.role === 'Clinician'
  );

  const teamMembersForAssignment = ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.filter(
    c => client.teamMemberIds?.includes(c.id) || c.id === ADMIN_USER_ID
  ).map(c => ({ id: c.id, name: c.name }));


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
                <UserIconProp className="h-8 w-8" /> {client.name}
              </CardTitle>
              <CardDescription className="text-md text-muted-foreground mt-1">
                Client since {formatDistanceToNow(new Date(client.dateAdded), { addSuffix: true })}.
                Total Sessions: {sessions.length}.
                Pending Tasks: {todoTasks.filter(t => !t.isDone).length}.
              </CardDescription>
            </div>
             {canGenerateReport && (
                <Button onClick={handleGenerateProgressReport} disabled={isGeneratingReport || sessions.length === 0} variant="outline">
                {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCog className="mr-2 h-4 w-4" />}
                {isGeneratingReport ? 'Generating...' : 'Generate Progress Report'}
                </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary"/>
            Team {client.name}
          </CardTitle>
          <CardDescription>Clinicians assigned to this client.</CardDescription>
        </CardHeader>
        <CardContent>
          {client.teamMemberIds && client.teamMemberIds.length > 0 ? (
            <ul className="space-y-3">
              {client.teamMemberIds.map(memberId => {
                const member = ALL_CLINICIANS_AND_ADMINS_FOR_SELECTION.find(u => u.id === memberId) ;
                if (!member) return null;
                return (
                  <li key={memberId} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.vocation || member.role}</p>
                      </div>
                    </div>
                    {canManageTeam && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveClinicianFromTeam(memberId)} title={`Remove ${member.name} from team`}>
                        <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground">No clinicians assigned to this team yet.</p>
          )}
          {canManageTeam && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-md font-semibold mb-3 text-foreground/90">Add Clinician to Team</h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Select value={selectedClinicianToAdd} onValueChange={setSelectedClinicianToAdd}>
                  <SelectTrigger className="w-full sm:flex-1">
                    <SelectValue placeholder="Select a clinician to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCliniciansToAdd.length > 0 ? (
                      availableCliniciansToAdd.map(clinician => (
                        <SelectItem key={clinician.id} value={clinician.id}>
                          {clinician.name} ({clinician.vocation || 'Clinician'})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-center text-muted-foreground">All clinicians are already on this team or no clinicians available.</div>
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddClinicianToTeam} disabled={!selectedClinicianToAdd || availableCliniciansToAdd.length === 0} className="w-full sm:w-auto">
                  Add to Team
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Sessions & Tasks
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Medical Assessments
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileCog className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6 space-y-6">
          {user && canModifyNotesAndTasks && client && (
            <ToDoList
              clientId={client.id}
              tasks={todoTasks}
              currentUser={user}
              onAddTask={handleAddToDoTask}
              onToggleTask={handleToggleToDoTask}
              onRemoveTask={handleRemoveToDoTask}
              canModify={canModifyNotesAndTasks}
              canDeleteSystemGenerated={canDeleteSystemGeneratedTasks}
              assignableTeamMembers={teamMembersForAssignment}
            />
          )}

          {/* Show sessions to all authenticated users, but restrict editing based on permissions */}
          <SessionFeed
            clientId={client.id}
            clientName={client.name}
            sessions={sessions}
            currentUser={user!}
            onSessionAdded={handleAddSession}
            onSessionUpdated={handleSessionUpdated}
            onSessionDeleted={handleSessionDeleted}
            canModifyNotes={canModifyNotesAndTasks}
            hasGoogleDoc={!!client.googleDocId}
          />
        </TabsContent>

        <TabsContent value="assessments" className="mt-6">
          {user && client && (
            <MedicalAssessmentTabs
              client={client}
              currentUser={user}
              onUpdateClient={updateClient}
              onSaveAssessment={handleSaveAssessment}
              onGenerateDocument={handleGenerateDocument}
              existingAssessments={medicalAssessments}
              isLoading={dataLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6 space-y-6">
          {/* Document Management */}
          {user && (
            <DocumentManagement
              client={client}
              currentUser={user}
              onGenerateDocument={() => handleGenerateDocument(client.id)}
              isGenerating={dataLoading}
            />
          )}

          {/* Progress Reports */}
          <Card>
            <CardHeader>
              <CardTitle>AI Progress Reports</CardTitle>
              <CardDescription>
                Generate AI-powered progress reports based on session notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canGenerateReport && (
                <Button
                  onClick={handleGenerateProgressReport}
                  disabled={isGeneratingReport || sessions.length === 0}
                  className="w-full sm:w-auto"
                >
                  {isGeneratingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileCog className="mr-2 h-4 w-4" />
                      Generate AI Progress Report
                    </>
                  )}
                </Button>
              )}

              {sessions.length === 0 && (
                <p className="text-muted-foreground mt-4">
                  No session notes available. Add session notes to generate progress reports.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProgressReportModal
        report={generatedReport}
        client={client}
        isOpen={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        isGenerating={isGeneratingReport}
      />
    </div>
  );
}
