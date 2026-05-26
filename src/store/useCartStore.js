import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      _hydrated: false,

      setHydrated: () => set({ _hydrated: true }),

      addToCart: (product, quantity = 1, paymentChoice = 'full', installments = 1, periodPayment = 0, paymentFrequency = 'monthly') => {
        set((state) => {
          // Check if item exists with same payment choice and frequency
          const existingItemIndex = state.items.findIndex(
            (item) => item.id === product.id && item.paymentChoice === paymentChoice && item.installments === installments && item.paymentFrequency === paymentFrequency
          );

          if (existingItemIndex > -1) {
            // Update quantity
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += quantity;
            toast.success('Cart updated');
            return { items: newItems };
          }

          // Add new item
          toast.success('Added to cart');
          return {
            items: [
              ...state.items,
              {
                ...product,
                quantity,
                paymentChoice,
                installments,
                periodPayment,
                paymentFrequency,
                cartItemId: Math.random().toString(36).substr(2, 9)
              }
            ]
          };
        });
      },

      removeFromCart: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.cartItemId !== cartItemId)
        }));
      },

      updateQuantity: (cartItemId, newQuantity) => {
        if (newQuantity < 1) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
          )
        }));
      },

      clearCart: () => set({ items: [] }),

      unifyPaymentFrequency: (newFrequency) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.paymentChoice !== 'installment') return item;
            if (item.paymentFrequency === newFrequency) return item;
            
            let newPeriodPayment = item.periodPayment || item.monthlyPayment;
            if (newFrequency === 'weekly' && item.paymentFrequency === 'monthly') {
               newPeriodPayment = newPeriodPayment / 4;
            } else if (newFrequency === 'monthly' && item.paymentFrequency === 'weekly') {
               newPeriodPayment = newPeriodPayment * 4;
            }

            return {
              ...item,
              paymentFrequency: newFrequency,
              periodPayment: newPeriodPayment
            };
          })
        }));
      },

      // Computed properties (getters)
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getCartTotal: () => {
        return get().items.reduce((total, item) => {
          if (item.paymentChoice === 'full') {
            return total + (item.price * item.quantity);
          } else {
            // If they chose installment, we calculate the total amount they are committing to
            const INTEREST = { 2: 0, 3: 10, 4: 10, 5: 20, 6: 20 };
            const rate = INTEREST[item.installments] / 100;
            const fullAmount = item.price * (1 + rate);
            return total + (fullAmount * item.quantity);
          }
        }, 0);
      },

      getInitialPaymentTotal: () => {
        return get().items.reduce((total, item) => {
          if (item.paymentChoice === 'full') {
            return total + (item.price * item.quantity);
          } else {
            // First period payment
            return total + ((item.periodPayment || item.monthlyPayment || 0) * item.quantity);
          }
        }, 0);
      }
    }),
    {
      name: 'jd-good-hair-cart',
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated();
      },
    }
  )
);

export default useCartStore;
