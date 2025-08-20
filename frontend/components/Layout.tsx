import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  FileText, 
  BarChart3, 
  Users, 
  Menu,
  User,
  Settings,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'My Requests', href: '/my-requests', icon: FileText },
  { name: 'Leave Requests', href: '/leave-requests', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentUser } = useUser();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/leave-requests' && currentUser?.role === 'employee') {
      return false;
    }
    if (item.href === '/reports' && currentUser?.role === 'employee') {
      return false;
    }
    if (item.href === '/employees' && currentUser?.role === 'employee') {
      return false;
    }
    return true;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const NavItems = () => (
    <>
      {filteredNavigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === item.href
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 pb-4 shadow-sm border-r dark:border-gray-700">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">Leave Management</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="flex-shrink-0"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  <NavItems />
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={currentUser?.profileImageUrl} />
                    <AvatarFallback className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                      {currentUser?.name ? getInitials(currentUser.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{currentUser?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{currentUser?.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="flex-shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 dark:bg-gray-800">
            <div className="flex h-16 shrink-0 items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">Leave Management</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="flex-shrink-0"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            <nav className="flex flex-1 flex-col mt-6">
              <ul role="list" className="space-y-1">
                <NavItems />
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="flex-shrink-0"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={currentUser?.profileImageUrl} />
                <AvatarFallback className="bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                  {currentUser?.name ? getInitials(currentUser.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{currentUser?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
