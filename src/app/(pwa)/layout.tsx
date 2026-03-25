export default function PwaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        color: "#eeeeee",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}
