//Top nav with logo + login/signup
import React from "react";
import "./Navbar.css";  // create CSS separately

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <div className="logo-icon">💳</div> {/* temporary icon */}
        <span className="logo-text">OnPoint</span>
      </div>
      <div className="nav-buttons">
        <button className="btn btn-outline">Log in</button>
        <button className="btn btn-primary">Sign up</button>
      </div>
    </nav>
  );
}
