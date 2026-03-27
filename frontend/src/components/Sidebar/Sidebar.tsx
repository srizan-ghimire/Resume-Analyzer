import { useState } from "react";
import { Menu, X } from "lucide-react";
import Modal from "../reusable/Modal";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router";
const menuItems = [
  { name: "Dashboard", path: "/home" },
  { name: "Personalized Jobs", path: "/personalized-jobs" },
  { name: "Applied Jobs", path: "/applications" },
  { name: "Upload Resume", path: "/profile" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { logOut } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-400 text-black w-64 p-4 transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-64"
        } md:translate-x-0`}
      >
        <div className="flex justify-between items-center mb-6">
          <img src="/logo.png" alt="logo" />
          <button className="md:hidden" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <ul className="space-y-4">
          {menuItems.map((item, index) => (
            <li
              key={index}
              onClick={() => {
                setActiveIndex(index);
                navigate(item.path);
              }}
              className={`p-2 rounded-md transition cursor-pointer 
            ${
              activeIndex === index
                ? "bg-white text-black"
                : "hover:bg-black hover:text-white"
            }`}
            >
              {item.name}
            </li>
          ))}

          {/* Log Out Button */}
          <li className=" hover:text-[#342a7c] p-2 rounded-md transition cursor-pointer mt-96">
            <button
              className=" bg-white px-4 py-2 rounded text-black cursor-pointer"
              onClick={() => setIsLogoutOpen(true)}
            >
              Log Out
            </button>
          </li>
        </ul>
      </div>

      <Modal isOpen={isLogoutOpen} onClose={() => setIsLogoutOpen(false)}>
        <div className="bg-white p-6 rounded-lg  w-80 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Are you sure you want to logout?
          </h2>

          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={logOut}
              className="bg-red-600 text-black px-4 py-2 rounded-lg hover:bg-red-700 transition cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setIsLogoutOpen(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      </Modal>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 bg-[#342a7c] text-black p-2 rounded"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>
    </div>
  );
}
