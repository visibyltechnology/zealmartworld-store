import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useAuthStore from '../store/useAuthStore';
import useCartStore from '../store/useCartStore';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';

export default function Navbar() {
    const [search, setSearch] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [tickerText, setTickerText] = useState('⚡ Best Deals on Electronics & Home Appliances — Limited Offers, Shop Now! 🚚 Enjoy Fast Delivery Across Lagos — Free Shipping on Orders From ₦999,999.99!');
    const { user, isAdmin, logout } = useAuthStore();
    const { getTotalItems } = useCartStore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'site_settings');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().tickerMessages) {
                    // Join multiple messages with spaces
                    setTickerText(docSnap.data().tickerMessages.join('     |     '));
                }
            } catch (error) {
                console.error("Error fetching ticker settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) navigate(`/products?search=${encodeURIComponent(search)}`);
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Signed out successfully');
    };

    return (
        <header className="bg-white relative z-50">
            {/* Animated Ticker Tape */}
            <div className="bg-zeal-red text-white py-1 overflow-hidden whitespace-nowrap relative flex items-center">
                <div className="animate-marquee inline-block font-bold text-xs uppercase tracking-widest whitespace-nowrap">
                    {tickerText} &nbsp;&nbsp;&nbsp;&nbsp; {tickerText}
                </div>
            </div>

            {/* Top Info Bar */}
            <div className="bg-zeal-gray border-b border-gray-200 py-1.5 hidden md:block">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-[11px] text-gray-600 font-medium">
                    <div className="flex space-x-6">
                        <span><i className="fas fa-phone text-zeal-red mr-1"></i> +234 800 123 4567</span>
                        <span><i className="fas fa-envelope text-zeal-red mr-1"></i> sales@zealmart.com</span>
                    </div>
                    <div className="flex space-x-6">
                        <span><i className="fas fa-truck text-zeal-red mr-1"></i> Nationwide Delivery</span>
                        <span><i className="fas fa-shield-alt text-zeal-red mr-1"></i> 100% Authentic Brands</span>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                <div className="flex items-center justify-between gap-6">
                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0">
                        <div className="font-display text-3xl font-black tracking-tighter hover:scale-105 transition-transform duration-300">
                            <span className="text-zeal-blue">ZEAL</span><span className="text-zeal-red">MART</span>
                        </div>
                    </Link>

                    {/* Search Bar - Desktop */}
                    <div className="hidden md:block flex-1 max-w-2xl">
                        <form onSubmit={handleSearch} className="flex w-full border-2 border-zeal-blue rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                            <input 
                                type="text" 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full py-2.5 px-4 outline-none text-sm text-gray-800 placeholder-gray-400" 
                                placeholder="Search for TVs, Air Conditioners, Laptops, Generators..." 
                            />
                            <button type="submit" className="bg-zeal-blue text-white px-8 font-bold hover:bg-blue-900 transition flex items-center justify-center">
                                SEARCH
                            </button>
                        </form>
                    </div>

                    {/* Actions - Desktop */}
                    <div className="hidden md:flex items-center gap-6">
                        {user && (
                            <NotificationBell userId={user.uid} />
                        )}
                        {user ? (
                            <div className="flex items-center gap-4">
                                <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-zeal-red transition group">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 group-hover:border-zeal-red transition-all duration-300 group-hover:-translate-y-1">
                                        <i className="fas fa-user text-lg"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] text-gray-500 font-bold uppercase">Account</span>
                                        <span className="text-sm font-bold">Hi, {user.email?.split('@')[0] || 'User'}</span>
                                    </div>
                                </Link>
                                {isAdmin && (
                                    <Link to="/admin" className="text-sm font-bold text-zeal-blue hover:text-zeal-red transition-colors"><i className="fas fa-cog"></i> Admin</Link>
                                )}
                                <button onClick={handleLogout} className="text-sm font-bold text-gray-500 hover:text-zeal-red transition-colors">Logout</button>
                            </div>
                        ) : (
                            <Link to="/login" className="flex items-center gap-2 text-gray-700 hover:text-zeal-red transition group">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 group-hover:border-zeal-red transition-all duration-300 group-hover:-translate-y-1">
                                    <i className="fas fa-user text-lg"></i>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-gray-500 font-bold uppercase">Sign In</span>
                                    <span className="text-sm font-bold">Account</span>
                                </div>
                            </Link>
                        )}

                        {!isAdmin && (
                        <Link to="/cart" className="flex items-center gap-2 text-gray-700 hover:text-zeal-red transition group">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 group-hover:border-zeal-red transition-all duration-300 group-hover:-translate-y-1">
                                    <i className="fas fa-shopping-cart text-lg"></i>
                                </div>
                                <span className="absolute -top-1 -right-1 bg-zeal-red text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {getTotalItems()}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] text-gray-500 font-bold uppercase">My Cart</span>
                                <span className="text-sm font-bold">₦0.00</span>
                            </div>
                        </Link>
                        )}

                    </div>

                    {/* Mobile Toggles */}
                    <div className="flex md:hidden items-center gap-4">
                        {user && !isAdmin && (
                            <NotificationBell userId={user.uid} isMobile={true} />
                        )}
                        {!isAdmin && (
                        <Link to="/cart" className="relative text-gray-800">
                            <i className="fas fa-shopping-cart text-2xl"></i>
                            <span className="absolute -top-2 -right-2 bg-zeal-red text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                                {getTotalItems()}
                            </span>
                        </Link>
                        )}
                        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-800 text-2xl">
                            <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`}></i>
                        </button>
                    </div>
                </div>

                {/* Mobile Search */}
                <div className="mt-4 md:hidden">
                    <form onSubmit={handleSearch} className="flex w-full border-2 border-zeal-blue rounded overflow-hidden">
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full py-2.5 px-3 outline-none text-sm" 
                            placeholder="Search products..." 
                        />
                        <button type="submit" className="bg-zeal-blue text-white px-5 font-bold">
                            <i className="fas fa-search"></i>
                        </button>
                    </form>
                </div>
            </div>

            {/* Navigation Categories */}
            <div className="bg-zeal-blue text-white shadow-md relative z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex md:space-x-8 overflow-x-auto whitespace-nowrap hide-scrollbar">
                        <Link to="/products" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide flex items-center uppercase transition-all">
                            <i className="fas fa-list mr-2"></i> All Categories
                        </Link>
                        <Link to="/products?cat=Air%20Conditioners" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide uppercase transition-all">Air Conditioners</Link>
                        <Link to="/products?cat=Televisions" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide uppercase transition-all">Televisions</Link>
                        <Link to="/products?cat=Refrigerators" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide uppercase transition-all">Refrigerators</Link>
                        <Link to="/products?cat=Generators" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide uppercase transition-all">Generators</Link>
                        <Link to="/products?cat=Washing%20Machines" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide uppercase transition-all">Washing Machines</Link>
                        <Link to="/products?cat=Phones" className="py-3 px-2 border-b-2 border-transparent hover:border-zeal-red font-bold text-sm tracking-wide uppercase transition-all">Phones & Tablets</Link>
                        
                        <Link to="/products" className="py-3 px-2 ml-auto text-yellow-400 hover:text-white font-black text-sm tracking-wide flex items-center uppercase transition-all group">
                            <i className="fas fa-fire mr-1 group-hover:animate-bounce"></i> Hot Deals
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileOpen && (
                <div className="md:hidden bg-white border-b shadow-lg absolute left-0 right-0 top-full w-full z-[9999]" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                    <div className="p-4 flex flex-col gap-4">
                        {/* User Account Section */}
                        <div className="pb-4 border-b border-gray-100">
                            {user ? (
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                        <i className="fas fa-user text-lg"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">Account</span>
                                        <span className="text-sm font-bold">Hi, {user.email?.split('@')[0] || 'User'}</span>
                                    </div>
                                </div>
                            ) : null}
                            
                            <div className="grid grid-cols-2 gap-3">
                                {user ? (
                                    <>
                                        <Link to="/profile" className="text-center border-2 border-zeal-blue text-zeal-blue py-2.5 rounded font-bold text-sm" onClick={() => setMobileOpen(false)}>Account</Link>
                                        {isAdmin && (
                                            <Link to="/admin" className="text-center bg-zeal-blue text-white py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1" onClick={() => setMobileOpen(false)}>
                                                <i className="fas fa-cog"></i> Admin
                                            </Link>
                                        )}
                                        {!isAdmin && (
                                            <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-center bg-zeal-red text-white py-2.5 rounded font-bold text-sm">Logout</button>
                                        )}
                                        {isAdmin && (
                                            <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="col-span-2 text-center bg-zeal-red text-white py-2.5 rounded font-bold text-sm">Logout</button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="text-center border-2 border-zeal-blue text-zeal-blue py-2.5 rounded font-bold" onClick={() => setMobileOpen(false)}>Login</Link>
                                        <Link to="/register" className="text-center bg-zeal-red text-white py-2.5 rounded font-bold" onClick={() => setMobileOpen(false)}>Register</Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Cart Section */}
                        {!isAdmin && (
                        <Link to="/cart" className="flex items-center gap-3 border-b border-gray-100 pb-4" onClick={() => setMobileOpen(false)}>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                    <i className="fas fa-shopping-cart text-lg"></i>
                                </div>
                                <span className="absolute -top-1 -right-1 bg-zeal-red text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {getTotalItems()}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">My Cart</span>
                                <span className="text-sm font-bold">₦0.00</span>
                            </div>
                        </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
