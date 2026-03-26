"use client";

export function Header() {
  return (
    <header
      className="sm:hidden flex items-center px-5 border-b"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        height: "56px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Mendoza Baseball Academy"
        style={{ height: 30, width: "auto", objectFit: "contain" }}
      />
    </header>
  );
}
