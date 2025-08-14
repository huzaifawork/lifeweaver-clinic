// src/app/api/calendar/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService, CalendarEvent } from '@/lib/google-calendar-service';

// GET - Fetch calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const maxResults = parseInt(searchParams.get('maxResults') || '100');
    const date = searchParams.get('date');
    const query = searchParams.get('q');

    let events;

    if (date) {
      // Get events for specific date
      events = await googleCalendarService.getEventsForDate(new Date(date));
    } else if (query) {
      // Search events
      events = await googleCalendarService.searchEvents(query);
    } else {
      // Get events in date range
      events = await googleCalendarService.getEvents(
        timeMin || undefined,
        timeMax || undefined,
        maxResults
      );
    }

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new calendar event
export async function POST(request: NextRequest) {
  try {
    const eventData: CalendarEvent = await request.json();

    // Validate required fields
    if (!eventData.summary || !eventData.start?.dateTime || !eventData.end?.dateTime) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: summary, start.dateTime, end.dateTime' 
        },
        { status: 400 }
      );
    }

    // Validate date format
    const startDate = new Date(eventData.start.dateTime);
    const endDate = new Date(eventData.end.dateTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format' 
        },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Start time must be before end time' 
        },
        { status: 400 }
      );
    }

    const createdEvent = await googleCalendarService.createEvent(eventData);

    return NextResponse.json({
      success: true,
      event: createdEvent,
      message: 'Event created successfully',
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create calendar event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
