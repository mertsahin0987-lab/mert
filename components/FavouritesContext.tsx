import React, { createContext, useContext, useState, useCallback } from 'react';

type FavouritesContextType = {
  favourites: Set<string>;
  toggleFavourite: (productId: string) => void;
  isFavourite: (productId: string) => boolean;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
};

const FavouritesContext = createContext<FavouritesContextType>({
  favourites: new Set(),
  toggleFavourite: () => {},
  isFavourite: () => false,
  isLoggedIn: false,
  setIsLoggedIn: () => {},
});

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const toggleFavourite = useCallback((productId: string) => {
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const isFavourite = useCallback((productId: string) => {
    return favourites.has(productId);
  }, [favourites]);

  return (
    <FavouritesContext.Provider value={{ favourites, toggleFavourite, isFavourite, isLoggedIn, setIsLoggedIn }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function useFavourites() {
  return useContext(FavouritesContext);
}
