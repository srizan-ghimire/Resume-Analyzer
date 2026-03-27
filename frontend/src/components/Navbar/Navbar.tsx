import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, BrainCircuit } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleNavbar = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 py-3 backdrop-blur-lg border-b border-neutral-700/80">
        <div className="container px-4 mx-auto text-sm relative">
          <div className="flex justify-between items-center">
            <Link to={"/"} className="flex items-center flex-shrink-0">
              <BrainCircuit className=" h-10 w-16" />
              <span className="text-2xl font-bold text-teal-950">ARSS</span>
            </Link>
            <ul className=" hidden lg:flex ml-96 space-x-12 text-teal-950">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#how-it-works">How it works</a>
              </li>

              <li>
                <a href="https://www.overleaf.com/">Build Resume</a>
              </li>
            </ul>
            <div className=" hidden lg:flex justify-center items-center"></div>
            <div className="lg:hidden md:flex flex-col justify-end">
              <button onClick={toggleNavbar}>
                {mobileDrawerOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
          {mobileDrawerOpen && (
            <div className=" fixed right-0 z-20 bg-white w-full p-12 flex flex-col justify-center items-center lg:hidden">
              <ul>
                <li className=" py-4">
                  <a href="#">Features</a>
                </li>
                <li className=" py-4">
                  <a href="#">How it works</a>
                </li>
                <li className=" py-4">
                  <a href="#">Contact</a>
                </li>
                <li>
                  <a href="https://www.overleaf.com/">Build Resume</a>
                </li>
              </ul>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
