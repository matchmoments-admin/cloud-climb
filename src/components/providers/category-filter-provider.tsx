'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface CategoryFilterContextType {
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  categories: string[];
  setCategories: (categories: string[]) => void;
}

const CategoryFilterContext = createContext<CategoryFilterContextType | null>(null);

export function CategoryFilterProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  return (
    <CategoryFilterContext.Provider
      value={{ activeCategory, setActiveCategory, categories, setCategories }}
    >
      {children}
    </CategoryFilterContext.Provider>
  );
}

export function useCategoryFilter() {
  const context = useContext(CategoryFilterContext);
  if (!context) {
    throw new Error('useCategoryFilter must be used within a CategoryFilterProvider');
  }
  return context;
}

export function useCategoryFilterOptional() {
  return useContext(CategoryFilterContext);
}
