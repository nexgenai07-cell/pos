import { Download, Printer } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ReportExportBar({ onExportCsv }: { onExportCsv: () => void }) {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="secondary" size="sm" onClick={onExportCsv}>
        <Download className="h-3.5 w-3.5" strokeWidth={2} />
        Export CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5" strokeWidth={2} />
        Print
      </Button>
    </div>
  );
}
