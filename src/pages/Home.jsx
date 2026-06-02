import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Footer from '../components/Footer';
import useCartStore from '../store/useCartStore';

const DEFAULT_SLIDES = [
    {
        id: 1,
        title: "Upgrade Your Living Space",
        subtitle: "Premium Air Conditioners, Televisions, and Home Appliances from world-class brands.",
        buttonText: "Shop Appliances",
        link: "/products",
        image: "https://images.pexels.com/photos/3587620/pexels-photo-3587620.jpeg?auto=format&fit=crop&w=1920&q=80"
    },
    {
        id: 2,
        title: "Massive TV Clearance",
        subtitle: "Get up to 30% off on Smart 4K UHD Televisions.",
        buttonText: "View TV Deals",
        link: "/products?cat=Televisions",
        image: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=format&fit=crop&w=1920&q=80"
    },
    {
        id: 3,
        title: "Beat the Heat",
        subtitle: "Inverter ACs built for maximum cooling and low energy consumption.",
        buttonText: "Shop Air Conditioners",
        link: "/products?cat=Air%20Conditioners",
        image: "https://www.theheatpumppeople.co.nz/split-system-air-conditioner"
    },
    {
        id: 4,
        title: "Power Your Home",
        subtitle: "Reliable generators and solar solutions for uninterrupted power.",
        buttonText: "Explore Generators",
        link: "/products?cat=Generators",
        image: "https://images.pexels.com/photos/159358/electric-pole-sunset-lamp-159358.jpeg?auto=format&fit=crop&w=1920&q=80"
    },
    {
        id: 5,
        title: "Modern Kitchen Essentials",
        subtitle: "Double door refrigerators and chest freezers.",
        buttonText: "Shop Refrigerators",
        link: "/products?cat=Refrigerators",
        image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=format&fit=crop&w=1920&q=80"
    },
    {
        id: 6,
        title: "Laundry Made Easy",
        subtitle: "Top load and front load washing machines.",
        buttonText: "Shop Washing Machines",
        link: "/products?cat=Washing%20Machines",
        image: "https://images.pexels.com/photos/6194131/pexels-photo-6194131.jpeg?auto=format&fit=crop&w=1920&q=80"
    },
    {
        id: 7,
        title: "Next-Gen Gaming & Audio",
        subtitle: "Consoles, soundbars, and home theater systems.",
        buttonText: "Discover Gaming",
        link: "/products?cat=Gaming",
        image: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=format&fit=crop&w=1920&q=80"
    }
];

