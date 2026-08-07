export default function Breadcrumb({ view, NAV, onNavigate }) {
  const navItem = NAV?.find(n => n.id === view)

  return (
    <nav className="flex items-center gap-1.5 text-xs text-text3 mb-4 select-none" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={() => onNavigate?.('editable')}
        className="hover:text-text1 transition-colors cursor-pointer"
      >
        Inicio
      </button>

      {navItem?.section && (
        <>
          <span>›</span>
          <span>{navItem.section}</span>
        </>
      )}

      {navItem?.label && (
        <>
          <span>›</span>
          <span className="text-text1 font-medium">{navItem.label}</span>
        </>
      )}
    </nav>
  )
}
