import { useEffect } from 'react';

const useClickOutside = (ref, handler, excludeSelectors = []) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      for (const selector of excludeSelectors) {
        if (event.target.closest(selector)) {
          return;
        }
      }
      
      if (ref.current && !ref.current.contains(event.target)) {
        handler();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler, excludeSelectors]);
};

export default useClickOutside;