"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  FileText,
  ExternalLink
} from 'lucide-react';
import { getAllAppointments } from '@/lib/firebase/appointments';
import { getAllClients } from '@/lib/firebase/clients';
import { getAllUsers } from '@/lib/firebase/users';
import { getAllSessions } from '@/lib/firebase/sessions';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentErrorBoundary, CalendarErrorBoundary } from '@/components/ui/error-boundary';
import { CalendarSkeleton, AppointmentListSkeleton, LoadingState } from '@/components/ui/loading-skeleton';
import type { Appointment, Client, User, Session } from '@/lib/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isFuture, isPast } from 'date-fns';
import Link from 'next/link';

interface AppointmentWithDetails extends Appointment {
  clientName: string;
  clinicianName: string;
}

export default function AppointmentsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Use real-time appointments hook with error handling
  const {
    appointments: realTimeAppointments,
    loading: appointmentsLoading,
    error: appointmentsError,
    getAppointmentsForDate,
    getTodayAppointments
  } = useAppointments({
    realtime: true
  });

  // Convert to AppointmentWithDetails format
  const appointments: AppointmentWithDetails[] = realTimeAppointments.map(appointment => {
    const client = clients.find(c => c.id === appointment.clientId);
    const clinician = users.find(u => u.id === appointment.attendingClinicianId);
    return {
      ...appointment,
      clientName: client?.name || appointment.clientName || 'Unknown Client',
      clinicianName: clinician?.name || appointment.attendingClinicianName || 'Unknown Clinician'
    };
  });

  const isLoading = appointmentsLoading;

  useEffect(() => {
    if (currentUser) {
      loadSupportingData();
    }
  }, [currentUser]);

  const loadSupportingData = async () => {
    if (!currentUser) return;

    try {
      const [clientsData, usersData, sessionsData] = await Promise.all([
        getAllClients(),
        getAllUsers(),
        getAllSessions()
      ]);

      setClients(clientsData);
      setUsers(usersData);
      setSessions(sessionsData);

      console.log('📅 Loaded appointments page data:', {
        clients: clientsData.length,
        users: usersData.length,
        sessions: sessionsData.length
      });
    } catch (error) {
      console.error('Error loading supporting data:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load supporting data.",
        variant: "destructive"
      });
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDateLocal = (date: Date) => {
    // Combine appointments and sessions for the given date
    const appointmentsForDate = appointments.filter(appointment =>
      isSameDay(new Date(appointment.dateOfSession), date)
    );

    const sessionsForDate = sessions.filter(session =>
      isSameDay(new Date(session.dateOfSession), date)
    );

    // Convert sessions to appointment-like format for display
    const sessionsAsAppointments = sessionsForDate.map(session => ({
      ...session,
      type: 'session' as const,
      status: 'completed' as const
    }));

    return [...appointmentsForDate, ...sessionsAsAppointments];
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDateLocal(selectedDate) : [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    setSelectedDate(null);
  };

  const getAppointmentStatusColor = (appointment: AppointmentWithDetails) => {
    const sessionDate = new Date(appointment.dateOfSession);

    // Color based on status and date
    if (appointment.status === 'completed') {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (appointment.status === 'cancelled') {
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (isToday(sessionDate)) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (appointment.status === 'confirmed' && isFuture(sessionDate)) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (appointment.status === 'tentative') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!currentUser) {
    return <div>Please log in to view appointments.</div>;
  }

  if (pageError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Appointments</h2>
          <p className="text-muted-foreground mb-4">{pageError}</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  try {
    return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Calendar className="h-7 w-7" />
                Appointments
              </CardTitle>
              <CardDescription>
                View past and upcoming sessions. Click on a day to see details.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadSupportingData} disabled={isLoading} variant="outline">
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
              <Link href="/sessions/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Session
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendar */}
        <CalendarErrorBoundary>
          <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(currentDate, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CalendarSkeleton />
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map(day => {
                  const dayAppointments = getAppointmentsForDateLocal(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      aria-label={`${format(day, 'MMMM d, yyyy')}${dayAppointments.length > 0 ? ` - ${dayAppointments.length} appointment${dayAppointments.length !== 1 ? 's' : ''}` : ''}`}
                      aria-pressed={isSelected}
                      className={`
                        p-1 sm:p-2 text-xs sm:text-sm rounded-lg border transition-all duration-200 min-h-[40px] sm:min-h-[60px] flex flex-col items-center justify-start focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                        ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-transparent'}
                        ${isCurrentDay ? 'ring-2 ring-primary ring-opacity-50' : ''}
                      `}
                    >
                      <span className={`font-medium ${isCurrentDay ? 'font-bold' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {dayAppointments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dayAppointments.slice(0, 2).map((_, index) => (
                            <div key={index} className="w-2 h-2 bg-current rounded-full opacity-60" />
                          ))}
                          {dayAppointments.length > 2 && (
                            <span className="text-xs opacity-60">+{dayAppointments.length - 2}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </CalendarErrorBoundary>

        {/* Sessions for selected date */}
        <AppointmentErrorBoundary>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sessions on {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {selectedDate ?
                `${selectedDateAppointments.length} session${selectedDateAppointments.length !== 1 ? 's' : ''} scheduled` :
                'Click on a day to see session details.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <AppointmentListSkeleton count={3} />
            ) : !selectedDate ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a date to view sessions</p>
              </div>
            ) : selectedDateAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No sessions scheduled for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`p-4 rounded-lg border ${getAppointmentStatusColor(appointment)}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="font-semibold truncate">{appointment.clientName}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {appointment.type || appointment.sessionType || 'Session'} - {appointment.duration || 60} min
                            </span>
                            <Badge variant={appointment.status === 'confirmed' || appointment.status === 'completed' ? 'default' : 'secondary'} className="flex-shrink-0">
                              {appointment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{appointment.clinicianName}</span>
                          </div>
                          {appointment.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{appointment.location}</span>
                            </div>
                          )}
                          {appointment.googleDocumentId && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-green-600 flex-shrink-0" />
                              <span className="text-green-600 truncate">Google Doc Available</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
                        {appointment.googleDocumentUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(appointment.googleDocumentUrl, '_blank')}
                            className="w-full sm:w-auto"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View Doc
                          </Button>
                        )}
                        <Link href={`/clients/${appointment.clientId}`} className="w-full sm:w-auto">
                          <Button variant="ghost" size="sm" className="w-full">
                            View Client
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </AppointmentErrorBoundary>
      </div>
    </div>
  );
  } catch (error) {
    console.error('Appointments page error:', error);
    setPageError(error instanceof Error ? error.message : 'Unknown error occurred');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Appointments</h2>
          <p className="text-muted-foreground mb-4">Something went wrong. Please try again.</p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
}
