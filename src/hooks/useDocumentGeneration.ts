// src/hooks/useDocumentGeneration.ts
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DocumentGenerationOptions {
  includeAllSessions?: boolean;
  sessionIds?: string[];
  forceNew?: boolean;
}

interface UseDocumentGenerationReturn {
  isGenerating: boolean;
  generateDocument: (clientId: string, userId: string, userName: string, options?: DocumentGenerationOptions) => Promise<{ documentId: string; documentUrl: string; isNew: boolean }>;
  appendSession: (clientId: string, sessionId: string, userId: string, userName: string) => Promise<void>;
}

export const useDocumentGeneration = (): UseDocumentGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateDocument = async (
    clientId: string, 
    userId: string, 
    userName: string, 
    options: DocumentGenerationOptions = {}
  ) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          userId,
          userName,
          action: 'generate',
          options
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }

      const result = await response.json();
      
      toast({
        title: result.isNew ? "Document Generated" : "Document Updated",
        description: result.isNew 
          ? "Google Doc has been successfully generated." 
          : "Google Doc has been updated with latest data.",
      });

      return result;
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate document. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const appendSession = async (
    clientId: string, 
    sessionId: string, 
    userId: string, 
    userName: string
  ) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          sessionId,
          userId,
          userName,
          action: 'append_session'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to append session to document');
      }

      toast({
        title: "Session Added",
        description: "Session has been successfully added to the Google Doc.",
      });
    } catch (error) {
      console.error('Error appending session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to append session. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateDocument,
    appendSession
  };
};
