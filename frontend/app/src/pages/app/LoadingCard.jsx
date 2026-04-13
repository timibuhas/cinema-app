import { Card, CardContent } from "@/components/ui/card";

export default function LoadingCard({ message = "Loading..." }) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="p-6 text-sm text-muted-foreground">{message}</CardContent>
    </Card>
  );
}
