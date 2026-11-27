import { Link } from "react-router";
import { CopyPlus, ChevronRight } from "lucide-react";
import { Card } from "@/ui/Card";
import { ThemeSwitch } from "@/features/shell/ThemeSwitch";
import { ConnectionCard } from "./ConnectionCard";
import { SyncCard } from "./SyncCard";

export function SettingsPage() {
  return (
    <div className="grid max-w-2xl gap-4">
      <ConnectionCard />
      <SyncCard />
      <Card title="Appearance">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-xs text-muted">System follows your device setting.</p>
          </div>
          <div className="w-full sm:w-72">
            <ThemeSwitch showLabels />
          </div>
        </div>
      </Card>

      {/* Templates isn't in the phone bottom bar, so link it here. */}
      <Card title="More" className="md:hidden">
        <Link
          to="/templates"
          className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-surface-muted"
        >
          <CopyPlus size={18} className="text-muted" aria-hidden />
          <span className="flex-1 font-medium">Templates</span>
          <ChevronRight size={16} className="text-muted" aria-hidden />
        </Link>
      </Card>
    </div>
  );
}
