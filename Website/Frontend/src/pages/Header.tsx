import React from "react";
import logo from "../assets/ResEViT-Road.png";
import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { FaHome, FaChartBar } from "react-icons/fa";

const Header: React.FC = () => {
  const location = useLocation();

  const NavLink: React.FC<{ to: string; text: string; icon: React.ReactNode }> = ({ 
    to, 
    text, 
    icon 
  }) => {
    const isActive = location.pathname === to;

    return (
      <Link
        to={to}
        className={`px-4 py-2 rounded-lg flex items-center space-x-2 font-medium transition-all duration-300
          ${isActive 
            ? "bg-white text-green-700 shadow-md transform scale-105" 
            : "text-white hover:bg-green-600 hover:bg-opacity-30"}
        `}
      >
        <span className="text-lg">{icon}</span>
        <span>{text}</span>
      </Link>
    );
  };

  NavLink.propTypes = {
    to: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
  };

  return (
    <div className="w-full">
      <header className=" mx-auto px-6 py-4 bg-gradient-to-r from-green-800 to-green-700 rounded-b-lg shadow-lg flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="bg-white p-1 rounded-full shadow-md">
            <img
              src={logo}
              alt="Logo"
              className="h-10 w-10 rounded-full"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ResEViT-Road</h1>
            <p className="text-xs text-green-100 opacity-80">Road Condition Monitoring System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-4">
          <NavLink to="/imageManagement" text="Images" icon={<FaHome />} />
          <NavLink to="/dashboard" text="Dashboard" icon={<FaChartBar />} />
          
        
        </nav>
      </header>
    </div>
  );
};

export default Header;