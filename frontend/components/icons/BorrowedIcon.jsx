
const BorrowedIcon = () => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <circle opacity=".1" cx="24" cy="24" r="24" fill="currentColor"></circle>
      <g clipPath="url(#balance_svg__clip0)" fill="currentColor">
        <path d="M14.4 21.334c-.589 0-1.066.477-1.066 1.066v10.667c0 .589.477 1.066 1.066 1.066h19.2c.589 0 1.067-.477 1.067-1.066V22.4c0-.589-.478-1.066-1.067-1.066H14.4zm2.04 2.133h15.12a1.6 1.6 0 00.973.973v6.587a1.6 1.6 0 00-.972.973H16.44a1.598 1.598 0 00-.973-.973V24.44a1.598 1.598 0 00.973-.973zM24 24.534a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zm-5.333 2.133a1.066 1.066 0 100 2.132 1.066 1.066 0 000-2.132zm10.666 0a1.066 1.066 0 100 2.133 1.066 1.066 0 000-2.133z"></path>
        <rect x="21" y="16" width="7" height="1.5" rx=".75"></rect>
        <rect x="21" y="13" width="7" height="1.5" rx=".75"></rect>
      </g>
      <defs>
        <clipPath id="balance_svg__clip0">
          <path fill="#fff" transform="translate(12 12)" d="M0 0h24v24H0z"></path>
        </clipPath>
      </defs>
    </svg>  )
}

export default BorrowedIcon