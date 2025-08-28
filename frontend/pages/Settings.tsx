import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Bell, Shield, Palette, Save, Camera, Upload, Eye, EyeOff } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { getAuthenticatedClient } from '../lib/client';
import { supabase } from '../lib/supabase';
import React from 'react';

export default function Settings() {
  const { currentUser } = useUser();
  const { token } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    department: currentUser?.department || '',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    requestUpdates: true,
    reminderNotifications: true,
    weeklyReports: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    confirmCurrentPassword: '',
    newPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    confirmCurrent: false,
    new: false,
  });

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => {
      if (!token) return null;
      const client = getAuthenticatedClient(token);
      return client.leave.listEmployees();
    },
    enabled: currentUser?.role === 'hr' && !!token,
  });

  const { data: userPreferences } = useQuery({
    queryKey: ['user-preferences', currentUser?.id],
    queryFn: () => {
      if (!token || !currentUser?.id) return null;
      const client = getAuthenticatedClient(token);
      return client.leave.getUserPreferences({});
    },
    enabled: !!token && !!currentUser?.id,
  });

  // Update notifications state when preferences are loaded
  React.useEffect(() => {
    if (userPreferences) {
      setNotifications({
        emailNotifications: userPreferences.emailNotifications,
        requestUpdates: userPreferences.requestUpdates,
        reminderNotifications: userPreferences.reminderNotifications,
        weeklyReports: userPreferences.weeklyReports,
      });
    }
  }, [userPreferences]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { id: number; name?: string; department?: string; profileImageUrl?: string }) => {
      if (!token) throw new Error('No authentication token');
      const client = getAuthenticatedClient(token);
      return client.leave.updateEmployeeProfile({ 
        id: data.id,
        name: data.name, 
        department: data.department, 
        profileImageUrl: data.profileImageUrl 
      });
    },
    onSuccess: (updatedEmployee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Update the current user in the auth context would be ideal here
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: (data: any) => {
      if (!token) throw new Error('No authentication token');
      const client = getAuthenticatedClient(token);
      return client.storage.uploadProfileImage(data);
    },
    onSuccess: async (response: { imageUrl: string }) => {
      if (currentUser) {
        await updateProfileMutation.mutateAsync({
          id: currentUser.id,
          profileImageUrl: response.imageUrl,
        });
      }
    },
    onError: (error) => {
      console.error('Failed to upload image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    },
  });

  const departments = [...new Set(employees?.employees.map((e: any) => e.department) || [])];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;

    updateProfileMutation.mutate({
      id: currentUser.id,
      name: profileData.name,
      department: profileData.department,
    });
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser?.email || '',
        password: data.currentPassword,
      });
      
      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        throw updateError;
      }
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        confirmCurrentPassword: '',
        newPassword: '',
      });
      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Failed to change password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  const handleChangePassword = () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast({
        title: 'Error',
        description: 'Please enter your current password',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.currentPassword !== passwordData.confirmCurrentPassword) {
      toast({
        title: 'Error',
        description: 'Current passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordData.newPassword) {
      toast({
        title: 'Error',
        description: 'Please enter a new password',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: { emailNotifications?: boolean; requestUpdates?: boolean; reminderNotifications?: boolean; weeklyReports?: boolean }) => {
      if (!token) throw new Error('No authentication token');
      const client = getAuthenticatedClient(token);
      return client.leave.updateUserPreferences(preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    },
    onError: (error: any) => {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      });
    },
  });

  const handleSaveNotifications = () => {
    updatePreferencesMutation.mutate(notifications);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select a valid image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const base64String = base64Data.split(',')[1]; // Remove data:image/...;base64, prefix

        await uploadImageMutation.mutateAsync({
          employeeId: currentUser.id,
          filename: file.name,
          fileData: base64String,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={currentUser?.profileImageUrl} />
                    <AvatarFallback className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 text-xl">
                      {currentUser?.name ? getInitials(currentUser.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2">
                    <label htmlFor="profile-image" className="cursor-pointer">
                      <div className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-colors">
                        <Camera className="h-4 w-4" />
                      </div>
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">Profile Picture</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Click the camera icon to upload a new profile picture
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    JPG, PNG, GIF up to 5MB
                  </p>
                  {isUploadingImage && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Uploading...
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={profileData.department} onValueChange={(value) => setProfileData(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Current Role</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{currentUser?.role}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Contact HR to change your role or reporting structure
                </p>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                className="w-full sm:w-auto"
                disabled={updateProfileMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Request Updates</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get notified when your leave requests are approved or rejected
                  </p>
                </div>
                <Switch
                  checked={notifications.requestUpdates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, requestUpdates: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reminder Notifications</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive reminders about upcoming leave and deadlines
                  </p>
                </div>
                <Switch
                  checked={notifications.reminderNotifications}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, reminderNotifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive weekly summaries of your leave balance and usage
                  </p>
                </div>
                <Switch
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReports: checked }))}
                />
              </div>

              <Button 
                onClick={handleSaveNotifications} 
                className="w-full sm:w-auto"
                disabled={updatePreferencesMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Theme</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Choose your preferred theme for the application
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      theme === 'light' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-white border border-gray-300 rounded-full"></div>
                      <div>
                        <p className="font-medium">Light Mode</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Clean and bright interface</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      theme === 'dark' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-gray-800 border border-gray-600 rounded-full"></div>
                      <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Easy on the eyes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Password</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Change your account password
                </p>
                <div className="space-y-8 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="current-password" 
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-current-password">Confirm Current Password</Label>
                    <div className="relative">
                      <Input 
                        id="confirm-current-password" 
                        type={showPasswords.confirmCurrent ? "text" : "password"}
                        value={passwordData.confirmCurrentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmCurrentPassword: e.target.value }))}
                        placeholder="Confirm current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirmCurrent: !prev.confirmCurrent }))}
                      >
                        {showPasswords.confirmCurrent ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input 
                        id="new-password" 
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password (min 6 characters)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full sm:w-auto"
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-medium">Account Information</Label>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee ID</span>
                    <span className="text-sm font-medium">{currentUser?.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Account Created</span>
                    <span className="text-sm font-medium">
                      {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Login</span>
                    <span className="text-sm font-medium">Today</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}