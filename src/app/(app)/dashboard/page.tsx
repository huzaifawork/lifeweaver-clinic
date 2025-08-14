
// src/app/(app)/dashboard/page.tsx
"use client";

import { useState, useEffect } from 'react'; // Added useState, useEffect
import { useAuth } from '@/contexts/AuthContext';
import OverviewDashboard from '@/components/dashboards/OverviewDashboard';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Added Button
import type { Client, SessionNote, User } from '@/lib/types';
import { Lightbulb, RefreshCw, Loader2, CalendarIcon } from 'lucide-react'; // Added RefreshCw, Loader2, CalendarIcon
import { getAllClients } from '@/lib/firebase/clients';
import { getAllSessions } from '@/lib/firebase/sessions';
import { getAllUsers } from '@/lib/firebase/users';
import { getAllAppointments } from '@/lib/firebase/appointments';
import EventCalendar from '@/components/shared/EventCalendar';
import NotificationCard from '@/components/shared/NotificationCard';
import NotificationPopup from '@/components/notifications/NotificationPopup';


import { useToast } from '@/hooks/use-toast'; // Added useToast

// Dashboard will load real data from Firebase

// Real data will be loaded from Firebase


// Real team data will be loaded from Firebase


export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<SessionNote[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [combinedCalendarData, setCombinedCalendarData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        let [clientsData, sessionsData, usersData, appointmentsData] = await Promise.all([
          getAllClients(),
          getAllSessions(), // Changed from getRecentSessions(10) to getAllSessions() to match appointments page
          getAllUsers(),
          getAllAppointments()
        ]);

        // Auto-cleanup is now handled by useDataCleanup hook in layout

        console.log('Dashboard data loaded:', {
          clients: clientsData.length,
          sessions: sessionsData.length,
          users: usersData.length,
          appointments: appointmentsData.length
        });

        setClients(clientsData);
        setSessions(sessionsData);
        setTeamMembers(usersData);
        setAppointments(appointmentsData);

        // Show all sessions to all users (same as appointments page behavior)
        // No role-based filtering for sessions - everyone can see all sessions
        const filteredSessions = sessionsData;

        // Filter appointments based on user role
        let filteredAppointments = appointmentsData;
        if (user.role === 'Clinician') {
          filteredAppointments = appointmentsData.filter(appointment =>
            appointment.attendingClinicianId === user.id
          );
        }

        // Combine sessions and appointments for calendar view
        const combinedData = [...filteredSessions, ...filteredAppointments];
        setCombinedCalendarData(combinedData);

        // Show notification popup after successful data load (simulating login)
        setTimeout(() => {
          setShowNotificationPopup(true);
        }, 1000);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]); // Removed 'toast' from dependency array to prevent infinite re-renders

  if (!user || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  // Sessions are now handled by OverviewDashboard component






  // Use dynamic OverviewDashboard for all users - no more role-specific dashboards

  return (
    <div className="space-y-6">
      {/* Notification Card - Shows on login and dismisses on navigation */}
      <NotificationCard />

      {/* Notification Popup - Shows after login */}
      {showNotificationPopup && (
        <NotificationPopup onClose={() => setShowNotificationPopup(false)} />
      )}





      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-primary">
                <CalendarIcon className="h-6 w-6" /> Appointments
              </CardTitle>
              <CardDescription>
                View past and upcoming sessions. Click on a day to see details.
              </CardDescription>
            </div>

          </div>
        </CardHeader>
        <CardContent>
           <EventCalendar sessions={combinedCalendarData} useRealTimeAppointments={false} />
        </CardContent>
      </Card>

      {/* Role-specific dashboards */}
      {user.role === 'Super Admin' ? (
        <SuperAdminDashboard
          user={user}
          recentSessions={sessions.slice(0, 10)}
          clients={clients}
          team={teamMembers}
        />
      ) : user.role === 'Admin' ? (
        <AdminDashboard
          user={user}
          recentSessions={sessions.slice(0, 10)}
          clients={clients}
          team={teamMembers}
        />
      ) : (
        <OverviewDashboard user={user} />
      )}
    </div>
  );
}

