"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { ClientDemographics } from '@/lib/types';

interface ClientDemographicsFormProps {
  demographics?: ClientDemographics;
  onSave: (demographics: ClientDemographics) => Promise<void>;
  isLoading?: boolean;
}

export default function ClientDemographicsForm({ 
  demographics, 
  onSave, 
  isLoading = false 
}: ClientDemographicsFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ClientDemographics>(demographics || {
    nationality: '',
    idPassportNumber: '',
    gender: undefined,
    ethnicity: '',
    languagesPreferred: [],
    mainContactEmail: '',
    nextOfKin: {
      name: '',
      relationship: '',
      phoneNumber: ''
    },
    reasonForRehab: '',
    medicalConditionImpact: {
      mobility: false,
      foodIntake: false,
      cognition: false,
      selfCare: false,
      accessToHomeCommunity: false,
      homeSafety: false,
      commuting: false
    },
    hasHelper: false,
    helperStatus: '',
    additionalNotes: ''
  });

  const handleInputChange = (field: keyof ClientDemographics, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextOfKinChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      nextOfKin: {
        ...prev.nextOfKin!,
        [field]: value
      }
    }));
  };

  const handleMedicalImpactChange = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      medicalConditionImpact: {
        ...prev.medicalConditionImpact!,
        [field]: checked
      }
    }));
  };

  const handleLanguageChange = (languages: string) => {
    const languageArray = languages.split(',').map(lang => lang.trim()).filter(lang => lang);
    setFormData(prev => ({
      ...prev,
      languagesPreferred: languageArray
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSave(formData);
      toast({
        title: "Demographics Updated",
        description: "Client demographics have been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update demographics. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Client Demographics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality || ''}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
                placeholder="e.g., Singaporean"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="idPassportNumber">ID/Passport Number</Label>
              <Input
                id="idPassportNumber"
                value={formData.idPassportNumber || ''}
                onChange={(e) => handleInputChange('idPassportNumber', e.target.value)}
                placeholder="e.g., S2730230J"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select 
                value={formData.gender || ''} 
                onValueChange={(value) => handleInputChange('gender', value as 'Male' | 'Female' | 'Other')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ethnicity">Ethnicity</Label>
              <Input
                id="ethnicity"
                value={formData.ethnicity || ''}
                onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                placeholder="e.g., Indian"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="languages">Languages Preferred (comma-separated)</Label>
              <Input
                id="languages"
                value={formData.languagesPreferred?.join(', ') || ''}
                onChange={(e) => handleLanguageChange(e.target.value)}
                placeholder="e.g., English, Tamil, Hindi"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mainContactEmail">Main Contact Email</Label>
              <Input
                id="mainContactEmail"
                type="email"
                value={formData.mainContactEmail || ''}
                onChange={(e) => handleInputChange('mainContactEmail', e.target.value)}
                placeholder="e.g., contact@example.com"
              />
            </div>
          </div>

          {/* Next of Kin Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Next of Kin / Main Contact Person</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextOfKinName">Name</Label>
                <Input
                  id="nextOfKinName"
                  value={formData.nextOfKin?.name || ''}
                  onChange={(e) => handleNextOfKinChange('name', e.target.value)}
                  placeholder="e.g., Gayatri Singh"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={formData.nextOfKin?.relationship || ''}
                  onChange={(e) => handleNextOfKinChange('relationship', e.target.value)}
                  placeholder="e.g., Daughter"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nextOfKinPhone">Phone Number</Label>
                <Input
                  id="nextOfKinPhone"
                  value={formData.nextOfKin?.phoneNumber || ''}
                  onChange={(e) => handleNextOfKinChange('phoneNumber', e.target.value)}
                  placeholder="e.g., 82336907"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Medical Information</h3>
            <div className="space-y-2">
              <Label htmlFor="reasonForRehab">Reason for Seeking Rehab Therapy</Label>
              <Input
                id="reasonForRehab"
                value={formData.reasonForRehab || ''}
                onChange={(e) => handleInputChange('reasonForRehab', e.target.value)}
                placeholder="e.g., Chronic Condition Management"
              />
            </div>
          </div>

          {/* Medical Condition Impact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How is Your Medical Condition Impacting You</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'mobility', label: 'Mobility' },
                { key: 'foodIntake', label: 'Food Intake' },
                { key: 'cognition', label: 'Cognition' },
                { key: 'selfCare', label: 'Self Care (Bathing, Dressing, etc)' },
                { key: 'accessToHomeCommunity', label: 'Access To Home / Community' },
                { key: 'homeSafety', label: 'Home Safety' },
                { key: 'commuting', label: 'Commuting' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={formData.medicalConditionImpact?.[key as keyof typeof formData.medicalConditionImpact] || false}
                    onCheckedChange={(checked) => handleMedicalImpactChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className="text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Helper Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Helper / Caregiver Information</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasHelper"
                checked={formData.hasHelper || false}
                onCheckedChange={(checked) => handleInputChange('hasHelper', checked)}
              />
              <Label htmlFor="hasHelper">Do You Have A Helper / Caregiver?</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="helperStatus">Helper Status</Label>
              <Input
                id="helperStatus"
                value={formData.helperStatus || ''}
                onChange={(e) => handleInputChange('helperStatus', e.target.value)}
                placeholder="e.g., No, but to hire one soon"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes || ''}
              onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Saving...' : 'Save Demographics'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
