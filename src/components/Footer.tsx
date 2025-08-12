import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="w-full text-center py-3 bg-gray-100 border-t border-gray-300 text-sm text-gray-600 fixed bottom-0 left-0">
      © {new Date().getFullYear()} Alfabiz Soluções
    </footer>
  );
};

export default Footer;
