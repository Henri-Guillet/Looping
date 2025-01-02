import { Card, CardContent } from "@/components/ui/card";

const StatOverviewCard = ({ value, unit, label, icon: Icon, formatValue, children }) => {
  return (
    <Card className="border bg-muted">
      <CardContent className="flex items-center justify-between h-full px-6 py-4">
        <div className="flex flex-col space-y-1">
          <p className="text-lg text-foreground ">
            {value !== undefined ? `${formatValue(value)} ${unit}` : "N/A"}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        {children ? (
          children
        ) : (
          <div className="text-ocean-blue-pure w-12 h-12">
            {Icon && <Icon />}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatOverviewCard;