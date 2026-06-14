import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, User, AlertCircle, Clock } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('loginFailedAttempts') || '0', 10);
  });
  const [cooldownRemaining, setCooldownRemaining] = useState(() => {
    const cooldownUntil = parseInt(localStorage.getItem('loginCooldownUntil') || '0', 10);
    const now = Date.now();
    if (cooldownUntil > now) {
      return Math.ceil((cooldownUntil - now) / 1000);
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('loginFailedAttempts', failedAttempts.toString());
  }, [failedAttempts]);

  useEffect(() => {
    let timer;
    if (cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining(prev => {
          const newRemaining = prev - 1;
          if (newRemaining <= 0) {
            setFailedAttempts(0);
            localStorage.removeItem('loginCooldownUntil');
            localStorage.setItem('loginFailedAttempts', '0');
            return 0;
          }
          return newRemaining;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (cooldownRemaining > 0) {
      toast.error(`Silakan tunggu ${cooldownRemaining} detik lagi.`);
      return;
    }

    setLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        setFailedAttempts(0);
        localStorage.removeItem('loginFailedAttempts');
        localStorage.removeItem('loginCooldownUntil');
        toast.success('Login berhasil!');
        navigate('/dashboard');
      } else {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        if (newFailedAttempts >= 5) {
          setCooldownRemaining(60);
          const cooldownUntil = Date.now() + 60000;
          localStorage.setItem('loginCooldownUntil', cooldownUntil.toString());
          toast.error('Terlalu banyak percobaan gagal. Silakan tunggu 60 detik.');
        } else {
          toast.error(result.message || 'Login gagal');
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = cooldownRemaining > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4">
      <Card className="w-full max-w-md shadow-xl fade-in" data-testid="login-card">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">Weld Planner</CardTitle>
          <CardDescription className="text-base">Sistem Manajemen Material & Estimasi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {isLocked && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 border border-red-200">
                <Clock className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm font-medium">
                  Terlalu banyak percobaan gagal.
                  <br />
                  Silakan tunggu {cooldownRemaining} detik.
                </div>
              </div>
            )}

            {!isLocked && failedAttempts > 0 && failedAttempts < 5 && (
              <div className="bg-orange-50 text-orange-600 p-3 rounded-lg flex items-center gap-3 border border-orange-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-sm font-medium">
                  Tinggal {5 - failedAttempts}x percobaan
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  data-testid="username-input"
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 input-focus"
                  required
                  disabled={loading || isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  data-testid="password-input"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 input-focus"
                  required
                  disabled={loading || isLocked}
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full h-11 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 text-white font-medium btn-primary"
              disabled={loading || isLocked}
            >
              {loading ? 'Memproses...' : (isLocked ? 'Terkunci' : 'Masuk')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
