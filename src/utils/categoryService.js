import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const CATEGORIES_COLLECTION = 'categories';

/**
 * Listen to all categories in real-time
 * @param {Function} onUpdate - Callback when categories change
 * @returns {Function} Unsubscribe function
 */
export const listenToCategories = (onUpdate) => {
  const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const cats = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    onUpdate(cats);
  });
};

/**
 * Add a new category
 * @param {Object} categoryData - { name, color (optional), icon (optional) }
 * @returns {Promise<string>} Category ID
 */
export const addCategory = async (categoryData) => {
  const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
    ...categoryData,
    order: Date.now(),
    createdAt: new Date()
  });
  return docRef.id;
};

/**
 * Update a category
 * @param {string} categoryId - Category ID
 * @param {Object} updates - Fields to update
 */
export const updateCategory = async (categoryId, updates) => {
  await updateDoc(doc(db, CATEGORIES_COLLECTION, categoryId), updates);
};

/**
 * Delete a category
 * @param {string} categoryId - Category ID
 */
export const deleteCategory = async (categoryId) => {
  await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
};

/**
 * Get default categories (fallback if Firestore is empty)
 */
export const DEFAULT_CATEGORIES = [
  { name: 'All', order: 0 },
  { name: 'Air Conditioners', order: 1 },
  { name: 'Televisions', order: 2 },
  { name: 'Refrigerators', order: 3 },
  { name: 'Generators', order: 4 },
  { name: 'Washing Machines', order: 5 },
  { name: 'Phones', order: 6 },
  { name: 'Laptops', order: 7 },
  { name: 'Audio', order: 8 },
  { name: 'Gaming', order: 9 }
];

// Category color mapping for UI
export const CATEGORY_STYLES = {
  'Air Conditioners': { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe', dot: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
  'Televisions': { bg: '#f3f0ff', text: '#7c3aed', border: '#ddd6fe', dot: '#7c3aed', glow: 'rgba(124,58,237,0.15)' },
  'Washing Machines': { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8', dot: '#db2777', glow: 'rgba(219,39,119,0.15)' },
  'Refrigerators': { bg: '#fffbeb', text: '#d97706', border: '#fde68a', dot: '#d97706', glow: 'rgba(217,119,6,0.15)' },
  'Generators': { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', dot: '#059669', glow: 'rgba(5,150,105,0.15)' },
  'Phones': { bg: '#ecf9ff', text: '#0891b2', border: '#a5f3fc', dot: '#0891b2', glow: 'rgba(6,182,212,0.15)' },
  'Laptops': { bg: '#f3e8ff', text: '#a855f7', border: '#e9d5ff', dot: '#a855f7', glow: 'rgba(168,85,247,0.15)' },
  'Audio': { bg: '#ffe2e6', text: '#f43f5e', border: '#ffbdc7', dot: '#f43f5e', glow: 'rgba(244,63,94,0.15)' },
  'Gaming': { bg: '#fff7ed', text: '#fb923c', border: '#fed7aa', dot: '#fb923c', glow: 'rgba(251,146,60,0.15)' },
  'All': { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', dot: '#6b7280', glow: 'rgba(0,0,0,0.08)' },
};

export const getDefaultStyle = () => ({ bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', dot: '#6b7280', glow: 'rgba(0,0,0,0.08)' });
