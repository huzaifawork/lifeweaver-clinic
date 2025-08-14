// src/app/api/docs/list-appointment-docs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching all appointment documents...');

    // Get all appointment documents from Firebase
    const docsQuery = query(
      collection(db, 'appointmentDocuments'),
      orderBy('createdAt', 'desc')
    );
    
    const docsSnapshot = await getDocs(docsQuery);
    const documents = docsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Retrieved ${documents.length} appointment documents`);

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('❌ Error fetching appointment documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch appointment documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
