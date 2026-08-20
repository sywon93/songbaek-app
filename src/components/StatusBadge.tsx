import { CheckCircle2, CircleDashed, Hourglass, PlayCircle } from "lucide-react";
import type { RecordStatus } from "@/lib/mock/types";

const STATUS_MAP: Record<
  RecordStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  none: {
    label: "미시작",
    className: "bg-gray-100 text-gray-500",
    icon: CircleDashed,
  },
  started: {
    label: "시작함",
    className: "bg-blue-50 text-blue-600",
    icon: PlayCircle,
  },
  submitted: {
    label: "승인 대기",
    className: "bg-amber-50 text-amber-600",
    icon: Hourglass,
  },
  approved: {
    label: "승인 완료",
    className: "bg-green-50 text-green-700",
    icon: CheckCircle2,
  },
};

export function StatusBadge({ status }: { status: RecordStatus }) {
  const { label, className, icon: Icon } = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
