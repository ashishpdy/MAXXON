export default function NavToggle({ open, onToggle, openLabel, closeLabel }) {
  return (
    <button
      type="button"
      className={`nav-toggle${open ? " is-open" : ""}`}
      aria-expanded={open}
      aria-controls="mobile-nav"
      aria-label={open ? closeLabel : openLabel}
      onClick={onToggle}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
