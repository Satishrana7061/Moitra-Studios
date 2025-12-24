import React from 'react';

const ImageCarousel: React.FC = () => {
  const images = [
    '/Rajneeti-Loading-Screen.png',
    '/Rajneeti-Game-Main-Screen.png',
    '/Rajneeti-Game-Play-Screen.jpg',
    '/Rajneeti-Game-Match-Making-Screen.png',
    '/Rajneeti-Game-Matchmaking-Screen-2.png',
    '/Rajneeti-Game-Speech-Screen.jpg',
    '/Rajneeti-Game-War-Card-Screen.jpg',
    '/Rajneeti-Game-Fund-Raise-Screen.jpg',
    '/Rajneeti-Game-Headquarter-Builder-Screen.jpg',
    '/Rajneeti-Game-Daily-Reward-Screen.png',
    '/Lalu-Parsad-Yadav-Candidate-Details-Screen.jpg',
  ]; 

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Carousel Container */}
      <div className="relative w-full h-full [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        {/* Scrolling Images - Right to Left (two lanes for depth) */}
        <div className="absolute inset-0 flex flex-col gap-6">
          <div className="animate-scroll-left">
            <div className="flex h-64 md:h-80 gap-4">
              {[...images, ...images].map((image, index) => (
                <div key={`lane1-${index}`} className="flex-shrink-0 w-80 md:w-96 h-full">
                  <img
                    src={image}
                    alt={`Game screenshot ${index + 1}`}
                    className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="animate-scroll-left" style={{ animationDuration: '55s' }}>
            <div className="flex h-52 md:h-64 gap-4">
              {[...images.slice().reverse(), ...images.slice().reverse()].map((image, index) => (
                <div key={`lane2-${index}`} className="flex-shrink-0 w-72 md:w-80 h-full">
                  <img
                    src={image}
                    alt={`Game screenshot ${index + 1}`}
                    className="w-full h-full object-cover opacity-50 hover:opacity-75 transition-opacity duration-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gradient Overlays for fade effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-lokBlue-950 via-transparent to-lokBlue-950 z-10 pointer-events-none" />
      </div>
    </div>
  );
};

export default ImageCarousel;
