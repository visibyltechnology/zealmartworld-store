import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const BRANDS_COLLECTION = 'brands';

/**
 * Listen to all brands in real-time
 * @param {Function} onUpdate - Callback when brands change
 * @returns {Function} Unsubscribe function
 */
export const listenToBrands = (onUpdate) => {
  const q = query(collection(db, BRANDS_COLLECTION), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const brands = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    onUpdate(brands);
  });
};

/**
 * Add a new brand
 * @param {Object} brandData - { name }
 * @returns {Promise<string>} Brand ID
 */
export const addBrand = async (brandData) => {
  const docRef = await addDoc(collection(db, BRANDS_COLLECTION), {
    ...brandData,
    order: Date.now(),
    createdAt: new Date()
  });
  return docRef.id;
};

/**
 * Update a brand
 * @param {string} brandId - Brand ID
 * @param {Object} updates - Fields to update
 */
export const updateBrand = async (brandId, updates) => {
  await updateDoc(doc(db, BRANDS_COLLECTION, brandId), updates);
};

/**
 * Delete a brand
 * @param {string} brandId - Brand ID
 */
export const deleteBrand = async (brandId) => {
  await deleteDoc(doc(db, BRANDS_COLLECTION, brandId));
};

/**
 * Get default brands (fallback if Firestore is empty)
 */
export const DEFAULT_BRANDS = [
  { name: 'Samsung', order: 0 },
  { name: 'LG', order: 1 },
  { name: 'Hisense', order: 2 },
  { name: 'TCL', order: 3 },
  { name: 'Apple', order: 4 },
  { name: 'Sony', order: 5 },
  { name: 'HP', order: 6 },
  { name: 'Panasonic', order: 7 },
  { name: 'Royal', order: 8 },
  { name: 'Thermocool', order: 9 },
  { name: 'Haier', order: 10 },
  { name: 'Bruhm', order: 11 },
  { name: 'Skyrun', order: 12 },
  { name: 'Scanfrost', order: 13 },
  { name: 'Nasco', order: 14 },
  { name: 'Polystar', order: 15 },
  { name: 'Nexus', order: 16 },
  { name: 'Syinix', order: 17 },
  { name: 'Vitron', order: 18 },
  { name: 'Itel', order: 19 },
  { name: 'Tecno', order: 20 },
  { name: 'Infinix', order: 21 },
  { name: 'Xiaomi', order: 22 },
  { name: 'Lenovo', order: 23 },
  { name: 'Dell', order: 24 },
  { name: 'Asus', order: 25 },
  { name: 'Acer', order: 26 },
  { name: 'JBL', order: 27 },
  { name: 'Bose', order: 28 },
  { name: 'Yamaha', order: 29 },
];
