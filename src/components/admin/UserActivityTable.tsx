import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Monitor, Smartphone } from 'lucide-react';

interface UserActivity {
  id: string;
  user_id: string | null;
  user_name?: string;
  device_type: string;
  browser: string;
  session_start: string;
  duration_seconds: number | null;
  is_returning_user: boolean;
  review_count: number;
  cost_count: number;
  vendor_count: number;
}

interface UserActivityTableProps {
  activities: UserActivity[];
}

export function UserActivityTable({ activities }: UserActivityTableProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Device/Browser</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
            const { date, time } = formatDateTime(activity.session_start);
            return (
              <TableRow key={activity.id}>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{date}</div>
                    <div className="text-muted-foreground">{time}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {activity.user_name || 'Anonymous'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={activity.is_returning_user ? "default" : "secondary"}
                    className={activity.is_returning_user ? "bg-primary/10 text-primary" : ""}
                  >
                    {activity.is_returning_user ? 'Returning' : 'New User'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {activity.device_type === 'Mobile' ? (
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-sm">
                      <div>{activity.device_type}</div>
                      <div className="text-muted-foreground">{activity.browser}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDuration(activity.duration_seconds)}
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Reviews:</span>
                      <span className="font-medium">{activity.review_count}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Costs:</span>
                      <span className="font-medium">{activity.cost_count}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground">Vendors:</span>
                      <span className="font-medium">{activity.vendor_count}</span>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}