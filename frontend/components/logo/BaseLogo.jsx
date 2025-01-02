const BaseLogo = () => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full"
      >
        <rect
          x="1"
          y="1"
          width="22"
          height="22"
          rx="11"
          fill="url(#base_svg__base-n4p46wggl)"
        ></rect>
        <path
          d="M11.99 18c3.32 0 6.01-2.686 6.01-6s-2.69-6-6.01-6A6.007 6.007 0 006 11.496h7.944v1.008H6A6.007 6.007 0 0011.99 18z"
          fill="#fff"
        ></path>
        <defs>
          <linearGradient
            id="base_svg__base-n4p46wggl"
            x1="12"
            y1="2"
            x2="12"
            y2="22"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#427FFF"></stop>
            <stop offset="1" stopColor="#0052FF"></stop>
          </linearGradient>
        </defs>
      </svg>
    );
  };
  
  export default BaseLogo;
  