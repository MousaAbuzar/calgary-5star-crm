import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        {/* Place your logo at client/public/logo.png — it will appear here automatically */}
        <img
          src="/logo.png"
          alt="Calgary 5 Star Cleaning"
          className="navbar-logo"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {/* Text fallback — shown if logo.png is missing */}
        <div className="navbar-brand-text">
          <div className="navbar-brand-top">
            <span className="navbar-brand-calgary">CALGARY</span>
            <span className="navbar-brand-5star">5 STAR</span>
          </div>
          <div className="navbar-brand-cleaning">CLEANING</div>
        </div>
      </Link>

      <div className="navbar-links">
        <Link to="/dashboard"  className={isActive('/dashboard')}>Dashboard</Link>
        <Link to="/customers"  className={isActive('/customers')}>Customers</Link>
        <Link to="/campaigns"  className={isActive('/campaigns')}>Campaigns</Link>
        <Link to="/calendar"   className={isActive('/calendar')}>Calendar</Link>
        <Link to="/emails"     className={isActive('/emails')}>Emails</Link>
      </div>
    </nav>
  );
}

export default Navbar;
