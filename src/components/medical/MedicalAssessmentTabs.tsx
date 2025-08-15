"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, ExternalLink } from 'lucide-react';

import ClientDemographicsForm from './ClientDemographicsForm';
import FuglMeyerAssessmentForm from './FuglMeyerAssessmentForm';
import FIMAssessmentForm from './FIMAssessmentForm';
import RangeOfMotionForm from './RangeOfMotionForm';

import type { 
  Client, 
  ClientDemographics, 
  FuglMeyerAssessment, 
  FIMAssessment, 
  RangeOfMotionAssessment,
  MedicalAssessment 
} from '@/lib/types';

interface MedicalAssessmentTabsProps {
  client: Client;
  currentUser: { id: string; name: string };
  onUpdateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
  onSaveAssessment: (assessment: Omit<MedicalAssessment, 'id'>) => Promise<void>;
  onGenerateDocument: (clientId: string) => Promise<void>;
  existingAssessments?: MedicalAssessment[];
  isLoading?: boolean;
}

export default function MedicalAssessmentTabs({
  client,
  currentUser,
  onUpdateClient,
  onSaveAssessment,
  onGenerateDocument,
  existingAssessments = [],
  isLoading = false
}: MedicalAssessmentTabsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('demographics');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Get the latest assessments
  const latestFuglMeyer = existingAssessments
    .filter(a => a.fuglMeyer)
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.fuglMeyer;
    
  const latestFIM = existingAssessments
    .filter(a => a.fim)
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.fim;
    
  const latestROM = existingAssessments
    .filter(a => a.rangeOfMotion)
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]?.rangeOfMotion;

  const handleSaveDemographics = async (demographics: ClientDemographics) => {
    try {
      await onUpdateClient(client.id, {
        demographics,
        addedByUserId: currentUser.id,
        addedByUserName: currentUser.name
      });

      toast({
        title: "Demographics Saved",
        description: "Client demographics have been saved and appended to Google Doc.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save demographics. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveFuglMeyer = async (assessment: Omit<FuglMeyerAssessment, 'id'>) => {
    console.log('🔄 MedicalAssessmentTabs handleSaveFuglMeyer called with:', assessment);
    try {
      const medicalAssessment: Omit<MedicalAssessment, 'id'> = {
        clientId: client.id,
        assessmentDate: assessment.assessmentDate,
        assessorId: currentUser.id,
        assessorName: currentUser.name,
        fuglMeyer: {
          ...assessment,
          id: `temp-${Date.now()}` // Temporary ID for the assessment
        }
      };
      console.log('🔄 Calling onSaveAssessment with:', medicalAssessment);
      await onSaveAssessment(medicalAssessment);
      console.log('✅ onSaveAssessment completed successfully');

      toast({
        title: "Fugl Meyer Assessment Saved",
        description: "Assessment has been saved and appended to Google Doc.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Fugl Meyer assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveFIM = async (assessment: Omit<FIMAssessment, 'id'>) => {
    try {
      const medicalAssessment: Omit<MedicalAssessment, 'id'> = {
        clientId: client.id,
        assessmentDate: assessment.assessmentDate,
        assessorId: currentUser.id,
        assessorName: currentUser.name,
        fim: {
          ...assessment,
          id: `temp-${Date.now()}` // Temporary ID for the assessment
        }
      };
      await onSaveAssessment(medicalAssessment);

      toast({
        title: "FIM Assessment Saved",
        description: "Assessment has been saved and appended to Google Doc.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save FIM assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to remove undefined values from an object
  const removeUndefinedValues = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    
    const cleaned: any = {};
    let hasValidData = false;
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
        hasValidData = true;
      }
    }
    
    return hasValidData ? cleaned : undefined;
  };

  const handleSaveROM = async (assessment: Omit<RangeOfMotionAssessment, 'id'>) => {
    try {
      // Clean up the assessment data - remove undefined values and empty body parts
      const cleanedAssessment: any = {
        assessmentDate: assessment.assessmentDate,
        assessorName: assessment.assessorName
      };
      
      // Only include notes if it has a value
      if (assessment.notes && assessment.notes.trim() !== '') {
        cleanedAssessment.notes = assessment.notes;
      }

      // Process each body part and only include if it has valid data
      const bodyParts = ['shoulder', 'elbow', 'wrist', 'digits', 'thumb'];
      bodyParts.forEach(part => {
        const bodyPartData = removeUndefinedValues(assessment[part as keyof typeof assessment]);
        if (bodyPartData) {
          cleanedAssessment[part] = bodyPartData;
        }
      });

      const medicalAssessment: Omit<MedicalAssessment, 'id'> = {
        clientId: client.id,
        assessmentDate: assessment.assessmentDate,
        assessorId: currentUser.id,
        assessorName: currentUser.name,
        rangeOfMotion: cleanedAssessment // Firebase will generate the ID automatically
      };
      await onSaveAssessment(medicalAssessment);

      toast({
        title: "Range of Motion Assessment Saved",
        description: "Assessment has been saved and appended to Google Doc.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Range of Motion assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateDocument = async () => {
    setIsGeneratingDoc(true);
    try {
      await onGenerateDocument(client.id);
      toast({
        title: "Document Generated",
            description: "Medical assessment document has been successfully generated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const getCompletionStatus = () => {
    const hasDemo = !!client.demographics;
    const hasFugl = !!latestFuglMeyer;
    const hasFIM = !!latestFIM;
    const hasROM = !!latestROM;
    
    const completed = [hasDemo, hasFugl, hasFIM, hasROM].filter(Boolean).length;
    const total = 4;
    
    return { completed, total, percentage: (completed / total) * 100 };
  };

  const status = getCompletionStatus();

  return (
    <div className="space-y-6">
      {/* Header with Document Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🏥 Medical Assessment Dashboard
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant={status.completed === status.total ? "default" : "secondary"}>
                  {status.completed}/{status.total} Assessments Complete
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {status.percentage.toFixed(0)}% Complete
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {client.googleDocId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://docs.google.com/document/d/${client.googleDocId}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Doc
                </Button>
              )}
              
              <Button
                onClick={handleGenerateDocument}
                disabled={isGeneratingDoc || status.completed === 0}
                size="sm"
              >
                {isGeneratingDoc ? (
                  <>Generating...</>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {client.googleDocId ? 'Update Professional Doc' : 'Generate Professional Doc'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Assessment Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demographics" className="flex items-center gap-2">
            📋 Demographics
            {client.demographics && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="fuglmeyer" className="flex items-center gap-2">
            🧠 Fugl Meyer
            {latestFuglMeyer && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="fim" className="flex items-center gap-2">
            📊 FIM
            {latestFIM && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rom" className="flex items-center gap-2">
            📐 Range of Motion
            {latestROM && <Badge variant="secondary" className="ml-1">✓</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="mt-6">
          <ClientDemographicsForm
            demographics={client.demographics}
            onSave={handleSaveDemographics}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="fuglmeyer" className="mt-6">
          <FuglMeyerAssessmentForm
            assessment={latestFuglMeyer}
            clientId={client.id}
            assessorId={currentUser.id}
            assessorName={currentUser.name}
            onSave={handleSaveFuglMeyer}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="fim" className="mt-6">
          <FIMAssessmentForm
            assessment={latestFIM}
            clientId={client.id}
            assessorId={currentUser.id}
            assessorName={currentUser.name}
            onSave={handleSaveFIM}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="rom" className="mt-6">
          <RangeOfMotionForm
            assessment={latestROM}
            clientId={client.id}
            assessorId={currentUser.id}
            assessorName={currentUser.name}
            onSave={handleSaveROM}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Assessment History */}
      {existingAssessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingAssessments
                .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())
                .slice(0, 5)
                .map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">
                        {new Date(assessment.assessmentDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        By {assessment.assessorName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {assessment.fuglMeyer && <Badge variant="outline">Fugl Meyer</Badge>}
                      {assessment.fim && <Badge variant="outline">FIM</Badge>}
                      {assessment.rangeOfMotion && <Badge variant="outline">ROM</Badge>}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
