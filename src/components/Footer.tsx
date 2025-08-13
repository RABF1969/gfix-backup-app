import React from "react";

/** Rodapé padrão reutilizável */
export default function Footer() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} Alfabiz Soluções
    </footer>
  );
}
