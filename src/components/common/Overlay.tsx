import type { ReactNode } from "react";

export default function Overlay({
  onClose,
  children,
  contentClassName = "",
}: {
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 my-auto max-h-[calc(100vh-1.5rem)] w-full overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[90vh] ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
