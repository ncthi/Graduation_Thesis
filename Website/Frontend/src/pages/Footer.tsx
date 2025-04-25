import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="text-green-900 text-center py-3 mt-auto">
      © {new Date().getFullYear()} ResEViT-Road. All rights reserved.
    </footer>
  );
};

export default Footer;
