// src/app/api/docs/get-document-content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import GoogleDocsService from '@/lib/google-docs-service';
import { getUserCalendarConnection } from '@/lib/firebase/userCalendarConnections';

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId } = await request.json();

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Missing document ID or user ID' },
        { status: 400 }
      );
    }

    console.log('📄 Fetching document content:', { documentId, userId });

    // Get user's Google tokens
    const connection = await getUserCalendarConnection(userId);
    if (!connection || !connection.tokens) {
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

    // Get document content
    const documentContent = await docsService.getDocumentContent(documentId);

    // Extract text content from the document
    let textContent = '';
    if (documentContent.body && documentContent.body.content) {
      for (const element of documentContent.body.content) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content) {
              textContent += textElement.textRun.content;
            }
          }
        }
      }
    }

    console.log('✅ Document content retrieved successfully');

    return NextResponse.json({
      success: true,
      document: {
        id: documentContent.documentId,
        title: documentContent.title,
        content: textContent,
        revisionId: documentContent.revisionId,
        lastModified: documentContent.modifiedTime
      }
    });

  } catch (error) {
    console.error('❌ Error fetching document content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch document content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
