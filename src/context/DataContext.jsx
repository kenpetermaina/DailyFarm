import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Pages list `version` in their effect dependencies. Calling notifyChange()
// after any add/edit/delete makes every mounted page re-query Supabase.
const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const notifyChange = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, notifyChange }), [version, notifyChange]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
