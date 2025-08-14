"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { FIMAssessment } from '@/lib/types';

interface FIMAssessmentFormProps {
  assessment?: FIMAssessment;
  clientId: string;
  assessorId: string;
  assessorName: string;
  onSave: (assessment: Omit<FIMAssessment, 'id'>) => Promise<void>;
  isLoading?: boolean;
}

const FIM_LEVELS = [
  { value: 1, label: '1 - Total Assistance' },
  { value: 2, label: '2 - Maximal Assistance' },
  { value: 3, label: '3 - Moderate Assistance' },
  { value: 4, label: '4 - Minimal Assistance' },
  { value: 5, label: '5 - Supervision' },
  { value: 6, label: '6 - Modified Independence' },
  { value: 7, label: '7 - Complete Independence' }
];

export default function FIMAssessmentForm({ 
  assessment, 
  clientId,
  assessorId,
  assessorName,
  onSave, 
  isLoading = false 
}: FIMAssessmentFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<FIMAssessment, 'id'>>({
    clientId,
    assessmentDate: assessment?.assessmentDate || new Date().toISOString().split('T')[0],
    assessorId,
    assessorName,
    eating: assessment?.eating || undefined,
    grooming: assessment?.grooming || undefined,
    bathing: assessment?.bathing || undefined,
    upperBodyDressing: assessment?.upperBodyDressing || undefined,
    lowerBodyDressing: assessment?.lowerBodyDressing || undefined,
    toileting: assessment?.toileting || undefined,
    transfers: assessment?.transfers || undefined,
    notes: assessment?.notes || ''
  });

  const handleInputChange = (field: keyof Omit<FIMAssessment, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSave(formData);
      toast({
        title: "Assessment Saved",
        description: "FIM Assessment has been successfully saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const calculateTotal = () => {
    const scores = [
      formData.eating,
      formData.grooming,
      formData.bathing,
      formData.upperBodyDressing,
      formData.lowerBodyDressing,
      formData.toileting,
      formData.transfers
    ].filter(score => score !== undefined) as number[];
    
    return scores.reduce((sum, score) => sum + score, 0);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 6) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Functional Independence Measure (FIM)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Assessment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessmentDate">Assessment Date</Label>
              <Input
                id="assessmentDate"
                type="date"
                value={formData.assessmentDate.split('T')[0]}
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

          {/* FIM Scale Reference */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">FIM Scale (1-7):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {FIM_LEVELS.map(level => (
                <div key={level.value} className="flex items-center gap-2">
                  <span className="font-mono w-6">{level.value}:</span>
                  <span>{level.label.split(' - ')[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FIM Assessment Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Daily Living Activities</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'eating', label: 'Eating' },
                { key: 'grooming', label: 'Grooming' },
                { key: 'bathing', label: 'Bathing' },
                { key: 'upperBodyDressing', label: 'Upper Body Dressing' },
                { key: 'lowerBodyDressing', label: 'Lower Body Dressing' },
                { key: 'toileting', label: 'Toileting' },
                { key: 'transfers', label: 'Transfers' }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="flex items-center justify-between">
                    {label}
                    <span className={`text-sm font-mono ${getScoreColor(formData[key as keyof typeof formData] as number)}`}>
                      {formData[key as keyof typeof formData] ? `${formData[key as keyof typeof formData]}/7` : '-/7'}
                    </span>
                  </Label>
                  <Select 
                    value={formData[key as keyof typeof formData]?.toString() || ''} 
                    onValueChange={(value) => handleInputChange(key as keyof typeof formData, Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIM_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value.toString()}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {/* Total Score */}
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">TOTAL SCORE:</span>
                <span className="text-2xl font-bold text-primary">
                  {calculateTotal()}/49
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Average: {calculateTotal() > 0 ? (calculateTotal() / 7).toFixed(1) : '0.0'}/7
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assessment Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional observations, comments, or recommendations..."
              rows={4}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Saving...' : 'Save FIM Assessment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
