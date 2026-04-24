import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, LogOut, Link2, Settings } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "@/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export function TopNav() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const user = useQuery(api.users.currentUser);
  const { setCommandPaletteOpen } = useAppStore();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "M";

  return (
    <>
      <div
        className="flex items-center gap-3 shrink-0 px-6"
        data-testid="topnav"
        style={{ height: 52, borderBottom: "1px solid var(--rule)", background: "var(--paper)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <div
            className="flex items-center justify-center rounded-lg text-white text-base font-medium shrink-0"
            data-testid="topnav-logo"
            style={{ width: 28, height: 28, background: "var(--ink)", fontFamily: "var(--font-display)", boxShadow: "0 0 0 1.5px var(--accent-color)" }}
          >
            M
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Marginalia
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            data-testid="topnav-search-button"
            className="flex items-center gap-2 px-3 rounded-full text-sm transition-colors"
            style={{ width: 420, maxWidth: "100%", height: 32, border: "1px solid var(--rule)", background: "var(--paper-2)", color: "var(--ink-4)" }}
          >
            <Search size={13} />
            <span className="flex-1 text-left text-xs">Search highlights, sources, notes…</span>
            <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "1px 5px", borderRadius: 4, border: "1px solid var(--rule-2)", background: "var(--paper)", color: "var(--ink-3)" }}>⌘K</kbd>
          </button>
        </div>

        {/* Ask Marginalia (placeholder) */}
        <button
          onClick={() => setAiDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 rounded-lg text-xs transition-colors"
          style={{ height: 30, border: "1px solid var(--rule)", color: "var(--ink-2)" }}
        >
          <Sparkles size={12} style={{ color: "var(--accent-2)" }} />
          Ask Marginalia
        </button>

        {/* Avatar / menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full overflow-hidden" style={{ width: 30, height: 30 }}>
              <Avatar style={{ width: 30, height: 30 }}>
                <AvatarImage src={user?.image ?? ""} />
                <AvatarFallback style={{ background: "oklch(70% 0.08 40)", color: "var(--paper)", fontSize: 12, fontWeight: 500 }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>{user?.name ?? "User"}</p>
              <p className="text-xs" style={{ color: "var(--ink-4)" }}>{user?.email ?? ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/connect-extension")} className="gap-2 text-xs cursor-pointer">
              <Link2 size={12} /> Connect extension
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 text-xs cursor-pointer">
              <Settings size={12} /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()} className="gap-2 text-xs cursor-pointer text-red-600">
              <LogOut size={12} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AI coming soon dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent style={{ maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>Ask Marginalia</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: "var(--accent-2)" }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>Coming soon</span>
            </div>
            <p className="text-sm" style={{ color: "var(--ink-3)", lineHeight: 1.6 }}>
              AI-powered search across your highlights is on the roadmap. You'll be able to ask questions like "What have I read about attention?" and get answers grounded in your own library.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
