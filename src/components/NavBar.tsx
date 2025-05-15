import React from 'react';

const NavBar = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl md:text-2xl font-bold text-memoir-darkGray">LifeMemoir</h1>
        </div>
        <nav>
          <ul className="flex items-center gap-1 md:gap-4">
            <li>
              <a href="/" className="text-sm md:text-base px-3 py-2 text-memoir-darkGray hover:text-memoir-blueGray">
                Home
              </a>
            </li>
            <li>
              <a href="/dashboard" className="text-sm md:text-base px-3 py-2 text-memoir-darkGray hover:text-memoir-blueGray">
                Dashboard
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
