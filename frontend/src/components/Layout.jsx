import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LayoutDashboard, Package, Calculator, FileText, Users, LogOut, User, Menu, X } from 'lucide-react';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Berhasil logout');
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'user'] },
    { path: '/input-barang', icon: Package, label: 'Input Barang', roles: ['admin', 'user'] },
    { path: '/estimasi', icon: Calculator, label: 'Estimasi', roles: ['admin', 'user'] },
    { path: '/penawaran', icon: FileText, label: 'Penawaran', roles: ['admin', 'user'] },
    { path: '/users', icon: Users, label: 'User Management', roles: ['admin'] }
  ];

  const userRole = currentUser?.role || 'user';
  
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="layout-container">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">Inventory</span>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`menu-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`sidebar-link flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive(item.path)
                      ? 'bg-sky-50 text-sky-700 border-l-4 border-sky-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside className="fixed inset-y-0 left-0 w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between px-6 mb-8">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <span className="ml-3 text-xl font-bold text-gray-900">Inventory</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <nav className="flex-1 px-4 space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`sidebar-link flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive(item.path)
                          ? 'bg-sky-50 text-sky-700 border-l-4 border-sky-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-button"
            >
              <Menu className="w-6 h-6" />
            </Button>
            
            <div className="flex-1" />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-100" data-testid="user-dropdown-trigger">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 capitalize">{currentUser?.role || 'User'}</p>
                  </div>
                  <Avatar className="w-10 h-10 border-2 border-sky-200">
                    <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-600 text-white font-semibold">
                      {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" data-testid="user-dropdown-menu">
                <DropdownMenuLabel>Informasi Akun</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-2 text-sm">
                  <p className="font-medium text-gray-900">{currentUser?.name}</p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">Role: {currentUser?.role}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" data-testid="user-profile-link">
                  <User className="w-4 h-4 mr-2" />
                  Profil Saya
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
