import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ModeToggle } from "@/components/ui/ModeToggle";

const Header = () => {
  return (
    <nav className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 shadow-md px-8 py-4">
      {/* Logo section */}
      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
        <span className="mr-2">🚀</span>
        Looping
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <ModeToggle />
        <ConnectButton />
      </div>
    </nav>
  );
};

export default Header;
