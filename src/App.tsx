import React from "react";
import Home from "./ui/pages/Home";
import "./index.css";

export default function App() {
  return (
    <div className="window">
      <div className="titlebar">
        Firebird Recovery — Processo GFIX + Backup/Restore
      </div>
      <div className="content">
        <Home />
      </div>
      <footer
        style={{
          textAlign: "center",
          padding: "6px",
          fontSize: "12px",
          borderTop: "1px solid #ccc",
          backgroundColor: "#f5f5f5",
        }}
      >
        © {new Date().getFullYear()} Alfabiz Soluções
      </footer>
    </div>
  );
}
