
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      <h1>LifeCare CRM</h1>
      <p>Life Insurance Customer Management System</p>

      <a
        href="/login"
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: "#1d4ed8",
          color: "#ffffff",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        Open CRM Login
      </a>
    </main>
  );
}
