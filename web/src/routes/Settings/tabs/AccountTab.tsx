import { Check, Link2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingRow } from "../components/SettingRow";

export function AccountTab({
  user,
  onConnect,
  onSignOut,
}: {
  user: { name?: string; email?: string } | null | undefined;
  onConnect: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Account
      </h1>
      <p className="mb-8 text-sm leading-6" style={{ color: "var(--ink-3)" }}>
        Manage your Marginalia identity and connected extension.
      </p>
      <div className="flex flex-col gap-3">
        <SettingRow
          icon={<User size={16} />}
          title={user?.name ?? "User"}
          description={user?.email ?? "Signed in"}
        >
          <Check size={16} style={{ color: "var(--accent-2)" }} />
        </SettingRow>
        <SettingRow
          icon={<Link2 size={16} />}
          title="Browser extension"
          description="Generate a pairing code or reconnect the Chrome extension."
        >
          <Button variant="outline" className="h-8 text-xs" onClick={onConnect}>
            Connect
          </Button>
        </SettingRow>
        <SettingRow
          icon={<LogOut size={16} />}
          title="Sign out"
          description="End this dashboard session on the current device."
        >
          <Button
            variant="outline"
            className="h-8 text-xs text-red-600"
            onClick={onSignOut}
          >
            Sign out
          </Button>
        </SettingRow>
      </div>
    </>
  );
}
