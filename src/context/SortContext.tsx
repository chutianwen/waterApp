import React, { createContext, useContext, useState } from 'react';

type SortType = 'name' | 'lastTransaction';

interface SortContextType {
  sortBy: SortType;
  toggleSort: () => void;
}

const SortContext = createContext<SortContextType | undefined>(undefined);

export const SortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sortBy, setSortBy] = useState<SortType>('lastTransaction');

  const toggleSort = () => {
    setSortBy(current => current === 'name' ? 'lastTransaction' : 'name');
  };

  return (
    <SortContext.Provider value={{ sortBy, toggleSort }}>
      {children}
    </SortContext.Provider>
  );
};

export const useSortContext = () => {
  const context = useContext(SortContext);
  if (context === undefined) {
    throw new Error('useSortContext must be used within a SortProvider');
  }
  return context;
}; 