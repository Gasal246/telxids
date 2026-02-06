import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Database, Cpu, Package, Search as SearchIcon } from 'lucide-react';
import ExportCart from './ExportCart';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { href: '/categories', icon: Database, label: 'Categories' },
    { href: '/chipsets', icon: Cpu, label: 'Chipsets' },
    { href: '/models', icon: Package, label: 'Models' },
    { href: '/search', icon: SearchIcon, label: 'Search' },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6">
          <h1 className="text-xl font-bold text-sidebar-foreground">TelX ID Manager</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Manage Serial & MAC IDs</p>
        </div>
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>

      {/* Export Cart */}
      <ExportCart />
    </div>
  );
};

export default Layout;
