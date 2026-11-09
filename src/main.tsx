/*******************************************************************************
 * main.tsx
 * funcao principal: ponto de entrada do site. carrega as fontes embutidas e o
 * css geral e coloca o componente App dentro da div root do index.html.
 ******************************************************************************/
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
