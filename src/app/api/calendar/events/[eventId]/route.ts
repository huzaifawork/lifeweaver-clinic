// src/app/api/calendar/events/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService, CalendarEvent } from '@/lib/google-calendar-service';

// GET - Fetch specific calendar event
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const event = await googleCalendarService.getEvent(eventId);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update calendar event
export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const eventData: Partial<CalendarEvent> = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (eventData.start?.dateTime) {
      const startDate = new Date(eventData.start.dateTime);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid start date format' },
          { status: 400 }
        );
      }
    }

    if (eventData.end?.dateTime) {
      const endDate = new Date(eventData.end.dateTime);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid end date format' },
          { status: 400 }
        );
      }
    }

    // Validate start is before end if both are provided
    if (eventData.start?.dateTime && eventData.end?.dateTime) {
      const startDate = new Date(eventData.start.dateTime);
      const endDate = new Date(eventData.end.dateTime);
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { success: false, error: 'Start time must be before end time' },
          { status: 400 }
        );
      }
    }

    const updatedEvent = await googleCalendarService.updateEvent(eventId, eventData);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Event updated successfully',
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    await googleCalendarService.deleteEvent(eventId);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
