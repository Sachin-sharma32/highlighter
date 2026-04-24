import { TopNav } from "@/components/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { HighlightList } from "@/components/HighlightList";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--paper)" }}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <HighlightList />
        <div className="flex flex-1 items-center justify-center" style={{ background: "var(--paper)" }}>
          <p style={{ fontSize: 13, color: "var(--ink-4)" }}>Select a highlight to read it here.</p>
        </div>
      </div>
    </div>
  );
}
