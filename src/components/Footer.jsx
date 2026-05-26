import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-zeal-dark text-gray-400 pt-16 pb-8 border-t-4 border-zeal-red mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    <div className="lg:col-span-1">
                        <Link to="/" className="inline-block mb-6">
                            <div className="font-display text-3xl font-black tracking-tighter">
                                <span className="text-white">ZEAL</span><span className="text-zeal-red">MART</span>
                            </div>
                        </Link>
                        <p className="text-sm mb-6 leading-relaxed font-medium">
                            Nigeria's leading distributor of premium electronics and home appliances. Official partners with global tech brands.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="w-10 h-10 bg-gray-800 flex items-center justify-center rounded-sm hover:bg-zeal-red hover:shadow-[0_0_10px_rgba(230,22,1,0.5)] transition-all duration-300 transform hover:-translate-y-1 text-white"><i className="fab fa-twitter"></i></a>
                            <a href="#" className="w-10 h-10 bg-gray-800 flex items-center justify-center rounded-sm hover:bg-zeal-red hover:shadow-[0_0_10px_rgba(230,22,1,0.5)] transition-all duration-300 transform hover:-translate-y-1 text-white"><i className="fab fa-facebook-f"></i></a>
                            <a href="#" className="w-10 h-10 bg-gray-800 flex items-center justify-center rounded-sm hover:bg-zeal-red hover:shadow-[0_0_10px_rgba(230,22,1,0.5)] transition-all duration-300 transform hover:-translate-y-1 text-white"><i className="fab fa-instagram"></i></a>
                            <a href="#" className="w-10 h-10 bg-gray-800 flex items-center justify-center rounded-sm hover:bg-zeal-red hover:shadow-[0_0_10px_rgba(230,22,1,0.5)] transition-all duration-300 transform hover:-translate-y-1 text-white"><i className="fab fa-youtube"></i></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest border-b border-gray-800 pb-3">Quick Links</h4>
                        <ul className="space-y-3 text-sm font-medium">
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Shop Categories</Link></li>
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Deal of the Day</Link></li>
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Track Your Order</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest border-b border-gray-800 pb-3">Customer Service</h4>
                        <ul className="space-y-3 text-sm font-medium">
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Contact Us</Link></li>
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Returns & Exchanges</Link></li>
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Delivery Information</Link></li>
                            <li><Link to="#" className="hover:text-white hover:translate-x-1 transition-all flex items-center"><i className="fas fa-angle-right mr-2 text-zeal-red"></i> Payment Methods</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-black text-sm mb-6 uppercase tracking-widest border-b border-gray-800 pb-3">Head Office</h4>
                        <ul className="space-y-4 text-sm font-medium">
                            <li className="flex items-start">
                                <i className="fas fa-map-marker-alt mt-1 mr-3 text-zeal-red text-lg"></i>
                                <span>14 Electronics Avenue,<br />Victoria Island, Lagos,<br />Nigeria.</span>
                            </li>
                            <li className="flex items-center">
                                <div className="flex items-start gap-4 transform transition-transform hover:-translate-y-1">
                                <i className="fab fa-whatsapp text-3xl text-green-400"></i>
                                <div>
                                    <h4 className="font-bold text-white uppercase text-sm">Bulk Orders via WhatsApp</h4>
                                    <p className="text-xs text-gray-400 mt-1">Contact us on WhatsApp for wholesale & bulk order pricing.</p>
                                    <a href="https://wa.me/2340000000000" target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs font-bold text-green-400 hover:text-green-300 transition-colors">
                                        Chat Now <i className="fas fa-arrow-right ml-1"></i>
                                    </a>
                                </div>
                            </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs font-medium">
                    <p>&copy; {new Date().getFullYear()} Zealmart Limited. All Rights Reserved.</p>
                    <div className="flex space-x-4 mt-4 md:mt-0">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mastercard_2019_logo.svg/1200px-Mastercard_2019_logo.svg.png" alt="Mastercard" className="h-6 grayscale hover:grayscale-0 transition" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 grayscale hover:grayscale-0 transition" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Verve_Image.png/800px-Verve_Image.png" alt="Verve" className="h-6 grayscale hover:grayscale-0 transition" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
