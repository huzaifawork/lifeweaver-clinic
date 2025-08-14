"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { FuglMeyerAssessment } from '@/lib/types';

interface FuglMeyerAssessmentFormProps {
  assessment?: FuglMeyerAssessment;
  clientId: string;
  assessorId: string;
  assessorName: string;
  onSave: (assessment: Omit<FuglMeyerAssessment, 'id'>) => Promise<void>;
  isLoading?: boolean;
}

export default function FuglMeyerAssessmentForm({ 
  assessment, 
  clientId,
  assessorId,
  assessorName,
  onSave, 
  isLoading = false 
}: FuglMeyerAssessmentFormProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Omit<FuglMeyerAssessment, 'id'>>({
    clientId,
    assessmentDate: assessment?.assessmentDate || new Date().toISOString().split('T')[0],
    assessorId,
    assessorName,
    shoulderElbowForearm: assessment?.shoulderElbowForearm || 0,
    wrist: assessment?.wrist || 0,
    hand: assessment?.hand || 0,
    coordinationSpeed: assessment?.coordinationSpeed || 0,
    total: assessment?.total || 0,
    notes: assessment?.notes || ''
  });

  const handleInputChange = (field: keyof Omit<FuglMeyerAssessment, 'id'>, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Auto-calculate total when motor scores change
      if (['shoulderElbowForearm', 'wrist', 'hand', 'coordinationSpeed'].includes(field)) {
        const total = (
          (field === 'shoulderElbowForearm' ? Number(value) : updated.shoulderElbowForearm) +
          (field === 'wrist' ? Number(value) : updated.wrist) +
          (field === 'hand' ? Number(value) : updated.hand) +
          (field === 'coordinationSpeed' ? Number(value) : updated.coordinationSpeed)
        );
        updated.total = total;
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 FuglMeyerAssessmentForm handleSubmit called with data:', formData);

    // Validation
    if (formData.shoulderElbowForearm > 36) {
      toast({
        title: "Invalid Score",
        description: "Shoulder/Elbow/Forearm score cannot exceed 36 points.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.wrist > 10) {
      toast({
        title: "Invalid Score",
        description: "Wrist score cannot exceed 10 points.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.hand > 14) {
      toast({
        title: "Invalid Score",
        description: "Hand score cannot exceed 14 points.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.coordinationSpeed > 6) {
      toast({
        title: "Invalid Score",
        description: "Coordination/Speed score cannot exceed 6 points.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔄 Calling onSave with formData:', formData);
      await onSave(formData);
      console.log('✅ onSave completed successfully');
      toast({
        title: "Assessment Saved",
        description: "Fugl Meyer Assessment has been successfully saved.",
      });
    } catch (error) {
      console.error('❌ Error in FuglMeyerAssessmentForm onSave:', error);
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Fugl Meyer Assessment (Dynamic - Patient Specific)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Assess only the areas relevant to this patient's specific condition and rehabilitation needs.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessmentDate">Assessment Date</Label>
              <Input
                id="assessmentDate"
                type="date"
                value={formData.assessmentDate}
                onChange={(e) => handleInputChange('assessmentDate', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="assessorName">Assessor Name</Label>
              <Input
                id="assessorName"
                value={formData.assessorName}
                onChange={(e) => handleInputChange('assessorName', e.target.value)}
                required
                readOnly
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">A - MOTOR Section</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shoulderElbowForearm">
                    Shoulder/Elbow/Forearm <span className="text-sm text-muted-foreground">(Max: 36)</span>
                  </Label>
                  <Input
                    id="shoulderElbowForearm"
                    type="number"
                    min="0"
                    max="36"
                    value={formData.shoulderElbowForearm}
                    onChange={(e) => handleInputChange('shoulderElbowForearm', Number(e.target.value))}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    Score: {formData.shoulderElbowForearm}/36
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wrist">
                    Wrist <span className="text-sm text-muted-foreground">(Max: 10)</span>
                  </Label>
                  <Input
                    id="wrist"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.wrist}
                    onChange={(e) => handleInputChange('wrist', Number(e.target.value))}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    Score: {formData.wrist}/10
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hand">
                    Hand <span className="text-sm text-muted-foreground">(Max: 14)</span>
                  </Label>
                  <Input
                    id="hand"
                    type="number"
                    min="0"
                    max="14"
                    value={formData.hand}
                    onChange={(e) => handleInputChange('hand', Number(e.target.value))}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    Score: {formData.hand}/14
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="coordinationSpeed">
                    Coordination/Speed <span className="text-sm text-muted-foreground">(Max: 6)</span>
                  </Label>
                  <Input
                    id="coordinationSpeed"
                    type="number"
                    min="0"
                    max="6"
                    value={formData.coordinationSpeed}
                    onChange={(e) => handleInputChange('coordinationSpeed', Number(e.target.value))}
                    required
                  />
                  <div className="text-xs text-muted-foreground">
                    Score: {formData.coordinationSpeed}/6
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">TOTAL SCORE:</span>
                <span className="text-2xl font-bold text-primary">
                  {formData.total}/66
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Percentage: {((formData.total / 66) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Assessment Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional observations, patient behavior, or clinical notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Fugl Meyer Assessment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
