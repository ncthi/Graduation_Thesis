import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sider: React.FC = () => {
  const location = useLocation();

  const NavLink: React.FC<{ to: string; text: string }> = ({ to, text }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
          isActive
            ? "bg-indigo-600 text-white"
            : "text-gray-700 hover:bg-indigo-100"
        }`}
      >
        {text}
      </Link>
    );
  };

  return (
    <nav className="flex items-center space-x-4">
      <NavLink to="/dashboard" text="Dashboard" />
      <NavLink to="/imageManagement" text="Images" />
    </nav>
  );
};

export default Sider;
