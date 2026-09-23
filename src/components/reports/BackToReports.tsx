import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function BackToReports() {
  const { t } = useTranslation("reports");

  return (
    <Link to="/admin/reports" className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-accent">
      <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2} />
      {t("backToReports")}
    </Link>
  );
}
