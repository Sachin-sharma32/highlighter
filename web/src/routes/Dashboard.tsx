import { TopNav } from "@/components/TopNav";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--paper)" }}>
      <TopNav />
      <div className="flex flex-1 items-center justify-center" style={{ background: "var(--paper)" }}>
        <p style={{ fontSize: 13, color: "var(--ink-4)" }}>Your library will appear here.</p>
      </div>
    </div>
  );
}
