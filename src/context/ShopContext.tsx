import React, { createContext, useContext, useState } from 'react';
import { ShopModal } from '../components/modals/ShopModal';

interface ShopContextValue {
  openShop: () => void;
  closeShop: () => void;
}

const ShopContext = createContext<ShopContextValue>({
  openShop: () => {},
  closeShop: () => {},
});

export const useShop = () => useContext(ShopContext);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ShopContext.Provider value={{ openShop: () => setIsOpen(true), closeShop: () => setIsOpen(false) }}>
      {children}
      {isOpen && <ShopModal onClose={() => setIsOpen(false)} />}
    </ShopContext.Provider>
  );
};
