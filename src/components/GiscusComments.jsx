import React, { useEffect, useRef, useState, Suspense } from "react";

const Giscus = React.lazy(() => import('@giscus/react'));

export default function GiscusComments() {
  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect(); // Stop observing once loaded
        }
      },
      {
        rootMargin: '200px', // Pre-load just before it's in view
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <Suspense fallback={<div>Loading comments...</div>}>
          <Giscus
            repo="francis-dotcom/Scafblog"
            repoId="R_kgDOPLlzgQ"
            category="Blog Comments"
            categoryId="DIC_kwDOPLlzgc4Cta5V"
            mapping="pathname"
            strict="0"
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition="bottom"
            theme="preferred_color_scheme"
            lang="en"
            crossorigin="anonymous"
          />
        </Suspense>
      ) : (
        <div>Comments will load when you scroll here...</div>
      )}
    </div>
  );
}
