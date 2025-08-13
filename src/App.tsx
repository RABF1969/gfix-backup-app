// src/App.tsx
import React from "react";
import Home from "./ui/pages/Home";
import "./index.css";

/**
 * App raiz simples: não envolve a UI em nenhum wrapper (.window).
 * Isso elimina a “caixa” com borda/sombra/rolagem.
 */
export default function App() {
  return <Home />;
}
