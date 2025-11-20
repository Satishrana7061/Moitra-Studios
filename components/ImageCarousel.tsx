import React from 'react';

const IMAGES = [
  'Lalu-Parsad-Yadav-Candidate-Details-Screen.jpg',
  'Rajneeti-Game-Daily-Reward-Screen.png',
  'Rajneeti-Game-Fund-Raise-Screen.jpg',
  'Rajneeti-Game-Headquarter-Builder-Screen.jpg',
  'Rajneeti-Game-Main-Screen.png',
  'Rajneeti-Game-Match-Making-Screen.png',
  'Rajneeti-Game-Matchmaking-Screen-2.png',
  'Rajneeti-Game-Play-Screen.jpg',
  'Rajneeti-Game-Speech-Screen.jpg',
  'Rajneeti-Game-War-Card-Screen.jpg',
  'Rajneeti-Loading-Screen.png'
];

const ImageCarousel: React.FC = () => {
  const getImagePath = (filename: string) => {
    return `${import.meta.env.BASE_URL}images/rajneeti/${filename}`;
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="flex h-full w-max animate-marquee">
        {/* First Set */}
        <div className="flex h-full shrink-0">
            {IMAGES.map((img, index) => (
                <div key={`original-${index}`} className="h-full w-[120vh] shrink-0 px-0">
                    <img 
                        src={getImagePath(img)}
                        alt={`Rajneeti Game Screenshot ${index + 1}`}
                        className="h-full w-full object-cover opacity-100"
                        loading="lazy"
                    />
                </div>
            ))}
        </div>
        {/* Duplicate Set for seamless loop */}
        <div className="flex h-full shrink-0">
            {IMAGES.map((img, index) => (
                <div key={`duplicate-${index}`} className="h-full w-[120vh] shrink-0 px-0">
                    <img 
                        src={getImagePath(img)}
                        alt={`Rajneeti Game Screenshot ${index + 1}`}
                        className="h-full w-full object-cover opacity-100"
                        loading="lazy"
                    />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;
