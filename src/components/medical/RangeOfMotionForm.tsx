"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { RangeOfMotionAssessment, BodyPartAssessment } from '@/lib/types';

interface RangeOfMotionFormProps {
  assessment?: RangeOfMotionAssessment;
  clientId: string;
  assessorId: string;
  assessorName: string;
  onSave: (assessment: Omit<RangeOfMotionAssessment, 'id'>) => Promise<void>;
  isLoading?: boolean;
}

const BODY_PARTS = [
  { key: 'shoulder', label: 'Shoulder' },
  { key: 'elbow', label: 'Elbow' },
  { key: 'wrist', label: 'Wrist' },
  { key: 'digits', label: 'Digits' },
  { key: 'thumb', label: 'Thumb' }
];

const createEmptyBodyPartAssessment = (): BodyPartAssessment => ({
  masFlexion: undefined,
  masExtension: undefined,
  mmtFlexion: undefined,
  mmtExtension: undefined,
  promFlexion: undefined,
  promExtension: undefined,
  aromFlexion: undefined,
  aromExtension: undefined
});

export default function RangeOfMotionForm({ 
  assessment, 
  clientId,
  assessorId,
  assessorName,
  onSave, 
  isLoading = false 
}: RangeOfMotionFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<RangeOfMotionAssessment, 'id'>>({
    clientId,
    assessmentDate: assessment?.assessmentDate || new Date().toISOString().split('T')[0],
    assessorId,
    assessorName,
    shoulder: assessment?.shoulder || createEmptyBodyPartAssessment(),
    elbow: assessment?.elbow || createEmptyBodyPartAssessment(),
    wrist: assessment?.wrist || createEmptyBodyPartAssessment(),
    digits: assessment?.digits || createEmptyBodyPartAssessment(),
    thumb: assessment?.thumb || createEmptyBodyPartAssessment(),
    notes: assessment?.notes || ''
  });

  const handleInputChange = (field: keyof Omit<RangeOfMotionAssessment, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBodyPartChange = (
    bodyPart: keyof Pick<RangeOfMotionAssessment, 'shoulder' | 'elbow' | 'wrist' | 'digits' | 'thumb'>,
    field: keyof BodyPartAssessment,
    value: number | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [bodyPart]: {
        ...prev[bodyPart]!,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSave(formData);
      toast({
        title: "Assessment Saved",
        description: "Range of Motion Assessment has been successfully saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderBodyPartForm = (bodyPartKey: string, bodyPartLabel: string) => {
    const bodyPart = formData[bodyPartKey as keyof typeof formData] as BodyPartAssessment;
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">{bodyPartLabel} Assessment</h3>
        
        {/* Assessment Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left">Assessment Type</th>
                <th className="border border-gray-300 p-2 text-center">Flexion</th>
                <th className="border border-gray-300 p-2 text-center">Extension</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 font-medium">
                  MAS (Modified Ashworth Scale)
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    step="0.5"
                    value={bodyPart?.masFlexion || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'masFlexion',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="0-4"
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="4"
                    step="0.5"
                    value={bodyPart?.masExtension || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'masExtension',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="0-4"
                    className="w-full"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium">
                  MMT (Manual Muscle Testing)
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={bodyPart?.mmtFlexion || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'mmtFlexion',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="0-5"
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    value={bodyPart?.mmtExtension || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'mmtExtension',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="0-5"
                    className="w-full"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium">
                  PROM (Passive Range of Motion) °
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={bodyPart?.promFlexion || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'promFlexion',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="Degrees"
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={bodyPart?.promExtension || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'promExtension',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="Degrees"
                    className="w-full"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-medium">
                  AROM (Active Range of Motion) °
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={bodyPart?.aromFlexion || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'aromFlexion',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="Degrees"
                    className="w-full"
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <Input
                    type="number"
                    min="0"
                    max="360"
                    value={bodyPart?.aromExtension || ''}
                    onChange={(e) => handleBodyPartChange(
                      bodyPartKey as any,
                      'aromExtension',
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    placeholder="Degrees"
                    className="w-full"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Scale References */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 p-3 rounded">
            <h4 className="font-semibold mb-1">MAS Scale (0-4):</h4>
            <div className="space-y-1">
              <div>0: No increase in muscle tone</div>
              <div>1: Slight increase in muscle tone</div>
              <div>2: More marked increase in muscle tone</div>
              <div>3: Considerable increase in muscle tone</div>
              <div>4: Affected part(s) rigid</div>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <h4 className="font-semibold mb-1">MMT Scale (0-5):</h4>
            <div className="space-y-1">
              <div>0: No contraction</div>
              <div>1: Flicker or trace of contraction</div>
              <div>2: Active movement, gravity eliminated</div>
              <div>3: Active movement against gravity</div>
              <div>4: Active movement against some resistance</div>
              <div>5: Active movement against full resistance</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📐 Range of Motion Assessment
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

          {/* Body Parts Assessment */}
          <Tabs defaultValue="shoulder" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {BODY_PARTS.map(({ key, label }) => (
                <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
              ))}
            </TabsList>
            
            {BODY_PARTS.map(({ key, label }) => (
              <TabsContent key={key} value={key}>
                {renderBodyPartForm(key, label)}
              </TabsContent>
            ))}
          </Tabs>

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
            {isLoading ? 'Saving...' : 'Save Range of Motion Assessment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
