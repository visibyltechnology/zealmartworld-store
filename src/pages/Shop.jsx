import { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Footer from '../components/Footer';
import { isProductInStock, getStockDisplayText } from '../utils/inventoryService';
import { listenToCategories, DEFAULT_CATEGORIES } from '../utils/categoryService';
import { listenToBrands, DEFAULT_BRANDS } from '../utils/brandService';

function pathToCategory(pathname) {
    if (pathname.includes('phones')) return 'Phones';
    if (pathname.includes('laptops')) return 'Laptops';
    if (pathname.includes('gaming')) return 'Gaming';
    return null;
}

// Helper to clean up messy brand names from the database
function normalizeBrand(brand) {
    if (!brand) return '';
    let b = brand.trim().toLowerCase();
    
    if (b.includes('hisense')) return 'Hisense';
    if (b.includes('tcl')) return 'TCL';
    if (b.includes('lg')) return 'LG';
    if (b.includes('samsung')) return 'Samsung';
    if (b.includes('royal')) return 'Royal';
    if (b.includes('thermocool') || b.includes('haier')) return 'Thermocool';
    if (b.includes('panasonic')) return 'Panasonic';
    if (b.includes('apple') || b.includes('iphone')) return 'Apple';
    if (b.includes('sony')) return 'Sony';
    if (b.includes('hp')) return 'HP';
    
    // Default fallback: Title Case
    return b.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function Shop() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [brands, setBrands] = useState(DEFAULT_BRANDS);

    const urlCat = searchParams.get('cat') || searchParams.get('search') ? null : pathToCategory(location.pathname);
    const initial = categories.find(c => c.name.toLowerCase() === (urlCat || '').toLowerCase())?.name || 'All';

    const [activeCategories, setActiveCategories] = useState([]);
    const [activeBrands, setActiveBrands] = useState([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [condition, setCondition] = useState('All');
    const [activeRam, setActiveRam] = useState('All');
    const [activeStorage, setActiveStorage] = useState('All');
    const [activeOs, setActiveOs] = useState('All');
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('Popularity');

    // Subscribe to real-time categories
    useEffect(() => {
        const unsubscribe = listenToCategories((cats) => {
            setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to real-time brands
    useEffect(() => {
        const unsubscribe = listenToBrands((brandList) => {
            setBrands(brandList.length > 0 ? brandList : DEFAULT_BRANDS);
        });
        return () => unsubscribe();
    }, []);

    // Ensure product has inventory fields
    const ensureInventoryFields = (product) => ({
        ...product,
        inventory_status: product.inventory_status || 'in_stock',
        items_left: product.items_left !== undefined ? product.items_left : 5,
        unlimited_stock: product.unlimited_stock || false,
        is_hidden: product.is_hidden || false
    });

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, 'products'), (snap) => {
            let items = snap.docs.map(d => ensureInventoryFields({ id: d.id, ...d.data() })).filter(p => !p.is_hidden);
            
            if (items.length === 0) {
                items = [
                    { id: '1', name: 'Royal 1.5HP Split Air Conditioner', price: 285000, oldPrice: 310000, category: 'Air Conditioners', img: 'https://images.unsplash.com/photo-1667232231269-b5b50821d3f9?w=500&q=80', tag: 'Awoof', brand: 'Royal', inventory_status: 'in_stock', items_left: 8, unlimited_stock: false, is_hidden: false },
                    { id: '2', name: 'HP Pavilion 15 (16GB RAM, 512GB SSD)', price: 450000, category: 'Laptops', img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80', brand: 'HP', inventory_status: 'out_of_stock', items_left: 0, unlimited_stock: false, is_hidden: false },
                    { id: '3', name: 'Sony PlayStation 5 Console', price: 820000, oldPrice: 850000, category: 'Gaming', img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&q=80', tag: 'Fast Moving', brand: 'Sony', inventory_status: 'in_stock', items_left: 0, unlimited_stock: true, is_hidden: false },
                    { id: '4', name: 'Samsung 65" Class CU7000 Crystal UHD 4K TV', price: 650000, category: 'Televisions', img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80', brand: 'Samsung', inventory_status: 'in_stock', items_left: 5, unlimited_stock: false, is_hidden: false },
                    { id: '5', name: 'Thermocool 3.5kVA Generator (Igwe)', price: 420000, category: 'Generators', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80', tag: 'Best Seller', brand: 'Thermocool', inventory_status: 'in_stock', items_left: 0, unlimited_stock: true, is_hidden: false },
                    { id: '6', name: 'Panasonic Top Load Washing Machine 10kg', price: 345000, category: 'Washing Machines', img: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&q=80', brand: 'Panasonic', inventory_status: 'in_stock', items_left: 6, unlimited_stock: false, is_hidden: false },
                    { id: '7', name: 'iPhone 15 Pro Max 256GB', price: 1850000, oldPrice: 2000000, category: 'Phones', img: 'https://images.unsplash.com/photo-1696446701796-da6122569f74?w=500&q=80', brand: 'Apple', inventory_status: 'in_stock', items_left: 0, unlimited_stock: true, is_hidden: false },
                    { id: '8', name: 'Hisense 205L Double Door Refrigerator', price: 215000, category: 'Refrigerators', img: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=500&q=80', brand: 'Hisense', inventory_status: 'in_stock', items_left: 7, unlimited_stock: false, is_hidden: false }
                ];
            } else {
                items = items.map(ensureInventoryFields);
            }
            setProducts(items);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching products:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const cat = searchParams.get('cat') || pathToCategory(location.pathname);
        if (cat) {
            const match = categories.find(c => c.name.toLowerCase() === cat.toLowerCase())?.name;
            setActiveCategories(match ? [match] : []);
            setSearch('');
            setActiveBrands([]);
            setMinPrice('');
            setMaxPrice('');
            setCondition('All');
            setActiveRam('All');
            setActiveStorage('All');
            setActiveOs('All');
        }
        
        const searchQ = searchParams.get('search');
        if (searchQ) {
            setSearch(searchQ);
            setActiveCategories([]);
            setActiveBrands([]);
            setMinPrice('');
            setMaxPrice('');
            setCondition('All');
            setActiveRam('All');
            setActiveStorage('All');
            setActiveOs('All');
        }
    }, [location.search, location.pathname, searchParams, categories]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, activeCategories, activeBrands, minPrice, maxPrice, condition, activeRam, activeStorage, activeOs]);

    const filtered = products.filter(p => {
        const matchCat = activeCategories.length === 0 || activeCategories.includes(p.category);
        const normalizedBrand = normalizeBrand(p.brand);
        const matchBrand = activeBrands.length === 0 || activeBrands.includes(normalizedBrand);
        
        const searchLower = search.toLowerCase();
        const matchSearch = (p.name || '').toLowerCase().includes(searchLower) ||
                            normalizedBrand.toLowerCase().includes(searchLower) ||
                            (p.category || '').toLowerCase().includes(searchLower) ||
                            (p.tag || '').toLowerCase().includes(searchLower) ||
                            (p.description || '').toLowerCase().includes(searchLower) ||
                            (p.ram || '').toLowerCase().includes(searchLower) ||
                            (p.storage || '').toLowerCase().includes(searchLower) ||
                            (p.os || '').toLowerCase().includes(searchLower) ||
                            (p.condition || '').toLowerCase().includes(searchLower);
                            
        const pPrice = Number(p.price) || 0;
        const matchMinPrice = minPrice === '' || pPrice >= Number(minPrice);
        const matchMaxPrice = maxPrice === '' || pPrice <= Number(maxPrice);
        
        const matchCondition = condition === 'All' || p.condition === condition || (p.name && p.name.includes(condition)) || (p.description && p.description.includes(condition));
        
        const matchRam = activeRam === 'All' || p.ram === activeRam || (p.name && p.name.includes(activeRam)) || (p.description && p.description.includes(activeRam));
        const matchStorage = activeStorage === 'All' || p.storage === activeStorage || (p.name && p.name.includes(activeStorage)) || (p.description && p.description.includes(activeStorage));
        const matchOs = activeOs === 'All' || p.os === activeOs || (p.name && p.name.includes(activeOs)) || (p.description && p.description.includes(activeOs));
        
        return matchCat && matchBrand && matchSearch && matchMinPrice && matchMaxPrice && matchCondition && matchRam && matchStorage && matchOs;
    });

    // Sort filtered items based on sortBy selection
    const sorted = [...filtered].sort((a, b) => {
        switch(sortBy) {
            case 'Price: Low to High':
                return (Number(a.price) || 0) - (Number(b.price) || 0);
            case 'Price: High to Low':
                return (Number(b.price) || 0) - (Number(a.price) || 0);
            case 'Popularity':
            default:
                return 0;
        }
    });

    const itemsPerPage = 120;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sorted.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    return (
        <main className="bg-gray-50 flex-grow min-h-screen">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="w-full md:w-auto">
                            <h1 className="text-3xl font-display font-black text-gray-900 tracking-tight uppercase border-l-4 border-zeal-red pl-3">
                                {search ? `Search: ${search}` : activeCategories.length === 0 ? 'All Appliances & Electronics' : activeCategories.join(', ')}
                            </h1>
                            <p className="text-sm text-gray-500 mt-2 flex items-center font-medium">
                                <i className="fas fa-check-circle text-green-500 mr-1"></i> 100% Genuine Brands • Manufacturer Warranty
                            </p>
                        </div>
                        <div className="w-full md:w-80 relative">
                            <input
                                type="text"
                                placeholder="Filter within..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-white border border-gray-300 focus:border-zeal-blue rounded-sm py-2.5 pl-10 pr-4 outline-none transition-all font-medium text-sm"
                            />
                            <i className="fas fa-search absolute left-3 top-3.5 text-gray-400 text-sm"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white border border-gray-200 overflow-y-auto sticky top-6" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
                        <div className="bg-zeal-dark text-white px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-between">
                            Categories
                            <i className="fas fa-list text-gray-400 text-xs"></i>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            <li>
                                <label className="w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-start cursor-pointer group bg-gray-50">
                                    <input 
                                        type="checkbox"
                                        checked={activeCategories.length === categories.filter(c => c.name !== 'All').length && activeCategories.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setActiveCategories(categories.filter(c => c.name !== 'All').map(c => c.name));
                                            } else {
                                                setActiveCategories([]);
                                            }
                                            setCurrentPage(1);
                                        }}
                                        className="mr-3 h-4 w-4 text-zeal-red focus:ring-zeal-red border-gray-300 rounded cursor-pointer"
                                    />
                                    <span className={`text-gray-600 group-hover:text-gray-900 font-bold ${activeCategories.length === categories.filter(c => c.name !== 'All').length && activeCategories.length > 0 ? 'text-zeal-red' : ''}`}>All</span>
                                </label>
                            </li>
                            {categories.filter(c => c.name !== 'All').map(cat => (
                                <li key={cat.id || cat.name}>
                                    <label className="w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-start cursor-pointer group">
                                        <input 
                                            type="checkbox"
                                            checked={activeCategories.includes(cat.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setActiveCategories(prev => [...prev, cat.name]);
                                                } else {
                                                    setActiveCategories(prev => prev.filter(c => c !== cat.name));
                                                }
                                                setCurrentPage(1);
                                            }}
                                            className="mr-3 h-4 w-4 text-zeal-red focus:ring-zeal-red border-gray-300 rounded cursor-pointer"
                                        />
                                        <span className={`text-gray-600 group-hover:text-gray-900 ${activeCategories.includes(cat.name) ? 'font-bold text-zeal-red' : ''}`}>{cat.name}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>

                        {/* Brands */}
                        <div className="bg-zeal-dark text-white px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-between border-t border-gray-200">
                            Brands
                            <i className="fas fa-tag text-gray-400 text-xs"></i>
                        </div>
                        <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                            <li>
                                <label className="w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-start cursor-pointer group bg-gray-50">
                                    <input 
                                        type="checkbox"
                                        checked={activeBrands.length === brands.length && activeBrands.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setActiveBrands(brands.map(b => b.name));
                                            } else {
                                                setActiveBrands([]);
                                            }
                                            setCurrentPage(1);
                                        }}
                                        className="mr-3 h-4 w-4 text-zeal-red focus:ring-zeal-red border-gray-300 rounded cursor-pointer"
                                    />
                                    <span className={`text-gray-600 group-hover:text-gray-900 font-bold ${activeBrands.length === brands.length && activeBrands.length > 0 ? 'text-zeal-red' : ''}`}>All</span>
                                </label>
                            </li>
                            {brands.map(brand => (
                                <li key={brand.id || brand.name}>
                                    <label className="w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-start cursor-pointer group">
                                        <input 
                                            type="checkbox"
                                            checked={activeBrands.includes(brand.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setActiveBrands(prev => [...prev, brand.name]);
                                                } else {
                                                    setActiveBrands(prev => prev.filter(b => b !== brand.name));
                                                }
                                                setCurrentPage(1);
                                            }}
                                            className="mr-3 h-4 w-4 text-zeal-red focus:ring-zeal-red border-gray-300 rounded cursor-pointer"
                                        />
                                        <span className={`text-gray-600 group-hover:text-gray-900 ${activeBrands.includes(brand.name) ? 'font-bold text-zeal-red' : ''}`}>{brand.name}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>

                        {/* Price Range */}
                        <div className="bg-zeal-dark text-white px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-between border-t border-gray-200">
                            Price (₦)
                            <i className="fas fa-money-bill-wave text-gray-400 text-xs"></i>
                        </div>
                        <div className="px-4 py-4 flex items-center gap-2">
                            <input 
                                type="number" 
                                placeholder="Min" 
                                value={minPrice}
                                onChange={e => { setMinPrice(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-white border border-gray-300 focus:border-zeal-blue rounded-sm py-1.5 px-2 outline-none text-sm transition-colors font-medium"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="number" 
                                placeholder="Max" 
                                value={maxPrice}
                                onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-white border border-gray-300 focus:border-zeal-blue rounded-sm py-1.5 px-2 outline-none text-sm transition-colors font-medium"
                            />
                        </div>

                        {/* Condition */}
                        <div className="bg-zeal-dark text-white px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-between border-t border-gray-200">
                            Condition
                            <i className="fas fa-box text-gray-400 text-xs"></i>
                        </div>
                        <div className="px-4 py-3">
                            <select 
                                value={condition} 
                                onChange={e => { setCondition(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-white border border-gray-300 focus:border-zeal-blue text-gray-700 font-medium py-2 px-3 rounded-sm text-sm outline-none transition-colors cursor-pointer"
                            >
                                <option value="All">Any Condition</option>
                                <option value="New">Brand New</option>
                                <option value="Refurbished">Refurbished / UK Used</option>
                                <option value="Used">Used</option>
                            </select>
                        </div>

                        {/* Specifications - conditional on category */}
                        {(activeCategories.length === 0 || activeCategories.some(cat => ['Phones', 'Laptops', 'Gaming', 'Tablets'].includes(cat))) && (
                            <>
                                <div className="bg-zeal-dark text-white px-4 py-3 font-bold uppercase tracking-wide text-sm flex items-center justify-between border-t border-gray-200">
                                    Specifications
                                    <i className="fas fa-microchip text-gray-400 text-xs"></i>
                                </div>
                                <div className="px-4 py-4 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">RAM</label>
                                        <select value={activeRam} onChange={e => { setActiveRam(e.target.value); setCurrentPage(1); }} className="w-full bg-white border border-gray-300 focus:border-zeal-blue text-gray-700 py-1.5 px-2 rounded-sm text-sm outline-none transition-colors cursor-pointer font-medium">
                                            <option value="All">Any RAM</option>
                                            <option value="4GB">4GB</option>
                                            <option value="6GB">6GB</option>
                                            <option value="8GB">8GB</option>
                                            <option value="12GB">12GB</option>
                                            <option value="16GB">16GB</option>
                                            <option value="32GB">32GB</option>
                                            <option value="64GB">64GB</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Storage</label>
                                        <select value={activeStorage} onChange={e => { setActiveStorage(e.target.value); setCurrentPage(1); }} className="w-full bg-white border border-gray-300 focus:border-zeal-blue text-gray-700 py-1.5 px-2 rounded-sm text-sm outline-none transition-colors cursor-pointer font-medium">
                                            <option value="All">Any Storage</option>
                                            <option value="64GB">64GB</option>
                                            <option value="128GB">128GB</option>
                                            <option value="256GB">256GB</option>
                                            <option value="512GB">512GB</option>
                                            <option value="1TB">1TB</option>
                                            <option value="2TB">2TB</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">OS</label>
                                        <select value={activeOs} onChange={e => { setActiveOs(e.target.value); setCurrentPage(1); }} className="w-full bg-white border border-gray-300 focus:border-zeal-blue text-gray-700 py-1.5 px-2 rounded-sm text-sm outline-none transition-colors cursor-pointer font-medium">
                                            <option value="All">Any OS</option>
                                            <option value="iOS">iOS</option>
                                            <option value="Android">Android</option>
                                            <option value="Windows">Windows</option>
                                            <option value="macOS">macOS</option>
                                            <option value="Linux">Linux</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Product Grid */}
                <div className="flex-1">
                    <div className="bg-white p-3 border border-gray-200 mb-6 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                            Found <span className="font-bold text-gray-900">{sorted.length}</span> items
                        </span>
                        <div className="flex items-center text-sm">
                            <span className="text-gray-500 mr-2 font-medium">Sort by:</span>
                            <select 
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                                className="bg-gray-50 border border-gray-300 text-gray-700 py-1.5 px-3 outline-none text-sm font-medium"
                            >
                                <option>Popularity</option>
                                <option>Price: Low to High</option>
                                <option>Price: High to Low</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white p-4 border border-gray-200 h-80 animate-pulse flex flex-col justify-between">
                                    <div className="w-full h-40 bg-gray-100 mb-4"></div>
                                    <div className="h-4 bg-gray-100 w-3/4 mb-2"></div>
                                    <div className="h-8 bg-gray-100 w-full mt-auto"></div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white p-12 border border-gray-200 text-center">
                            <i className="fas fa-search text-6xl text-gray-200 mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-800 mb-2 uppercase">No products found</h3>
                            <p className="text-gray-500 mb-6 font-medium">We couldn't find any items matching your criteria.</p>
                            <button 
                                onClick={() => { 
                                    setSearch(''); 
                                    setActiveCategories([]);
                                    setActiveBrands([]);
                                    setMinPrice('');
                                    setMaxPrice('');
                                    setCondition('All');
                                    setActiveRam('All');
                                    setActiveStorage('All');
                                    setActiveOs('All');
                                }}
                                className="bg-zeal-red hover:bg-red-800 text-white font-bold py-2.5 px-8 uppercase tracking-wide text-sm transition"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentItems.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => navigate(`/products/${p.id}`)}
                                    className="product-card-container relative group cursor-pointer flex flex-col h-full bg-white border border-gray-200"
                                >
                                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                                        {p.featured && (
                                            <span className="bg-yellow-500 text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                <i className="fas fa-star text-[8px]"></i> Featured
                                            </span>
                                        )}
                                        {p.tag && (
                                            <span className="bg-zeal-red text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider shadow-sm">
                                                {p.tag}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="relative p-4 h-52 flex items-center justify-center bg-white border-b border-gray-100">
                                        <img src={p.img} alt={p.name} className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    
                    <div className="p-4 flex flex-col flex-grow">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            {normalizeBrand(p.brand) || 'Official Partner'}
                                        </p>
                                        <h3 className="text-[13px] font-bold text-gray-800 leading-snug line-clamp-2 mb-3 group-hover:text-zeal-blue transition-colors">
                                            {p.name}
                                        </h3>
                                        
                                        <div className="mt-auto">
                                            {/* Inventory Status */}
                                            <div className="mb-2">
                                                {isProductInStock(p) ? (
                                                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold uppercase tracking-wider">
                                                        <i className="fas fa-check-circle text-xs"></i> {getStockDisplayText(p)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold uppercase tracking-wider">
                                                        <i className="fas fa-exclamation-circle text-xs"></i> {getStockDisplayText(p)}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="mb-3">
                                                <span className="text-xl font-display font-black text-zeal-red block">
                                                    ₦{Number(p.price).toLocaleString()}
                                                </span>
                                                {Number(p.oldPrice) > 0 && (
                                                    <span className="text-xs text-gray-400 line-through font-medium">
                                                        ₦{Number(p.oldPrice).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.id}`); }}
                                                disabled={!isProductInStock(p)}
                                                className={`w-full ${isProductInStock(p) ? 'bg-white border-zeal-blue text-zeal-blue hover:bg-zeal-blue hover:text-white' : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'} border font-bold py-2.5 rounded-sm text-sm transition-colors flex justify-center items-center gap-2 uppercase tracking-wide`}
                                            >
                                                <i className="fas fa-shopping-cart"></i> {isProductInStock(p) ? 'Add To Cart' : 'Out of Stock'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {!loading && totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-10 mb-4">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-zeal-blue text-gray-600 hover:text-zeal-blue rounded-sm text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fas fa-chevron-left mr-2"></i> Prev
                            </button>
                            <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">
                                Page <span className="text-gray-900">{currentPage}</span> of {totalPages}
                            </span>
                            <button 
                                disabled={currentPage === totalPages}
                                onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="px-5 py-2.5 bg-white border-2 border-gray-200 hover:border-zeal-blue text-gray-600 hover:text-zeal-blue rounded-sm text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </main>
    );
}
