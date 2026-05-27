import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ChevronDown, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Footer from '../components/Footer';
import useCartStore from '../store/useCartStore';
import { isProductInStock, INVENTORY_STATUS, getStockDisplayText } from '../utils/inventoryService';

const INTEREST = { 2: 0, 3: 10, 4: 10, 5: 20, 6: 20 };

function fmt(n) {
  return '₦' + Math.ceil(n).toLocaleString('en-NG');
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showInstallment, setShowInstallment] = useState(false);
  const [installments, setInstallments] = useState(2);
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Ensure product has inventory fields
          const productWithInventory = {
            id: docSnap.id,
            ...data,
            inventory_status: data.inventory_status || 'in_stock',
            items_left: data.items_left !== undefined ? data.items_left : 5,
            unlimited_stock: data.unlimited_stock || false,
            is_hidden: data.is_hidden || false
          };
          setProduct(productWithInventory);
        } else {
          setError("Product not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-zeal-blue"></i>
          <h2 className="text-xl font-bold font-display uppercase tracking-widest text-gray-500">Loading Product...</h2>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex flex-col items-center justify-center px-4 text-center">
          <h2 className="text-3xl font-display font-black text-gray-900 mb-4">{error || 'Product Not Found'}</h2>
          <Link to="/products" className="text-zeal-blue font-bold flex items-center gap-2 hover:text-zeal-red transition-colors">
            <ArrowLeft size={16} /> Back to Shop
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  // Installment calculations
  const price = Number(product.price);
  const rate        = INTEREST[installments] / 100;
  const total       = price * (1 + rate);
  
  const totalPeriods = paymentFrequency === 'weekly' ? installments * 4 : installments;
  const periodPayment = total / totalPeriods;
  const interestAmt = total - price;

  const handleBuyOnce = () => {
    addToCart(product, 1, 'full', 1, price);
    navigate('/cart');
  };

  const handleInstallment = () => {
    addToCart(product, 1, 'installment', installments, periodPayment, paymentFrequency);
    navigate('/cart');
  };

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        
        <div className="mb-6 flex items-center text-sm font-bold text-gray-500 uppercase tracking-wider">
          <Link to="/" className="hover:text-zeal-red transition-colors flex items-center gap-1">
             Home
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <Link to={`/products?cat=${product.category}`} className="hover:text-zeal-red transition-colors">
             {product.category}
          </Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-800 line-clamp-1 max-w-[200px] sm:max-w-md" title={product.name}>
             {product.name}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          
          {/* Image Column */}
          <div className="w-full lg:w-1/2 flex-shrink-0 relative">
            <div className="sticky top-8 bg-gray-50 border border-gray-100 rounded-sm p-8 flex items-center justify-center min-h-[400px] lg:min-h-[500px]">
              <img src={product.img} alt={product.name} loading="lazy" decoding="async" className="max-w-full max-h-[450px] object-contain mix-blend-multiply drop-shadow-xl hover:scale-105 transition-transform duration-500" />
              {product.featured && (
                <span className="absolute top-4 left-4 bg-zeal-red text-white text-[10px] font-black px-3 py-1.5 rounded-sm uppercase tracking-widest shadow-md">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* Info Column */}
          <div className="w-full lg:w-1/2 py-2">
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Brand: <span className="text-zeal-blue">{product.brand || 'OFFICIAL PARTNER'}</span>
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 leading-tight mb-4">{product.name}</h1>
              {product.length && (
                <span className="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider mb-4">
                  {product.length}
                </span>
              )}
              <div className="flex items-center gap-4 text-sm font-medium">
                {isProductInStock(product) ? (
                  <>{getStockDisplayText(product)}
                    <span className="flex items-center gap-1 text-green-600"><CheckCircle size={16} /> In Stock ({product.items_left || 0})</span>
                    <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={16} /> Official Warranty</span>
                  </>
                ) : product.inventory_status === INVENTORY_STATUS.OUT_OF_STOCK ? (
                  <span className="flex items-center gap-1 text-red-600"><AlertCircle size={16} /> Out of Stock</span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-500"><AlertCircle size={16} /> Unavailable</span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mb-8">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl font-display font-black text-zeal-red">{fmt(price)}</span>
                {Number(product.oldPrice) > price && (
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-400 line-through font-medium">Original price was: {fmt(product.oldPrice)}</span>
                  </div>
                )}
              </div>
              {Number(product.oldPrice) > price && (
                <div className="inline-block bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-sm uppercase tracking-widest mb-2">
                  {Math.round(100 - (price / Number(product.oldPrice)) * 100)}% OFF
                </div>
              )}
              <p className="text-sm text-gray-500 font-medium mt-1">Delivery is processed after full payment is completed.</p>
            </div>

            {/* Product Description / Features */}
            {product.description && (
              <div className="bg-gray-50 border border-gray-100 rounded-sm p-6 mb-8">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Key Features & Specifications</h3>
                <ul className="space-y-3">
                  {product.description.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
                    const [key, ...rest] = line.split(':');
                    const value = rest.join(':').trim();
                    return (
                      <li key={idx} className="flex flex-col sm:flex-row sm:items-start text-sm">
                        {value ? (
                          <>
                            <span className="font-bold text-gray-700 w-full sm:w-1/3 shrink-0">{key.trim()}:</span>
                            <span className="text-gray-600 flex-1">{value}</span>
                          </>
                        ) : (
                          <span className="text-gray-600 flex-1">
                            <i className="fas fa-check text-zeal-blue mr-2 text-xs"></i>{line.trim()}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 mb-8">
              <button 
                onClick={handleBuyOnce}
                disabled={!isProductInStock(product)}
                className={`w-full ${isProductInStock(product) ? 'bg-zeal-dark hover:bg-black' : 'bg-gray-400 cursor-not-allowed'} text-white font-black py-4 rounded-sm text-sm uppercase tracking-widest transition-all shadow-md ${isProductInStock(product) ? 'hover:shadow-lg' : ''} flex items-center justify-center gap-3 ${isProductInStock(product) ? 'transform hover:-translate-y-0.5' : ''}`}
              >
                <ShoppingBag size={18} /> {isProductInStock(product) ? `Buy Once Now — ${fmt(price)}` : 'Out of Stock'}
              </button>
            </div>

            {/* Installment Payment Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-sm overflow-hidden">
              <button
                disabled={!isProductInStock(product)}
                className={`w-full px-6 py-4 flex justify-between items-center ${isProductInStock(product) ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 cursor-not-allowed'} transition-colors`}
                onClick={() => setShowInstallment(v => !v)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${isProductInStock(product) ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'} flex items-center justify-center`}>
                    <i className="fas fa-calendar-alt text-sm"></i>
                  </div>
                  <span className={`font-black uppercase tracking-wide ${isProductInStock(product) ? 'text-gray-900' : 'text-gray-500'}`}>
                    {isProductInStock(product) ? 'Pay in Installments' : 'Pay in Installments (Unavailable)'}
                  </span>
                </div>
                <ChevronDown size={20} className={`${isProductInStock(product) ? 'text-gray-400' : 'text-gray-300'} transition-transform duration-300 ${showInstallment ? 'rotate-180' : ''}`} />
              </button>

              {showInstallment && isProductInStock(product) && (
                <div className="p-6 border-t border-gray-200">
                  
                  {/* Frequency Toggle */}
                  <div className="flex bg-gray-200/50 p-1 rounded-sm mb-6 w-full max-w-xs mx-auto">
                    <button
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${paymentFrequency === 'monthly' ? 'bg-white text-zeal-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setPaymentFrequency('monthly')}
                    >
                      Monthly
                    </button>
                    <button
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${paymentFrequency === 'weekly' ? 'bg-white text-zeal-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setPaymentFrequency('weekly')}
                    >
                      Weekly
                    </button>
                  </div>

                  {/* Duration Selector */}
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">Select Duration ({paymentFrequency === 'weekly' ? 'Weeks' : 'Months'})</label>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[2, 3, 4, 5, 6].map(n => (
                        <button
                          key={n}
                          className={`w-12 h-12 rounded-sm font-black text-lg transition-all ${installments === n ? 'bg-zeal-blue text-white shadow-md transform -translate-y-0.5' : 'bg-white border border-gray-200 text-gray-600 hover:border-zeal-blue'}`}
                          onClick={() => setInstallments(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-white border border-gray-200 rounded-sm p-5 mb-6">
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">Interest rate</span>
                      <span className={`text-sm font-black ${INTEREST[installments] > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {INTEREST[installments]}% {INTEREST[installments] === 0 && '🎉'}
                      </span>
                    </div>
                    {interestAmt > 0 && (
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">Interest added</span>
                        <span className="text-sm font-black text-gray-900">{fmt(interestAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-500">Total to pay</span>
                      <span className="text-sm font-black text-gray-900">{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-bold text-gray-800">{paymentFrequency === 'monthly' ? 'Monthly payment' : 'Weekly payment'}</span>
                      <span className="text-lg font-black text-zeal-blue">{fmt(periodPayment)} <span className="text-xs text-gray-400 font-medium">/{paymentFrequency === 'weekly' ? 'wk' : 'mo'}</span></span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-sm p-4 mb-6 flex gap-3">
                    <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      <strong>How multi-item orders work:</strong> Items with the exact same payment plan are processed together. If you mix items with different installment durations or frequencies, you will be asked to either merge them into one plan or check out as separate orders.
                    </p>
                  </div>

                  <button 
                    className="w-full bg-white border-2 border-zeal-blue text-zeal-blue hover:bg-zeal-blue hover:text-white font-black py-3.5 rounded-sm text-sm uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2" 
                    onClick={handleInstallment}
                  >
                    Start {paymentFrequency === 'weekly' ? 'Weekly' : 'Monthly'} Plan
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
