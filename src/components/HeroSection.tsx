import React from 'react';
import { Button } from "@/components/ui/button";
import { Pencil, Book } from 'lucide-react';
const HeroSection = () => {
  return <section id="hero" className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: "url('/lovable-uploads/225b7f4c-4cf8-4a77-a83f-d639e84ab3f4.png')",
      filter: "brightness(0.9)"
    }}></div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl px-6 animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
          Write your life story with ease and warmth
        </h1>
        <p className="text-lg md:text-xl mb-8 text-white opacity-90">
          The platform that turns messy memories into a professional, heartfelt book
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Button className="primary-button text-lg px-6 py-6">
            <Pencil className="mr-2 h-5 w-5" />
            Start Writing
          </Button>
          <Button variant="outline" className="secondary-button text-white border-white text-lg px-6 py-6">
            <Book className="mr-2 h-5 w-5" />
            Learn More
          </Button>
        </div>
      </div>
    </section>;
};
export default HeroSection;