import { WifiOff, type LucideIcon } from "lucide-react";

import { Card } from "./Card";

interface IntegrationStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function IntegrationState({
  title = "No information yet",
  description = "This feature requires backend integration. It will become available after the service is connected.",
  icon: Icon = WifiOff,
  action,
}: IntegrationStateProps) {
  return (
    <div role="alert">
      <Card padding="lg">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
            <Icon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
          {action ? <div className="mt-6">{action}</div> : null}
        </div>
      </Card>
    </div>
  );
}
