"use client";

export function LogoutButton() {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <button className="button ghost" onClick={logout}>
      Log ud
    </button>
  );
}
