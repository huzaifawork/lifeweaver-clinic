// src/lib/utils/appointmentCalendarSync.ts
import type { Appointment } from '@/lib/types';
import type { CalendarEvent } from '@/lib/google-calendar-service';
import { addMinutes } from 'date-fns';

/**
 * Convert an appointment to a Google Calendar event
 */
export function appointmentToCalendarEvent(appointment: Appointment): CalendarEvent {
  const startDate = new Date(appointment.dateOfSession);
  const endDate = addMinutes(startDate, appointment.duration);

  // Create a descriptive summary
  const summary = `${appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)} - ${appointment.clientName}`;

  // Create detailed description
  const description = [
    `Client: ${appointment.clientName}`,
    `Clinician: ${appointment.attendingClinicianName}`,
    appointment.attendingClinicianVocation ? `Vocation: ${appointment.attendingClinicianVocation}` : '',
    `Type: ${appointment.type}`,
    `Duration: ${appointment.duration} minutes`,
    appointment.content ? `Notes: ${appointment.content}` : '',
    '',
    `Created by: ${appointment.createdByUserName}`,
    `LWV Clinic Appointment ID: ${appointment.id}`
  ].filter(Boolean).join('\n');

  // Map appointment status to Google Calendar status
  const getCalendarStatus = (status: string): 'confirmed' | 'tentative' | 'cancelled' => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  };

  return {
    summary,
    description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/New_York', // You can make this configurable
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/New_York',
    },
    location: appointment.location || 'TBD',
    status: getCalendarStatus(appointment.status),
    // You can add color coding based on appointment type
    colorId: getColorIdForAppointmentType(appointment.type),
  };
}

/**
 * Get color ID for different appointment types
 */
function getColorIdForAppointmentType(type: string): string {
  const colorMap: Record<string, string> = {
    'appointment': '1', // Blue
    'consultation': '2', // Green
    'follow-up': '3', // Purple
    'assessment': '4', // Red
    'meeting': '5', // Yellow
  };
  
  return colorMap[type] || '1'; // Default to blue
}

/**
 * Extract appointment ID from Google Calendar event description
 */
export function extractAppointmentIdFromEvent(description?: string): string | null {
  if (!description) return null;
  
  const match = description.match(/LWV Clinic Appointment ID: ([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a Google Calendar event was created by our system
 */
export function isLWVClinicEvent(description?: string): boolean {
  return description?.includes('LWV Clinic Appointment ID:') || false;
}

/**
 * Sync appointment data with Google Calendar event data
 */
export function syncAppointmentWithCalendarEvent(
  appointment: Appointment,
  calendarEvent: any
): Partial<Appointment> {
  const updates: Partial<Appointment> = {};

  // Check if the event was updated in Google Calendar
  const eventStartTime = new Date(calendarEvent.start.dateTime || calendarEvent.start.date);
  const appointmentStartTime = new Date(appointment.dateOfSession);

  if (eventStartTime.getTime() !== appointmentStartTime.getTime()) {
    updates.dateOfSession = eventStartTime.toISOString();
  }

  // Check if duration changed (calculate from start/end times)
  if (calendarEvent.end?.dateTime) {
    const eventEndTime = new Date(calendarEvent.end.dateTime);
    const newDuration = Math.round((eventEndTime.getTime() - eventStartTime.getTime()) / (1000 * 60));
    
    if (newDuration !== appointment.duration) {
      updates.duration = newDuration;
    }
  }

  // Check if location changed
  if (calendarEvent.location && calendarEvent.location !== appointment.location) {
    updates.location = calendarEvent.location;
  }

  // Map Google Calendar status back to appointment status
  if (calendarEvent.status) {
    const newStatus = mapCalendarStatusToAppointmentStatus(calendarEvent.status);
    if (newStatus !== appointment.status) {
      updates.status = newStatus as any;
    }
  }

  return updates;
}

/**
 * Map Google Calendar status to appointment status
 */
function mapCalendarStatusToAppointmentStatus(calendarStatus: string): string {
  switch (calendarStatus) {
    case 'confirmed':
      return 'confirmed';
    case 'tentative':
      return 'tentative';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'confirmed';
  }
}
