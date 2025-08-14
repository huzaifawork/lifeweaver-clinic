"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllClients, createClient } from '@/lib/firebase/clients';
import { createSession } from '@/lib/firebase/sessions';
import { getAllUsers } from '@/lib/firebase/users';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, User, Phone } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { Client, User as UserType } from '@/lib/types';

export default function NewSessionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    clientPhone: '',
    attendingClinicianId: '',
    dateOfSession: '',
    content: '',
    sessionType: 'therapy',
    duration: '60',
    location: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientsData, usersData] = await Promise.all([
          getAllClients(),
          getAllUsers()
        ]);
        setClients(clientsData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load clients and users. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: clientId,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone || ''
      }));
    } else if (clientId === 'new') {
      // New client selected
      setFormData(prev => ({
        ...prev,
        clientId: 'new',
        clientName: '',
        clientPhone: ''
      }));
    } else {
      // Fallback for other cases
      setFormData(prev => ({
        ...prev,
        clientId: '',
        clientName: clientId,
        clientPhone: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    console.log('User:', user);

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a session",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientName || !formData.dateOfSession) {
      toast({
        title: "Validation Error",
        description: "Please enter client name and date/time",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create or find client by ID or name
      let clientId = '';
      let selectedClient = null;

      if (formData.clientId && formData.clientId !== 'new') {
        // Existing client selected
        selectedClient = clients.find(c => c.id === formData.clientId);
        clientId = formData.clientId;
      } else {
        // Check if client exists by name (for new clients or manual entry)
        selectedClient = clients.find(c => c.name.toLowerCase() === formData.clientName.toLowerCase());
        if (selectedClient) {
          clientId = selectedClient.id;
        }
      }

      if (!selectedClient) {
        // Create new client if doesn't exist
        const newClient = {
          name: formData.clientName,
          email: '',
          phone: formData.clientPhone || '',
          dateOfBirth: '',
          address: '',
          emergencyContact: '',
          medicalHistory: '',
          currentMedications: '',
          allergies: '',
          notes: '',
          isActive: true,
          dateAdded: new Date().toISOString(),
          addedByUserId: user.id,
          addedByUserName: user.name
        };

        const createdClient = await createClient(newClient);
        clientId = createdClient.id;
        selectedClient = createdClient;
      }

      // Get selected clinician or default to current user
      const selectedClinician = formData.attendingClinicianId
        ? users.find(u => u.id === formData.attendingClinicianId)
        : user;

      const sessionData = {
        clientId: clientId,
        clientName: formData.clientName,
        attendingClinicianId: selectedClinician?.id || user.id,
        attendingClinicianName: selectedClinician?.name || user.name,
        attendingClinicianVocation: selectedClinician?.vocation || user.vocation || 'Therapist',
        dateOfSession: new Date(formData.dateOfSession).toISOString(),
        content: formData.content,
        sessionType: formData.sessionType,
        duration: parseInt(formData.duration),
        location: formData.location,
        createdByUserId: user.id,
        createdByUserName: user.name,
        attachments: []
      };

      console.log('Creating session with data:', sessionData);
      const newSession = await createSession(sessionData);
      console.log('Session created successfully:', newSession);

      toast({
        title: "Success",
        description: `Session created successfully for ${formData.clientName}!`,
      });

      // Redirect to sessions page which will show the new session
      router.push('/sessions');
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">New Session</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  <User className="inline mr-2 h-4 w-4" />
                  Client Name
                </Label>
                <Select
                  value={formData.clientId || formData.clientName}
                  onValueChange={handleClientSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing client or type new name" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.phone && `(${client.phone})`}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Add New Client</SelectItem>
                  </SelectContent>
                </Select>
                {(!formData.clientId || formData.clientId === 'new') && (
                  <Input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Enter new client name"
                    className="mt-2"
                    required
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">
                  <Phone className="inline mr-2 h-4 w-4" />
                  Client Phone
                </Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="Enter client phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendingClinician">Attending Clinician</Label>
                <Select
                  value={formData.attendingClinicianId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, attendingClinicianId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select clinician (default: you)" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(u => u.role === 'Clinician' || u.role === 'Admin')
                      .map((clinician) => (
                        <SelectItem key={clinician.id} value={clinician.id}>
                          {clinician.name} ({clinician.vocation || 'Therapist'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfSession">Date & Time</Label>
                <Input
                  id="dateOfSession"
                  type="datetime-local"
                  value={formData.dateOfSession}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfSession: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type</Label>
                <Select 
                  value={formData.sessionType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="therapy">Therapy</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  min="15"
                  max="180"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Therapy Room A, Online, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Session Notes</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter session notes and observations..."
                rows={6}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Creating...' : 'Create Session'}
              </Button>
              <Link href="/sessions">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
