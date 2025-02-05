// src/components/layout/Sidebar.tsx

import { useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import appIcon from '/src-tauri/icons/Square71x71Logo.png'
import { navigationItems } from '../../constants/networks';

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) => {
  const location = useLocation();

  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <NavLink
        to={item.path}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
          isActive 
            ? 'bg-[color:var(--sol-green)]/20 text-[color:var(--sol-green)] box-shadow-[0_0_10px_var(--sol-green)]' 
            : 'text-[color:var(--sol-green)] hover:bg-[color:var(--sol-card)] hover:text-[color:var(--sol-bright-green)]'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Icon size={20} />
        <span>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-sol-background/90 lg:hidden z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-30
        w-48 bg-sol-background border-r-2 border-b-2 border-sol-green
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-2 border-b-2 border-sol-green">
          <div className="flex items-center gap-2">
            <img src={appIcon} alt="SOLedge Browser" className="w-10 h-10" />
            <span className="font-bold text-lg text-sol-green">SOLedge Browser</span>
          </div>
        </div>
        <nav className="p-2 space-y-1 sol-accent">
          {navigationItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;