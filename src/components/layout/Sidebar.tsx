// src/components/layout/Sidebar.tsx

import { useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { Wallet as WalletIcon } from 'lucide-react';
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
            ? 'bg-[#39ff14]/20 text-[#39ff14]' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-[#39ff14]'
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
          className="fixed inset-0 bg-black/50 lg:hidden z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-30
        w-64 bg-[#0a0a0a] border-r-2 border-[#39ff14]
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b-2 border-[#39ff14]">
          <div className="flex items-center gap-2">
            <WalletIcon className="text-[#39ff14]" />
            <span className="font-bold text-lg text-[#39ff14]">SOLedge Trading</span>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;