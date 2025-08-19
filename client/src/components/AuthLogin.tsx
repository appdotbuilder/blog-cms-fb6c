import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/App';

function AuthLogin() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@example.com"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, email: e.target.value }))
          }
          required
          className="transition-all focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, password: e.target.value }))
          }
          required
          className="transition-all focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-indigo-600 hover:bg-indigo-700" 
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Signing In...
          </div>
        ) : (
          '🔑 Sign In'
        )}
      </Button>

      <div className="text-center text-sm text-gray-500 mt-4">
        <p>Demo Credentials:</p>
        <p className="text-xs bg-gray-100 p-2 rounded mt-2">
          Email: admin@blogcms.com<br />
          Password: any password
        </p>
      </div>
    </form>
  );
}

export default AuthLogin;