import { Building2 } from "lucide-react";

interface ModulePlaceholderPageProps {
  title: string;
  description?: string;
  module: string;
}

export function ModulePlaceholderPage({ title, description, module }: ModulePlaceholderPageProps) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Building2 size={28} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">{title}</h1>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning ring-1 ring-warning/30">
            Awaiting backend integration
          </span>
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          {description ??
            `The ${module} module will be available once the backend APIs are integrated.`}
        </p>
      </div>
    </div>
  );
}
