"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  Stethoscope,
  Users,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/patients", label: "Patients", icon: Users },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  return (
    <>
      <button
        type="button"
        className={`mobile-overlay ${open ? "is-open" : ""}`}
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <Link href="/dashboard" className="brand" onClick={onClose}>
          <span className="brand-mark">
            <Activity size={20} />
          </span>
          CareTrack
        </Link>
        <div className="nav-label">Workspace</div>
        <nav>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-label">Management</div>
        <div
          className="nav-link"
          aria-disabled="true"
          title="Available when scheduling is connected"
        >
          <CalendarDays size={18} />
          Appointments{" "}
          <span className="muted" style={{ marginLeft: "auto", fontSize: 10 }}>
            Soon
          </span>
        </div>
        <div className="sidebar-bottom">
          <div
            className="nav-link"
            aria-disabled="true"
            title="Settings become available when authentication is connected"
          >
            <span>⚙</span>Settings{" "}
            <span
              className="muted"
              style={{ marginLeft: "auto", fontSize: 10 }}
            >
              Soon
            </span>
          </div>
          <div
            className="person"
            style={{ padding: "12px 10px", fontSize: 12 }}
          >
            <span className="avatar">CT</span>
            <span>
              Care team
              <br />
              <span className="muted" style={{ fontWeight: 400 }}>
                Administration
              </span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
