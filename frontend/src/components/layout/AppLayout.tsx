import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<'idle' | 'enter'>('idle');
  const prevPathRef = useRef(location.pathname + location.search);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== prevPathRef.current) {
      prevPathRef.current = currentPath;
      setPhase('enter');
      setDisplayChildren(children);
      const t = setTimeout(() => setPhase('idle'), 400);
      return () => clearTimeout(t);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, location.search, children]);

  return (
    <div
      className={phase === 'enter' ? 'page-transition-enter page-transition-enter-active' : ''}
    >
      {displayChildren}
    </div>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
};
