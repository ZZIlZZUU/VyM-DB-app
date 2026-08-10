export default function Breadcrumb({ view, NAV, onNavigate }) {
  const navItem = NAV?.find(n => n.id === view)

  return (
    <nav className="flex items-center gap-1.5 text-xs text-text3 mb-4 select-none overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={() => onNavigate?.('editable')}
        className="hover:text-text1 transition-colors cursor-pointer flex-shrink-0"
      >
        Inicio
      </button>

      {navItem?.section && (
        <>
          <span className="flex-shrink-0">›</span>
          <span className="hidden sm:inline flex-shrink-0">{navItem.section}</span>
        </>
      )}

      {navItem?.label && (
        <>
          <span className="flex-shrink-0">›</span>
          <span className="text-text1 font-medium truncate max-w-[160px] sm:max-w-none">{navItem.label}</span>
        </>
      )}
    </nav>
  )
}
