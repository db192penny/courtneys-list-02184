import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Users, Eye, MousePointer, Smartphone, Monitor, RefreshCw } from 'lucide-react';
import SEO from '@/components/SEO';

interface AnalyticsSummary {
  total_sessions: number;
  unique_users: number;
  total_events: number;
  top_pages: any[];
  top_events: any[];
  device_breakdown: any[];
  community_breakdown: any[];
}

interface RecentSession {
  id: string;
  user_id: string | null;
  device_type: string;
  browser: string;
  community: string;
  page_path: string;
  session_start: string;
  duration_seconds: number | null;
  page_views: number;
}

interface RecentEvent {
  id: string;
  event_type: string;
  event_name: string;
  page_path: string;
  element_text: string | null;
  community: string;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch summary data
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_analytics_summary', { _days: parseInt(timeRange) });

      if (summaryError) throw summaryError;
      if (summaryData && summaryData.length > 0) {
        const data = summaryData[0];
        setSummary({
          total_sessions: data.total_sessions,
          unique_users: data.unique_users,
          total_events: data.total_events,
          top_pages: Array.isArray(data.top_pages) ? data.top_pages : [],
          top_events: Array.isArray(data.top_events) ? data.top_events : [],
          device_breakdown: Array.isArray(data.device_breakdown) ? data.device_breakdown : [],
          community_breakdown: Array.isArray(data.community_breakdown) ? data.community_breakdown : []
        });
      }

      // Fetch recent sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (sessionsError) throw sessionsError;
      setRecentSessions(sessionsData || []);

      // Fetch recent events
      const { data: eventsData, error: eventsError } = await supabase
        .from('user_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setRecentEvents(eventsData || []);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Admin Analytics - Courtney's List"
        description="Analytics dashboard for tracking user behavior and engagement"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={fetchAnalytics} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total_sessions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.unique_users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.total_events || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Events/Session</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.total_sessions && summary?.total_events 
                  ? Math.round(summary.total_events / summary.total_sessions * 10) / 10
                  : 0
                }
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Types</CardTitle>
                  <CardDescription>Sessions by device type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={summary?.device_breakdown || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ device, count }) => `${device}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(summary?.device_breakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Community Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Community Activity</CardTitle>
                  <CardDescription>Sessions by community</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary?.community_breakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="community" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sessions" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Pages */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                  <CardDescription>Most viewed pages</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary?.top_pages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="page" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Events */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Events</CardTitle>
                  <CardDescription>Most frequent user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary?.top_events || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="event" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Latest user actions and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentEvents.slice(0, 20).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{event.event_type}</Badge>
                        <div>
                          <p className="font-medium">{event.event_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.page_path} • {event.community}
                            {event.element_text && ` • "${event.element_text}"`}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(event.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Latest user sessions and activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.slice(0, 15).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {session.device_type === 'Mobile' ? (
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{session.device_type}</Badge>
                            <Badge variant="outline">{session.browser}</Badge>
                            {session.user_id && <Badge>Registered</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.community} • {session.page_path} • {session.page_views} views
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{formatTime(session.session_start)}</p>
                        <p>Duration: {formatDuration(session.duration_seconds)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}