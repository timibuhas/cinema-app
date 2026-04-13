import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold leading-none">{value}</p>
            {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {Icon ? (
            <div className="rounded-lg bg-muted p-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
