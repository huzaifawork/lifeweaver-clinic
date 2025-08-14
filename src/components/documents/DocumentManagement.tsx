"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  Calendar,
  User,
  Clock,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import type { Client, GoogleDocumentInfo } from '@/lib/types';
// import { getGoogleDocumentsByClient } from '@/lib/firebase/googleDocs';

interface DocumentManagementProps {
  client: Client;
  currentUser: { id: string; name: string };
  onGenerateDocument: () => Promise<void>;
  isGenerating?: boolean;
}

export default function DocumentManagement({
  client,
  currentUser,
  onGenerateDocument,
  isGenerating = false
}: DocumentManagementProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<GoogleDocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [client.id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // Load documents via API route to avoid client-side googleapis imports
      const response = await fetch(`/api/documents/list?clientId=${client.id}`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  const handleShareDocument = async (documentId: string) => {
    try {
      // Copy document URL to clipboard
      const documentUrl = `https://docs.google.com/document/d/${documentId}`;
      await navigator.clipboard.writeText(documentUrl);
      toast({
        title: "Link Copied",
        description: "Document link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeLabel = (type: GoogleDocumentInfo['documentType']) => {
    switch (type) {
      case 'client_assessment':
        return 'Medical Assessment';
      case 'session_notes':
        return 'Session Notes';
      case 'progress_report':
        return 'Progress Report';
      default:
        return 'Document';
    }
  };

  const getDocumentTypeColor = (type: GoogleDocumentInfo['documentType']) => {
    switch (type) {
      case 'client_assessment':
        return 'bg-blue-100 text-blue-800';
      case 'session_notes':
        return 'bg-green-100 text-green-800';
      case 'progress_report':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const mainDocument = documents.find(doc => doc.documentType === 'client_assessment');
  const otherDocuments = documents.filter(doc => doc.documentType !== 'client_assessment');

  return (
    <div className="space-y-6">
      {/* Main Assessment Document */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Main Assessment Document
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Primary medical assessment document for {client.name}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={onGenerateDocument}
                disabled={isGenerating}
                variant={mainDocument ? "outline" : "default"}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {mainDocument ? 'Updating...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {mainDocument ? 'Update Document' : 'Generate Document'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {mainDocument ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{mainDocument.documentName}</h3>
                    <Badge className={getDocumentTypeColor(mainDocument.documentType)}>
                      {getDocumentTypeLabel(mainDocument.documentType)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created: {format(new Date(mainDocument.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Updated: {format(new Date(mainDocument.lastUpdated), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      By: {mainDocument.createdByUserName}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareDocument(mainDocument.documentId)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDocument(mainDocument.documentUrl)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                💡 This document is automatically updated when you add new assessments or sessions.
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assessment Document</h3>
              <p className="text-muted-foreground mb-4">
                Generate a comprehensive medical assessment document for {client.name}.
              </p>
              <p className="text-sm text-muted-foreground">
                The document will include client demographics, medical assessments, and session notes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Documents */}
      {otherDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Other Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{doc.documentName}</h4>
                      <Badge className={getDocumentTypeColor(doc.documentType)}>
                        {getDocumentTypeLabel(doc.documentType)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created {format(new Date(doc.createdAt), 'MMM d, yyyy')} by {doc.createdByUserName}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDocument(doc.documentId)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDocument(doc.documentUrl)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Document Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{documents.length}</div>
              <div className="text-sm text-muted-foreground">Total Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {documents.filter(d => d.documentType === 'client_assessment').length}
              </div>
              <div className="text-sm text-muted-foreground">Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {documents.filter(d => d.documentType === 'session_notes').length}
              </div>
              <div className="text-sm text-muted-foreground">Session Docs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {documents.filter(d => d.documentType === 'progress_report').length}
              </div>
              <div className="text-sm text-muted-foreground">Reports</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
