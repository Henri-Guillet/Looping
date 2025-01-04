import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ModeToggle } from "@/components/ui/ModeToggle";
import LoopingLogo from "@/components/logo/LoopingLogo";

const Header = () => {
  return (
    <nav className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 shadow-md px-8 py-4">
      {/* Logo section */}
      <div className="flex items-center gap-4">
        <LoopingLogo className="w-10 h-10" />
        <div
          className="text-2xl font-bold"
          style={{
            background: "linear-gradient(90deg, #87CEFA, #4682B4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Looping
        </div>
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
