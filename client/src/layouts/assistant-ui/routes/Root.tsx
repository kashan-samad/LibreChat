import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMediaQuery } from '@librechat/client';
import type { ContextType } from '~/common';
import { MobileNav, NAV_WIDTH } from '~/components/Nav';
import { Nav } from './../components/Nav';

export default function Root() {
  const [navVisible, setNavVisible] = useState(() => {
    const savedNavVisible = localStorage.getItem('navVisible');
    return savedNavVisible !== null ? JSON.parse(savedNavVisible) : true;
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  return (
    <>
      <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
      <div
        className="relative flex h-full max-w-full flex-1 flex-col overflow-hidden"
        style={
          isSmallScreen
            ? {
                transform: navVisible ? `translateX(${NAV_WIDTH.MOBILE}px)` : 'translateX(0)',
                transition: 'transform 0.2s ease-out',
              }
            : undefined
        }
      >
        <MobileNav navVisible={navVisible} setNavVisible={setNavVisible} />
        <Outlet context={{ navVisible, setNavVisible } satisfies ContextType} />
      </div>
    </>
  );
}
