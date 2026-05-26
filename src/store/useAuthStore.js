import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';

const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  loading: true,
  init: () => {
    onAuthStateChanged(auth, (user) => {
      // Hardcode admin check for this specific email
      const isAdmin = user?.email === 'zealmart.ng@gmail.com';
      
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
