const InfoIcon = ({ size = 20}) => {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`text-foreground cursor-pointer`}
      >
        <path
          d="M8 0C3.589 0 0 3.589 0 8s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8zm0 14.546A6.553 6.553 0 011.455 8 6.553 6.553 0 018 1.455 6.553 6.553 0 0114.546 8 6.553 6.553 0 018 14.546z"
          fill="currentColor"
        ></path>
        <path
          d="M8 3.394a.97.97 0 000 1.94.97.97 0 000-1.94zM8 6.788a.727.727 0 00-.727.727v4.364a.727.727 0 001.454 0V7.515A.727.727 0 008 6.788z"
          fill="currentColor"
        ></path>
      </svg>
    );
  };
  
  export default InfoIcon;
  