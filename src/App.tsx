import React from "react";
import Home from "./ui/pages/Home";
import "./index.css";

export default function App() {
  return (
    <div className="window">
      <div className="titlebar">Firebird Recovery — Processo GFIX + Backup/Restore</div>
      <div className="content">
        <Home />
      </div>
    </div>
  );
}
