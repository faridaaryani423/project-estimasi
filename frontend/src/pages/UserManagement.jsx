import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Shield, User as UserIcon, Loader2, Key, UserPlus } from 'lucide-react';
import { usersAPI } from '@/services/api';

const UserManagement = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'user',
  });

  const loadUsers = useCallback(async () => {
    if (!isAdmin()) return;
    try {
      setLoading(true);
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      toast.error('Gagal memuat data user: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin()) {
      toast.error('Akses ditolak! Hanya admin yang bisa mengakses halaman ini.');
      return;
    }
    loadUsers();
  }, [isAdmin, loadUsers]);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      toast.error('Password minimal 4 karakter!');
      return;
    }

    try {
      setSaving(true);
      await usersAPI.updatePassword(selectedUser.id, newPassword);
      toast.success(`Password ${selectedUser.username} berhasil diubah!`);
      setDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error('Gagal mengubah password: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name || !newUser.email) {
      toast.error('Semua field wajib diisi!');
      return;
    }

    if (newUser.password.length < 4) {
      toast.error('Password minimal 4 karakter!');
      return;
    }

    try {
      setSaving(true);
      await usersAPI.create(newUser);
      toast.success('User baru berhasil ditambahkan!');
      setCreateDialogOpen(false);
      setNewUser({ username: '', password: '', name: '', email: '', role: 'user' });
      await loadUsers();
    } catch (error) {
      toast.error('Gagal menambah user: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openChangePasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setDialogOpen(true);
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-600">Akses ditolak. Hanya admin yang bisa mengakses halaman ini.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-base text-gray-600">Kelola user, role, dan akses sistem</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-to-r from-sky-600 to-cyan-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Daftar User
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span className="ml-2 text-gray-600">Memuat data...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3 inline mr-1" /> : <UserIcon className="w-3 h-3 inline mr-1" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openChangePasswordDialog(user)}
                        className="hover:bg-blue-50 hover:text-blue-600"
                        title="Ubah Password"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Password - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password Baru *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleChangePassword} disabled={saving} className="bg-gradient-to-r from-sky-600 to-cyan-600">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Masukkan username"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Masukkan password"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Masukkan nama"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Masukkan email"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleCreateUser} disabled={saving} className="bg-gradient-to-r from-sky-600 to-cyan-600">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
