"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/firebase/clients';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    nationality: '',
    idNumber: '',
    gender: '',
    ethnicity: '',
    languages: '',
    nextOfKinName: '',
    nextOfKinRelationship: '',
    nextOfKinPhone: '',
    nextOfKinEmail: '',
    reasonForTherapy: '',
    helperStatus: '',
    additionalNotes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a client.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Client name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const clientData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality.trim(),
        idNumber: formData.idNumber.trim(),
        gender: formData.gender,
        ethnicity: formData.ethnicity.trim(),
        languages: formData.languages.split(',').map(lang => lang.trim()).filter(lang => lang),
        nextOfKin: {
          name: formData.nextOfKinName.trim(),
          relationship: formData.nextOfKinRelationship.trim(),
          phone: formData.nextOfKinPhone.trim(),
          email: formData.nextOfKinEmail.trim()
        },
        reasonForTherapy: formData.reasonForTherapy.trim(),
        medicalImpacts: {
          mobility: false,
          foodIntake: false,
          cognition: false,
          selfCare: false,
          accessToHomeCommunity: false,
          homeSafety: false,
          commuting: false
        },
        helperStatus: formData.helperStatus.trim(),
        additionalNotes: formData.additionalNotes.trim(),
        assignedTeamMembers: [],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newClient = await createClient(clientData);
      
      toast({
        title: "Success",
        description: "Client has been created successfully.",
      });

      // Redirect to the new client's detail page
      router.push(`/clients/${newClient.id}`);
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add New Client</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="idNumber">ID/Passport Number</Label>
                <Input
                  id="idNumber"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Input
                  id="ethnicity"
                  name="ethnicity"
                  value={formData.ethnicity}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                name="languages"
                value={formData.languages}
                onChange={handleInputChange}
                placeholder="e.g., English, Tamil, Hindi"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next of Kin Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nextOfKinName">Name</Label>
                <Input
                  id="nextOfKinName"
                  name="nextOfKinName"
                  value={formData.nextOfKinName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="nextOfKinRelationship">Relationship</Label>
                <Input
                  id="nextOfKinRelationship"
                  name="nextOfKinRelationship"
                  value={formData.nextOfKinRelationship}
                  onChange={handleInputChange}
                  placeholder="e.g., Daughter, Son, Spouse"
                />
              </div>
              <div>
                <Label htmlFor="nextOfKinPhone">Phone</Label>
                <Input
                  id="nextOfKinPhone"
                  name="nextOfKinPhone"
                  value={formData.nextOfKinPhone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="nextOfKinEmail">Email</Label>
                <Input
                  id="nextOfKinEmail"
                  name="nextOfKinEmail"
                  type="email"
                  value={formData.nextOfKinEmail}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reasonForTherapy">Reason for Therapy</Label>
              <Input
                id="reasonForTherapy"
                name="reasonForTherapy"
                value={formData.reasonForTherapy}
                onChange={handleInputChange}
                placeholder="e.g., Chronic Condition Management"
              />
            </div>
            
            <div>
              <Label htmlFor="helperStatus">Helper/Caregiver Status</Label>
              <Input
                id="helperStatus"
                name="helperStatus"
                value={formData.helperStatus}
                onChange={handleInputChange}
                placeholder="e.g., No but to hire one soon"
              />
            </div>
            
            <div>
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any additional medical or personal notes..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Client
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
