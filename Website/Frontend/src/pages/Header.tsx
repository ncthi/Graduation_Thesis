import React from "react";
import logo from "../assets/logo.png";
import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

const Header: React.FC = () => {
  const location = useLocation();

  const NavLink: React.FC<{ to: string; text: string }> = ({ to, text }) => {
    const isActive = location.pathname === to;

    return (
      <Link
        to={to}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
          ${isActive 
            ? "bg-white text-green-700 shadow-md" 
            : "text-white hover:bg-green-600 hover:bg-opacity-30"}
        `}
      >
        {text}
      </Link>
    );
  };

  NavLink.propTypes = {
    to: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  };

  return (
    <header className="w-full px-6 py-4 bg-green-900 shadow-md flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <img
          src={logo}
          alt="Logo"
          className="h-10 w-10 rounded-full object-cover border-2 border-white"
        />
        <span className="text-xl font-bold text-white">ResEViT-Road</span>
      </div>

      {/* Navigation */}
      <nav className="flex items-center space-x-4">
        <NavLink to="/imageManagement" text="Home" />
        <NavLink to="/dashboard" text="Dashboard" />
      </nav>
    </header>
  );
};

export default Header;
