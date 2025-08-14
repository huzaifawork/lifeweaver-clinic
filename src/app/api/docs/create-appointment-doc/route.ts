// src/app/api/docs/create-appointment-doc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import GoogleDocsService from '@/lib/google-docs-service';
import { getUserCalendarConnection } from '@/lib/firebase/userCalendarConnections';
import { getClient } from '@/lib/firebase/clients';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Appointment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { appointment, creatorUserId } = await request.json();

    if (!appointment || !creatorUserId) {
      return NextResponse.json(
        { error: 'Missing appointment data or creator user ID' },
        { status: 400 }
      );
    }

    console.log('🔄 Creating Google Doc for appointment:', {
      appointmentId: appointment.id,
      clientName: appointment.clientName,
      creatorUserId
    });

    // Get user's Google tokens
    const connection = await getUserCalendarConnection(creatorUserId);
    if (!connection || !connection.tokens) {
      console.log('⚠️ No Google tokens found for user:', creatorUserId);
      return NextResponse.json(
        { error: 'User not connected to Google services' },
        { status: 400 }
      );
    }

    const tokens = connection.tokens;

    // Initialize Google Docs service
    const docsService = new GoogleDocsService();
    docsService.initializeWithTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date
    });

    // Get client information for more detailed document
    let client = null;
    try {
      client = await getClient(appointment.clientId);
    } catch (error) {
      console.log('⚠️ Could not fetch client details:', error);
    }

    // Create the Google Doc
    const appointmentDoc = await docsService.createAppointmentDocument(appointment, client);

    // Save document reference to Firebase
    const docRef = await addDoc(collection(db, 'appointmentDocuments'), {
      ...appointmentDoc,
      createdByUserId: creatorUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Google Doc created successfully:', {
      documentId: appointmentDoc.documentId,
      documentUrl: appointmentDoc.documentUrl,
      firestoreId: docRef.id
    });

    return NextResponse.json({
      success: true,
      document: {
        ...appointmentDoc,
        firestoreId: docRef.id
      }
    });

  } catch (error) {
    console.error('❌ Error creating appointment document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create appointment document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
