
import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-12 h-[72px] transition-all duration-300 bg-white shadow-sm`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between h-full">
        {/* Logo and Website Name */}
        <div className="flex items-center">
          <div className="h-10 w-10 mr-3 flex items-center justify-center">
            <img src="/lovable-uploads/06435c8d-3aa2-4f47-b98f-e959cedabf1f.png" alt="LifeMemoir Logo" className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold text-memoir-darkGray">LifeMemoir</h1>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="space-x-6">
            <a href="#hero" className="text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Home</a>
            <a href="#how-it-works" className="text-memoir-darkGray hover:text-memoir-blueGray transition-colors">How It Works</a>
            <a href="#portfolio" className="text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Portfolio</a>
            <a href="#testimonials" className="text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Testimonials</a>
            <a href="#faq" className="text-memoir-darkGray hover:text-memoir-blueGray transition-colors">FAQ</a>
            <a href="#contact" className="text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Contact</a>
          </div>
          
          <div className="flex items-center space-x-3">
            {user ? (
              <Button variant="outline" className="secondary-button" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <>
                <Button variant="outline" className="secondary-button" as={Link} to="/auth">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button className="primary-button" as={Link} to="/auth" onClick={() => document.querySelector<HTMLButtonElement>('button[type="button"]')?.click()}>
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Mobile Menu Button */}
        <button onClick={toggleMobileMenu} className="md:hidden text-memoir-darkGray">
          {isMobileMenuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>
      </div>
      
      {/* Mobile Menu */}
      <div className={`md:hidden fixed top-[72px] right-0 bottom-0 w-64 bg-white shadow-lg transform transition-transform ease-in-out duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col p-6">
          <a href="#hero" className="py-2 text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Home</a>
          <a href="#how-it-works" className="py-2 text-memoir-darkGray hover:text-memoir-blueGray transition-colors">How It Works</a>
          <a href="#portfolio" className="py-2 text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Portfolio</a>
          <a href="#testimonials" className="py-2 text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Testimonials</a>
          <a href="#faq" className="py-2 text-memoir-darkGray hover:text-memoir-blueGray transition-colors">FAQ</a>
          <a href="#contact" className="py-2 text-memoir-darkGray hover:text-memoir-blueGray transition-colors">Contact</a>
          
          <div className="mt-6 space-y-3">
            {user ? (
              <Button variant="outline" className="w-full secondary-button" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : (
              <>
                <Button variant="outline" className="w-full secondary-button" as={Link} to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button className="w-full primary-button" as={Link} to="/auth" onClick={() => {
                  setIsMobileMenuOpen(false);
                  setTimeout(() => document.querySelector<HTMLButtonElement>('button[type="button"]')?.click(), 100);
                }}>
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
