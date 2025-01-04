import React from "react";

const LoopingLogo = ({ className, width = 200, height = 200, spacing = 5 }) => {
  const generateCircles = () => {
    const circles = [];
    const maxRadius = 50; // Rayon maximum

    for (let radius = spacing; radius <= maxRadius; radius += spacing) {
      circles.push(
        <circle
          key={radius}
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#circleGradient)"
          strokeWidth="1.5"
        />
      );
    }
    return circles;
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={width}
      height={height}
      className={className}
    >
      <defs>
        <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#87CEEB" />
          <stop offset="100%" stopColor="#1E90FF" />
        </linearGradient>
      </defs>
      {generateCircles()}
    </svg>
  );
};

export default LoopingLogo;
