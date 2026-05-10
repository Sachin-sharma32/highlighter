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
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "M";

  return (
    <>
      <div
        className="flex h-[52px] shrink-0 items-center gap-3 border-b border-rule bg-paper px-6"
        data-testid="topnav"
      >
        {/* Logo */}
        <div className="mr-2 flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink font-display text-base font-medium text-white shadow-[0_0_0_1.5px_var(--accent-color)]"
            data-testid="topnav-logo"
          >
            M
          </div>
          <span className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
            Marginalia
          </span>
        </div>

        {/* Search */}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            data-testid="topnav-search-button"
            className="flex h-8 w-[420px] max-w-full items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 text-sm text-ink-4 transition-colors"
          >
            <Search size={13} />
            <span className="flex-1 text-left text-xs">
              Search highlights, sources, notes…
            </span>
            <kbd className="rounded border border-rule-2 bg-paper px-1.5 py-px font-mono text-[10px] text-ink-3">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Ask Marginalia (placeholder) */}
        <button
          onClick={() => setAiDialogOpen(true)}
          className="flex h-[30px] items-center gap-1.5 rounded-lg border border-rule px-3 text-xs text-ink-2 transition-colors"
        >
          <Sparkles size={12} className="text-accent-2" />
          Ask Marginalia
        </button>

        {/* Avatar / menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-[30px] w-[30px] overflow-hidden rounded-full">
              <Avatar className="h-[30px] w-[30px]">
                <AvatarImage src={user?.image ?? ""} />
                <AvatarFallback className="bg-[oklch(70%_0.08_40)] text-[12px] font-medium text-paper">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-ink">
                {user?.name ?? "User"}
              </p>
              <p className="text-xs text-ink-4">{user?.email ?? ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/connect-extension")}
              className="cursor-pointer gap-2 text-xs"
            >
              <Link2 size={12} /> Connect extension
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/settings")}
              className="cursor-pointer gap-2 text-xs"
            >
              <Settings size={12} /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void signOut()}
              className="cursor-pointer gap-2 text-xs text-red-600"
            >
              <LogOut size={12} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AI coming soon dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Ask Marginalia
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-accent-2" />
              <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
                Coming soon
              </span>
            </div>
            <p className="text-sm leading-[1.6] text-ink-3">
              AI-powered search across your highlights is on the roadmap. You'll
              be able to ask questions like "What have I read about attention?"
              and get answers grounded in your own library.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
