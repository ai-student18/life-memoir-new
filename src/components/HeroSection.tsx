
import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Book } from 'lucide-react';

const HeroSection = () => {
  return (
    <section id="hero" className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden pt-[72px]">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: "url('/lovable-uploads/582c47b7-d36c-4beb-afb9-519605dbe4da.png')",
        filter: "brightness(0.7)"
      }}></div>
      
      {/* Single overlay layer with appropriate opacity */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      
      {/* Content - Single instance only */}
      <div className="relative z-10 text-center max-w-3xl px-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white drop-shadow-lg">
          Write your life story with ease and warmth
        </h1>
        
        <p className="text-lg md:text-xl mb-10 text-white drop-shadow-md">
          The platform that turns messy memories into a professional, heartfelt book
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Primary button */}
          <Button className="primary-button text-lg px-6 py-6">
            <Pencil className="mr-2 h-5 w-5" />
            Start Writing
          </Button>
          
          {/* Secondary button - Dark blue background for better visibility */}
          <Button variant="outline" className="secondary-button bg-[#1a365d] text-white border-white text-lg px-6 py-6 hover:bg-[#1a365d] hover:bg-opacity-90">
            <Book className="mr-2 h-5 w-5" />
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
