import { Navigate, Outlet, NavLink } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { Package, PlusCircle, LogOut, User, ClipboardList, Settings, Menu, X, Tag, Briefcase } from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, isAdmin } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const navLinks = [
    { to: "/admin", icon: <Package size={18} />, label: "Manage Products", end: true },
    { to: "/admin/categories", icon: <Tag size={18} />, label: "Manage Categories" },
    { to: "/admin/brands", icon: <Briefcase size={18} />, label: "Manage Brands" },
    { to: "/admin/orders", icon: <ClipboardList size={18} />, label: "Customer Orders" },
    { to: "/admin/new", icon: <PlusCircle size={18} />, label: "Add Product" },
    { to: "/admin/settings", icon: <Settings size={18} />, label: "Site Settings" },
    { to: "/profile", icon: <User size={18} />, label: "My Profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans">
      
      {/* Mobile Header Toggle */}
      <div className="md:hidden bg-zeal-dark text-white p-4 flex justify-between items-center z-20 shadow-md">
        <div>
          <h2 className="font-display font-black text-lg uppercase tracking-widest text-white">
            Admin <span className="text-zeal-red">Panel</span>
          </h2>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-300 hover:text-white">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen md:h-auto z-50 w-64 bg-zeal-dark border-r border-gray-800 shadow-2xl md:shadow-none
        transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Header inside sidebar (visible on both mobile and desktop) */}
        <div className="p-6 flex justify-between items-start border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="font-display font-black text-2xl uppercase tracking-widest text-white mb-1">
              Admin <span className="text-zeal-red">Panel</span>
            </h2>
            <p className="text-xs font-medium text-gray-400 break-all">{user.email}</p>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="md:hidden text-gray-400 hover:text-white p-1"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-sm text-sm uppercase tracking-wider font-bold transition-all
                ${isActive 
                  ? 'bg-zeal-red text-white shadow-md' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
              `}
            >
              {link.icon} {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={async () => {
              await signOut(auth);
              toast.success('Signed out successfully');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-sm uppercase tracking-wider font-bold bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full md:max-w-[calc(100vw-16rem)] p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
