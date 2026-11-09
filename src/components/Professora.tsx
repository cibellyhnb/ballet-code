/*******************************************************************************
 * Professora.tsx
 * funcao principal: desenho da professora em SVG, usado no modo professora dita
 * e no "como jogar". so desenho, sem estado.
 ******************************************************************************/
/*******************************************************************************
 * Professora
 * funcao: desenha a professora (casaquinho, coque, oculos redondos e brinco de
 * perola).
 * recebe: className (string, opcional), a classe css que define tamanho e
 * posicao. o padrao e "prof".
 * retorna: o elemento svg.
 ******************************************************************************/
export function Professora({ className = 'prof' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 96" aria-hidden>
      <ellipse cx="40" cy="92" rx="24" ry="3.5" fill="#f6c9d8" opacity="0.6" />
      {/* corpo: casaquinho */}
      <path d="M16 92 C16 70 26 62 40 62 C54 62 64 70 64 92 Z" fill="#c9a7e6" />
      <path d="M33 63 L40 76 L47 63" fill="#fff4f8" />
      <path d="M40 76 L40 92" stroke="#b18fd3" strokeWidth="1.4" />
      <circle cx="40" cy="81" r="1.6" fill="#fff" />
      <circle cx="40" cy="87" r="1.6" fill="#fff" />
      {/* pescoco e rosto */}
      <rect x="35" y="52" width="10" height="12" rx="4" fill="#f7d4bf" />
      <circle cx="40" cy="38" r="19" fill="#f9dcc8" />
      {/* cabelo + coque */}
      <circle cx="40" cy="14" r="9" fill="#7a4b3a" />
      <path d="M21 39 C19 22 28 17 40 17 C52 17 61 22 59 39 C56 30 50 25 40 25 C30 25 24 30 21 39 Z" fill="#7a4b3a" />
      <path d="M33 11 Q40 7 47 11" stroke="#f497b6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* oculos redondinhos */}
      <circle cx="32.5" cy="39" r="5.6" fill="#fff" fillOpacity="0.35" stroke="#b07a9a" strokeWidth="1.4" />
      <circle cx="47.5" cy="39" r="5.6" fill="#fff" fillOpacity="0.35" stroke="#b07a9a" strokeWidth="1.4" />
      <path d="M38 39 L42 39" stroke="#b07a9a" strokeWidth="1.4" />
      <circle cx="32.5" cy="39.5" r="1.9" fill="#4a3048" />
      <circle cx="47.5" cy="39.5" r="1.9" fill="#4a3048" />
      <circle cx="33.2" cy="38.7" r="0.6" fill="#fff" />
      <circle cx="48.2" cy="38.7" r="0.6" fill="#fff" />
      {/* bochechas e sorriso */}
      <ellipse cx="27" cy="46" rx="3.4" ry="2" fill="#f7a8c0" opacity="0.7" />
      <ellipse cx="53" cy="46" rx="3.4" ry="2" fill="#f7a8c0" opacity="0.7" />
      <path d="M36 48 Q40 52 44 48" stroke="#a45a6e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* brinquinho de perola */}
      <circle cx="21.5" cy="44" r="1.6" fill="#fff" stroke="#efd3df" strokeWidth="0.6" />
      <circle cx="58.5" cy="44" r="1.6" fill="#fff" stroke="#efd3df" strokeWidth="0.6" />
    </svg>
  )
}
