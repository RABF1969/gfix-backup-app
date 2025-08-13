import React, { useEffect, useState } from "react";
import Home from "./ui/pages/Home";
import AdvancedSettings from "./ui/pages/AdvancedSettings";
import "./index.css";

type View = "home" | "settings";

export default function App() {
  const [view, setView] = useState<View>("home");

  // abre Configurações quando o Home dispara o evento
  useEffect(() => {
    const open = () => setView("settings");
    window.addEventListener("ui:open-settings", open as EventListener);
    return () => window.removeEventListener("ui:open-settings", open as EventListener);
  }, []);

  return (
    <div className="window">
      {/* Titlebar sem botões próprios — usamos os nativos do Windows */}
      <div className="titlebar">
        Firebird Recovery — Processo GFIX + Backup/Restore
      </div>

      <div className="content">
        {view === "home" && (
          <Home onOpenSettings={() => setView("settings")} />
        )}

        {view === "settings" && (
          <>
            <AdvancedSettings />
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn" onClick={() => setView("home")}>Voltar</button>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "#666", padding: "8px 0" }}>
        © 2025 Alfabiz Soluções
      </div>
    </div>
  );
}