const DEFAULT_FEATURED = [
    { id: '1', name: 'Royal 1.5HP Split Air Conditioner', price: 285000, oldPrice: 310000, category: 'Air Conditioners', brand: 'Royal', img: 'https://images.pexels.com/photos/2581274/pexels-photo-2581274.jpeg?w=500&q=80', tag: 'Top Seller' },
    { id: '2', name: 'Samsung 65" Class CU7000 Crystal UHD 4K TV', price: 650000, category: 'Televisions', brand: 'Samsung', img: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=500&q=80', tag: 'Official Warranty' },
    { id: '3', name: 'Panasonic Top Load Washing Machine 10kg', price: 345000, oldPrice: 380000, category: 'Washing Machines', brand: 'Panasonic', img: 'https://images.pexels.com/photos/6194131/pexels-photo-6194131.jpeg?w=500&q=80' },
    { id: '4', name: 'Thermocool 3.5kVA Generator (Igwe)', price: 420000, category: 'Generators', brand: 'Thermocool', img: 'https://images.pexels.com/photos/159358/electric-pole-sunset-lamp-159358.jpeg?w=500&q=80', tag: 'Fast Moving' },
    { id: '5', name: 'LG Double Door Refrigerator 600L', price: 520000, oldPrice: 580000, category: 'Refrigerators', brand: 'LG', img: 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=500&q=80', tag: 'Best Deal' },
    { id: '6', name: 'Sony 55" Bravia XR OLED 4K TV', price: 890000, category: 'Televisions', brand: 'Sony', img: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=500&q=80', tag: 'Premium' },
    { id: '7', name: 'Hisense 2HP Inverter Air Conditioner', price: 340000, oldPrice: 380000, category: 'Air Conditioners', brand: 'Hisense', img: 'https://images.pexels.com/photos/2581274/pexels-photo-2581274.jpeg?w=500&q=80' },
    { id: '8', name: 'Indesit Front Load Washing Machine 7kg', price: 285000, oldPrice: 320000, category: 'Washing Machines', brand: 'Indesit', img: 'https://images.pexels.com/photos/6194131/pexels-photo-6194131.jpeg?w=500&q=80', tag: 'Budget Pick' },
    { id: '9', name: 'Midea 1.5HP Portable Air Conditioner', price: 210000, category: 'Air Conditioners', brand: 'Midea', img: 'https://images.pexels.com/photos/2581274/pexels-photo-2581274.jpeg?w=500&q=80' },
    { id: '10', name: 'TCL 43" Smart TV Full HD', price: 185000, oldPrice: 220000, category: 'Televisions', brand: 'TCL', img: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=500&q=80', tag: 'Hot Sale' },
    { id: '11', name: 'Scanfrost Chest Freezer 500L', price: 195000, category: 'Refrigerators', brand: 'Scanfrost', img: 'https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=500&q=80' },
    { id: '12', name: 'Binatone Gas Cooker 5 Burner', price: 125000, oldPrice: 150000, category: 'Kitchen', brand: 'Binatone', img: 'https://images.pexels.com/photos/278145/pexels-photo-278145.jpeg?w=500&q=80' },
];

export default function Home() {
    const [featured, setFeatured] = useState(DEFAULT_FEATURED);
    const [featLoading, setFeatLoading] = useState(false);
    const [slides, setSlides] = useState(DEFAULT_SLIDES);
    const [currentSlide, setCurrentSlide] = useState(0);
    const navigate = useNavigate();
    const addToCart = useCartStore(state => state.addToCart);

    // Auto-advance carousel
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

    // Real-time Fetch featured products & settings
    useEffect(() => {
        setFeatLoading(true);

        // Settings listener (Carousel)
        const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site_settings'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().heroSlides && docSnap.data().heroSlides.length > 0) {
                setSlides(docSnap.data().heroSlides);
            }
        }, (error) => console.error("Error syncing settings:", error));

        // Featured products listener
        const q = query(collection(db, "products"), where("featured", "==", true), limit(12));
        const unsubscribeProducts = onSnapshot(q, (snap) => {
            let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (items.length > 0) {
                items.sort((a, b) => {
                    const posA = a.featuredPosition ?? Infinity;
                    const posB = b.featuredPosition ?? Infinity;
                    return posA - posB;
                });
                setFeatured(items);
            } else {
                setFeatured(DEFAULT_FEATURED);
            }
            setFeatLoading(false);
        }, (error) => {
            console.error("Error syncing products:", error);
            setFeatured(DEFAULT_FEATURED);
            setFeatLoading(false);
        });

        // Cleanup listeners
        return () => {
            unsubscribeSettings();
            unsubscribeProducts();
        };
    }, []);

    const brands = [
        { name: 'Samsung', logo: 'https://www.vectorlogo.zone/logos/samsung/samsung-ar21.svg' },
        { name: 'LG', logo: 'https://www.vectorlogo.zone/logos/lg/lg-ar21.svg' },
        { name: 'Panasonic', logo: 'https://logo.clearbit.com/panasonic.com' },
        { name: 'Sony', logo: 'https://logo.clearbit.com/sony.com' },
        { name: 'Hisense', logo: 'https://logo.clearbit.com/hisense.com' },
        { name: 'TCL', logo: 'https://logo.clearbit.com/tcl.com' }
    ];

    return (
        <main className="bg-gray-50 flex-grow">

            {/* WhatsApp Floating Button */}
            <a href="https://wa.me/2348068916694" target="_blank" rel="noreferrer"
                className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <i className="fab fa-whatsapp text-3xl"></i>
            </a>

            {/* Giant 7-Slide Hero Carousel */}
            <div className="relative bg-zeal-dark text-white overflow-hidden h-[500px] md:h-[600px] group">
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className={`absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50 transform transition-transform duration-[10000ms] ${index === currentSlide ? 'scale-110' : 'scale-100'}`}
                        />
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full relative z-20 flex flex-col justify-center">
                            <div className="max-w-2xl transform transition-all duration-1000 translate-y-0 opacity-100">
                                <span className="inline-block bg-zeal-red text-white text-xs font-black uppercase tracking-widest px-3 py-1 mb-4 border border-red-500 animate-fade-in-up">
                                    Authorized Dealer
                                </span>
                                <h1 className="text-5xl md:text-7xl font-display font-black leading-tight mb-4 text-white uppercase tracking-tight drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                    {slide.title}
                                </h1>
                                <p className="text-lg md:text-xl text-gray-200 mb-8 font-medium drop-shadow animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                    {slide.subtitle}
                                </p>
                                <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                                    <Link
                                        to={slide.link}
                                        className="inline-block bg-zeal-red hover:bg-white hover:text-zeal-red border-2 border-transparent hover:border-zeal-red text-white font-bold py-4 px-10 rounded-sm transition-all duration-300 flex-none shadow-[0_0_15px_rgba(230,22,1,0.5)] hover:shadow-[0_0_25px_rgba(230,22,1,0.8)] uppercase tracking-wide transform hover:-translate-y-1"
                                    >
                                        {slide.buttonText} <i className="fas fa-chevron-right ml-2 text-xs"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Carousel Controls */}
                <button
                    onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-zeal-red text-white w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                    <i className="fas fa-chevron-left"></i>
                </button>
                <button
                    onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-zeal-red text-white w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                    <i className="fas fa-chevron-right"></i>
                </button>

                {/* Carousel Indicators */}
                <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center space-x-2">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-2 transition-all duration-300 rounded-full ${idx === currentSlide ? 'w-8 bg-zeal-red' : 'w-2 bg-white/50'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Brand Carousel Section */}
            <div className="bg-white border-b border-gray-200 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h3 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Official Partners & Distributors Of</h3>
                    <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 hover:opacity-100 transition-all duration-500">
                        <div className="text-center">
                            <div className="h-8 md:h-10 flex items-center justify-center mb-2">
                                <span className="font-black text-lg text-gray-800">Samsung</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="h-8 md:h-10 flex items-center justify-center mb-2">
                                <span className="font-black text-lg text-gray-800">LG</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="h-8 md:h-10 flex items-center justify-center mb-2">
                                <span className="font-black text-lg text-gray-800">Panasonic</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="h-8 md:h-10 flex items-center justify-center mb-2">
                                <span className="font-black text-lg text-gray-800">Sony</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="h-8 md:h-10 flex items-center justify-center mb-2">
                                <span className="font-black text-lg text-gray-800">Hisense</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="h-8 md:h-10 flex items-center justify-center mb-2">
                                <span className="font-black text-lg text-gray-800">TCL</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Highlighted Categories */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link to="/products?cat=Air%20Conditioners" className="group relative h-64 bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <img src="https://lirp.cdn-website.com/eb0d1dad/dms3rep/multi/opt/Split+system+Air+Conditioner-640w.jpg" alt="ACs" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                            <span className="text-zeal-red font-bold text-sm uppercase tracking-wider block mb-1">Cooling</span>
                            <h3 className="text-white font-display font-black text-2xl uppercase">Air Conditioners</h3>
                            <span className="text-white text-sm font-medium mt-2 inline-flex items-center group-hover:text-zeal-red transition-colors">
                                Shop Now <i className="fas fa-arrow-right ml-2 text-xs transition-transform group-hover:translate-x-2"></i>
                            </span>
                        </div>
                    </Link>

                    <Link to="/products?cat=Televisions" className="group relative h-64 bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <img src="https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=500&q=80" alt="TVs" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                            <span className="text-zeal-red font-bold text-sm uppercase tracking-wider block mb-1">Entertainment</span>
                            <h3 className="text-white font-display font-black text-2xl uppercase">Televisions</h3>
                            <span className="text-white text-sm font-medium mt-2 inline-flex items-center group-hover:text-zeal-red transition-colors">
                                Shop Now <i className="fas fa-arrow-right ml-2 text-xs transition-transform group-hover:translate-x-2"></i>
                            </span>
                        </div>
                    </Link>

                    <Link to="/products?cat=Refrigerators" className="group relative h-64 bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                        <img src="https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=500&q=80" alt="Refrigerators" className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                            <span className="text-zeal-red font-bold text-sm uppercase tracking-wider block mb-1">Kitchen</span>
                            <h3 className="text-white font-display font-black text-2xl uppercase">Refrigerators</h3>
                            <span className="text-white text-sm font-medium mt-2 inline-flex items-center group-hover:text-zeal-red transition-colors">
                                Shop Now <i className="fas fa-arrow-right ml-2 text-xs transition-transform group-hover:translate-x-2"></i>
                            </span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Best Sellers Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
                <div className="flex justify-between items-end border-b-2 border-zeal-blue pb-3 mb-6">
                    <h2 className="text-2xl font-display font-black text-gray-900 uppercase tracking-tight">Best Selling Appliances</h2>
                    <Link to="/products" className="text-zeal-red hover:text-red-800 font-bold text-sm uppercase tracking-wider hidden sm:block group">
                        View All <i className="fas fa-arrow-right ml-1 transition-transform group-hover:translate-x-1"></i>
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {featLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-4 rounded border border-gray-200 h-80 animate-pulse flex flex-col justify-between">
                                <div className="w-full h-40 bg-gray-100 mb-4"></div>
                                <div className="h-4 bg-gray-100 w-3/4 mb-2"></div>
                                <div className="h-8 bg-gray-100 w-1/2 mt-auto"></div>
                            </div>
                        ))
                    ) : (
                        featured.map((p, idx) => (
                            <div key={p.id}
                                onClick={() => navigate(`/products/${p.id}`)}
                                className="product-card-container relative group cursor-pointer flex flex-col h-full rounded bg-white overflow-hidden animate-fade-in-up"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                                    {p.featured && (
                                        <span className="bg-yellow-500 text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider shadow-sm flex items-center gap-1">
                                            <i className="fas fa-star text-[8px]"></i> Featured
                                        </span>
                                    )}
                                    {p.tag && (
                                        <span className="bg-zeal-red text-white text-[10px] font-black px-2 py-1 rounded-sm uppercase tracking-wider animate-pulse shadow-sm">
                                            {p.tag}
                                        </span>
                                    )}
                                </div>

                                <div className="relative p-4 h-56 flex items-center justify-center border-b border-gray-100 bg-white overflow-hidden">
                                    <img src={p.img} alt={p.name} className="max-w-full max-h-full object-contain transform group-hover:scale-110 transition-transform duration-500" />
                                </div>

                                <div className="p-4 flex flex-col flex-grow">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        {p.brand || p.category}
                                    </p>
                                    <h3 className="text-[13px] font-bold text-gray-800 leading-snug line-clamp-2 mb-3 group-hover:text-zeal-blue transition-colors">
                                        {p.name}
                                    </h3>

                                    <div className="mt-auto">
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(p);
                                            }}
                                            className="w-full bg-white border border-zeal-blue text-zeal-blue hover:bg-zeal-blue hover:text-white font-bold py-2.5 rounded-sm text-sm transition-all duration-300 flex justify-center items-center gap-2 uppercase tracking-wide group-hover:shadow-md transform group-hover:-translate-y-1"
                                        >
                                            <i className="fas fa-shopping-cart"></i> Add To Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Trust Badges Section */}
            <div className="bg-zeal-gray border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        <div className="flex items-start gap-4 transform transition-transform hover:-translate-y-1">
                            <i className="fas fa-shield-alt text-3xl text-zeal-blue"></i>
                            <div>
                                <h4 className="font-bold text-gray-900 uppercase text-sm">Secure Payment</h4>
                                <p className="text-xs text-gray-500 mt-1">100% secure payment with Korapay.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 transform transition-transform hover:-translate-y-1">
                            <i className="fas fa-truck text-3xl text-zeal-blue"></i>
                            <div>
                                <h4 className="font-bold text-gray-900 uppercase text-sm">Nationwide Delivery</h4>
                                <p className="text-xs text-gray-500 mt-1">Fast delivery to all 36 states across Nigeria.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 transform transition-transform hover:-translate-y-1">
                            <i className="fab fa-whatsapp text-3xl text-green-500"></i>
                            <div>
                                <h4 className="font-bold text-gray-900 uppercase text-sm">Bulk Orders via WhatsApp</h4>
                                <p className="text-xs text-gray-500 mt-1">Contact us on WhatsApp for wholesale & bulk order pricing.</p>
                                <a href="https://wa.me/2340000000000" target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs font-bold text-green-600 hover:text-green-700 transition-colors">
                                    Chat Now <i className="fas fa-arrow-right ml-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
