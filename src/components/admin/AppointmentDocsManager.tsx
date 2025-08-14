// src/components/admin/AppointmentDocsManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileText, ExternalLink, Search, Calendar, User, Clock, RefreshCw, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentDocument {
  id: string;
  documentId: string;
  documentUrl: string;
  title: string;
  appointmentId: string;
  clientId: string;
  createdAt: string;
  lastModified: string;
  createdByUserId: string;
}

interface DocumentContent {
  id: string;
  title: string;
  content: string;
  revisionId: string;
  lastModified: string;
}

export default function AppointmentDocsManager() {
  const [documents, setDocuments] = useState<AppointmentDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<AppointmentDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentContent | null>(null);
  const [isViewingContent, setIsViewingContent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    // Filter documents based on search term
    if (searchTerm.trim() === '') {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.appointmentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [searchTerm, documents]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/docs/list-appointment-docs');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDocuments(result.documents);
          console.log(`📋 Loaded ${result.documents.length} appointment documents`);
        } else {
          throw new Error(result.error || 'Failed to load documents');
        }
      } else {
        throw new Error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error Loading Documents",
        description: error instanceof Error ? error.message : "Failed to load appointment documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewDocumentContent = async (doc: AppointmentDocument) => {
    try {
      setIsViewingContent(true);
      
      // For now, we'll just open the Google Doc in a new tab
      // In a full implementation, you could fetch and display content inline
      window.open(doc.documentUrl, '_blank');
      
      toast({
        title: "Opening Document",
        description: `Opening "${doc.title}" in Google Docs`,
      });
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive",
      });
    } finally {
      setIsViewingContent(false);
    }
  };

  const getDocumentStatusBadge = (doc: AppointmentDocument) => {
    const createdDate = new Date(doc.createdAt);
    const modifiedDate = new Date(doc.lastModified);
    const daysSinceCreated = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated === 0) {
      return <Badge variant="default">New</Badge>;
    } else if (modifiedDate > createdDate) {
      return <Badge variant="secondary">Updated</Badge>;
    } else {
      return <Badge variant="outline">Created</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Appointment Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading appointment documents...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Appointment Documents Manager
          </CardTitle>
          <CardDescription>
            View and manage all automatically generated appointment documentation from Google Docs.
            Documents are created automatically when appointments are scheduled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by title or appointment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={loadDocuments} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No documents match your search.' : 'No appointment documents found.'}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Documents will appear here automatically when appointments are created.
                  </p>
                )}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm">{doc.title}</h3>
                          {getDocumentStatusBadge(doc)}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>Created: {format(new Date(doc.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Modified: {format(new Date(doc.lastModified), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>Appointment ID: {doc.appointmentId}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDocumentContent(doc)}
                          disabled={isViewingContent}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => window.open(doc.documentUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open in Google Docs
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {filteredDocuments.length > 0 && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Showing {filteredDocuments.length} of {documents.length} documents
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
