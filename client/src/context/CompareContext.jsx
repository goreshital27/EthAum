import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext();

const MAX_COMPARE_LIMIT = 3;

export function CompareProvider({ children }) {
  // Store array of hospital objects: [{ slug, name }]
  const [selectedHospitals, setSelectedHospitals] = useState(() => {
    try {
      const stored = sessionStorage.getItem('ethaum_compare_hospitals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [limitNotice, setLimitNotice] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('ethaum_compare_hospitals', JSON.stringify(selectedHospitals));
    } catch {
      // ignore session storage errors
    }
  }, [selectedHospitals]);

  const isComparing = (slug) => {
    return selectedHospitals.some((h) => h.slug === slug);
  };

  const addHospital = ({ slug, name }) => {
    if (isComparing(slug)) return;

    if (selectedHospitals.length >= MAX_COMPARE_LIMIT) {
      setLimitNotice(true);
      setTimeout(() => setLimitNotice(false), 4000);
      return false;
    }

    setSelectedHospitals((prev) => [...prev, { slug, name }]);
    return true;
  };

  const removeHospital = (slug) => {
    setSelectedHospitals((prev) => prev.filter((h) => h.slug !== slug));
  };

  const toggleHospital = ({ slug, name }) => {
    if (isComparing(slug)) {
      removeHospital(slug);
      return false;
    } else {
      return addHospital({ slug, name });
    }
  };

  const clearComparison = () => {
    setSelectedHospitals([]);
  };

  const setFromSlugs = (hospitalsList) => {
    setSelectedHospitals(hospitalsList.slice(0, MAX_COMPARE_LIMIT));
  };

  return (
    <CompareContext.Provider
      value={{
        selectedHospitals,
        isComparing,
        addHospital,
        removeHospital,
        toggleHospital,
        clearComparison,
        setFromSlugs,
        limitNotice,
        setLimitNotice,
        maxLimit: MAX_COMPARE_LIMIT,
        canAddMore: selectedHospitals.length < MAX_COMPARE_LIMIT,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
