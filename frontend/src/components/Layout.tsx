import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-white text-xl font-bold">
                  Der-Mag Platform
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/dashboard')
                      ? 'border-white text-white'
                      : 'border-transparent text-indigo-100 hover:border-indigo-300 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/tasks"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/tasks')
                      ? 'border-white text-white'
                      : 'border-transparent text-indigo-100 hover:border-indigo-300 hover:text-white'
                  }`}
                >
                  Zadania
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {user && (
                <div className="flex items-center space-x-4">
                  <div className="text-white text-sm">
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-indigo-200 text-xs">{user.role.name}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800"
                  >
                    Wyloguj
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
