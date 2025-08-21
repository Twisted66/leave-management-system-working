import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, User, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Login() {
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    department: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(loginData.email, loginData.password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        department: registerData.department,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to your account or create a new one</p>
        </div>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-0">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <LogIn className="h-5 w-5" />
                    Sign In
                  </CardTitle>
                </CardHeader>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email" className="text-gray-900 dark:text-white">Email</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="text-gray-900 dark:text-white">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter your password"
                        className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                      <AlertDescription className="text-red-700 dark:text-red-300">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="p-6">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <UserPlus className="h-5 w-5" />
                    Create Account
                  </CardTitle>
                </CardHeader>
                
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name" className="text-gray-900 dark:text-white">Full Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-email" className="text-gray-900 dark:text-white">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-department" className="text-gray-900 dark:text-white">Department</Label>
                    <Input
                      id="register-department"
                      type="text"
                      value={registerData.department}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Enter your department"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-password" className="text-gray-900 dark:text-white">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a password"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Minimum 8 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="register-confirm-password" className="text-gray-900 dark:text-white">Confirm Password</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your password"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                      minLength={8}
                    />
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                      <AlertDescription className="text-red-700 dark:text-red-300">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
