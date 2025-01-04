const Footer = () => {
    return (
      <footer className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex flex-col items-center p-6">
        <div className="text-center text-sm font-medium">
          <p>All rights reserved &copy; Alyra {new Date().getFullYear()}</p>
        </div>
      </footer>
    );
  };
  
  export default Footer;
  