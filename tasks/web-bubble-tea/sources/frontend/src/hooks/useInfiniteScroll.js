import { useRef, useEffect } from 'react';

const useInfiniteScroll = (callback, loading, hasMore) => {
  const observer = useRef();
  const lastElementRef = useRef();
  
  useEffect(() => {
    if (loading) return;
    
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    };
    
    const handleObserver = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore) {
        callback();
      }
    };
    
    observer.current = new IntersectionObserver(handleObserver, options);
    
    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
    
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, callback]);
  
  return lastElementRef;
};

export default useInfiniteScroll;