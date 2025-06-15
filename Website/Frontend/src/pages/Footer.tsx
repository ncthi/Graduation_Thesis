import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-green-900 to-green-700 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="border-t border-green-600 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p>© {new Date().getFullYear()} ResEViT-Road. All rights reserved.</p>
          <div className="mt-4 md:mt-0">
            <a
              href="#"
              className="text-green-100 hover:text-white transition-colors mx-2"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-green-100 hover:text-white transition-colors mx-2"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
