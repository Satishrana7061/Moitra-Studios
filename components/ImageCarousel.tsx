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
      <div className="relative w-full h-full">
        {/* Scrolling Images - Right to Left */}
        <div className="absolute inset-0 animate-scroll-left">
          <div className="flex h-full gap-4">
            {/* First set of images */}
            {images.map((image, index) => (
              <div
                key={`first-${index}`}
                className="flex-shrink-0 w-96 h-full"
              >
                <img
                  src={image}
                  alt={`Game screenshot ${index + 1}`}
                  className="w-full h-full object-cover opacity-50 hover:opacity-70 transition-opacity duration-300"
                />
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {images.map((image, index) => (
              <div
                key={`second-${index}`}
                className="flex-shrink-0 w-96 h-full"
              >
                <img
                  src={image}
                  alt={`Game screenshot ${index + 1}`}
                  className="w-full h-full object-cover opacity-50 hover:opacity-70 transition-opacity duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gradient Overlays for fade effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-lokBlue-950 via-transparent to-lokBlue-950 z-10 pointer-events-none" />
      </div>
    </div>
  );
};

export default ImageCarousel;
