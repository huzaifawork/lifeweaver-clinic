// src/hooks/useSharedCalendar.ts
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent, CalendarEventResponse } from '@/lib/google-calendar-service';

interface UseSharedCalendarOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export const useSharedCalendar = (options: UseSharedCalendarOptions = {}) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    dateRange
  } = options;

  // Fetch events from the API
  const fetchEvents = useCallback(async (params?: {
    timeMin?: string;
    timeMax?: string;
    date?: string;
    query?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (params?.timeMin) searchParams.set('timeMin', params.timeMin);
      if (params?.timeMax) searchParams.set('timeMax', params.timeMax);
      if (params?.date) searchParams.set('date', params.date);
      if (params?.query) searchParams.set('q', params.query);
      
      // Use dateRange if provided and no specific params
      if (!params && dateRange) {
        if (dateRange.start) searchParams.set('timeMin', dateRange.start.toISOString());
        if (dateRange.end) searchParams.set('timeMax', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/calendar/events?${searchParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      setEvents(data.events);
      return data.events;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  // Create a new event
  const createEvent = useCallback(async (eventData: CalendarEvent) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      // Refresh events to show the new one
      await fetchEvents();

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });

      return data.event;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, toast]);

  // Update an existing event
  const updateEvent = useCallback(async (eventId: string, eventData: Partial<CalendarEvent>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update event');
      }

      // Refresh events to show the updated one
      await fetchEvents();

      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });

      return data.event;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, toast]);

  // Delete an event
  const deleteEvent = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete event');
      }

      // Refresh events to remove the deleted one
      await fetchEvents();

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete event';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchEvents, toast]);

  // Get events for a specific date
  const getEventsForDate = useCallback(async (date: Date) => {
    return fetchEvents({ date: date.toISOString() });
  }, [fetchEvents]);

  // Search events
  const searchEvents = useCallback(async (query: string) => {
    return fetchEvents({ query });
  }, [fetchEvents]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchEvents();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchEvents();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchEvents, autoRefresh, refreshInterval]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    searchEvents,
    refresh: fetchEvents,
  };
};
