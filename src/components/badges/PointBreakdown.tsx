import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import { usePointBreakdown } from "@/hooks/usePointHistory";

const activityTypeLabels = {
  vendor_submission: "Vendor Submissions",
  review_submission: "Reviews", 
  cost_submission: "Cost Information"
};

const colors = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))", 
  "hsl(var(--accent))",
  "hsl(var(--muted))"
];

export default function PointBreakdown() {
  const { data: breakdown = [], isLoading } = usePointBreakdown();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Point Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = breakdown.map((item, index) => ({
    name: activityTypeLabels[item.activity_type as keyof typeof activityTypeLabels] || item.activity_type,
    value: item.total_points,
    count: item.count,
    color: colors[index % colors.length]
  }));

  const totalPoints = breakdown.reduce((sum, item) => sum + item.total_points, 0);

  if (totalPoints === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Point Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No points earned yet</p>
            <p className="text-sm mt-1">Start contributing to see your breakdown!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Point Sources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} points (${props.payload.count} activities)`,
                  name
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {breakdown.map((item, index) => (
            <div key={item.activity_type} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span>{activityTypeLabels[item.activity_type as keyof typeof activityTypeLabels] || item.activity_type}</span>
              </div>
              <span className="font-medium">{item.total_points} pts ({item.count}x)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}