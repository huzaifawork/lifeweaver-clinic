// src/app/api/documents/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, userId, userName, action, sessionId, options } = body;

    if (!clientId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, userId, userName' },
        { status: 400 }
      );
    }

    let result;

    // Dynamic import to avoid client-side bundling issues
    const { generateClientDocument, addSessionToClientDocument } = await import('@/lib/services/documentGenerationService');

    switch (action) {
      case 'generate':
        console.log('📄 Simple document generation requested');
        try {
          // Import the original document service
          const { generateClientDocument } = await import('@/lib/services/documentGenerationService');

          // Get user tokens for Google Docs API
          const { getGoogleConnection } = await import('@/lib/firebase/googleConnections');
          const connection = await getGoogleConnection(userId);

          if (!connection || !connection.tokens) {
            throw new Error('Google connection not found. Please reconnect your Google account.');
          }

          // Generate simple document with original implementation
          const { documentId, documentUrl, isNew } = await generateClientDocument(
            clientId,
            userId,
            userName,
            connection.tokens,
            { useProfessionalTemplate: false }
          );

          result = {
            success: true,
            message: `Document ${isNew ? 'created' : 'updated'} successfully`,
            documentId,
            documentUrl
          };
        } catch (error) {
          console.error('❌ Document generation failed:', error);
          result = {
            success: false,
            message: `Failed to generate document: ${error}`,
            documentId: null,
            documentUrl: null
          };
        }
        break;

      case 'append_session':
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required for append_session action' },
            { status: 400 }
          );
        }
        await addSessionToClientDocument(clientId, sessionId, userId, userName);
        result = { success: true, message: 'Session appended to document' };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "generate" or "append_session"' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Document generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process document request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) {
    return NextResponse.json(
      { error: 'clientId parameter is required' },
      { status: 400 }
    );
  }

  try {
    // This would get document status - implement as needed
    return NextResponse.json({ 
      message: 'Document status endpoint - implement as needed',
      clientId 
    });
  } catch (error) {
    console.error('Error getting document status:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}
