import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  init: () => {
    onAuthStateChanged(auth, async (user) => {
      let isAdmin = false;
      
      if (user) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            isAdmin = userDoc.data().isAdmin === true;
          }
        } catch (err) {
          console.error("Failed to fetch admin status", err);
        }
      }
      
      set({ 
        user, 
        isAdmin,
        loading: false 
      });
    });
  },
  logout: async () => {
    await signOut(auth);
    set({ user: null, isAdmin: false });
  }
}));

export default useAuthStore;
