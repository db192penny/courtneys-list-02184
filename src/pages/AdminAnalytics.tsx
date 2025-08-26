import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Users, Eye, MousePointer, RefreshCw } from 'lucide-react';
import SEO from '@/components/SEO';
import { UserActivityTable } from '@/components/admin/UserActivityTable';

interface AnalyticsSummary {
  total_sessions: number;
  unique_users: number;
  total_events: number;
  top_pages: any[];
  top_events: any[];
  device_breakdown: any[];
  community_breakdown: any[];
}

interface UserActivity {
  id: string;
  user_id: string | null;
  user_name?: string;
  device_type: string;
  browser: string;
  session_start: string;
  duration_seconds: number | null;
  is_returning_user: boolean;
  session_review_count: number;
  session_cost_count: number;
  session_vendor_count: number;
  review_count: number;
  cost_count: number;
  vendor_count: number;
}


const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
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

      // Fetch user activity data with session info and activity counts
      // David Birnbaum's user ID to exclude
      const adminUserId = '50c337c8-2c85-4aae-84da-26ee79f4c43b';
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select(`
          id,
          user_id,
          device_type,
          browser,
          session_start,
          session_end,
          duration_seconds,
          is_returning_user
        `)
        .not('user_id', 'is', null)
        .neq('user_id', adminUserId)
        .gte('session_start', twoDaysAgo.toISOString())
        .order('session_start', { ascending: false });

      if (sessionError) throw sessionError;

      // Fetch user details and activity counts for each session
      const activitiesWithDetails = await Promise.all(
        (sessionData || []).map(async (session) => {
          let userData = null;
          let activityCounts = { review_count: 0, cost_count: 0, vendor_count: 0 };
          let sessionActivityCounts = { session_review_count: 0, session_cost_count: 0, session_vendor_count: 0 };

          if (session.user_id) {
            try {
              // Get user name
              const { data: user } = await supabase
                .from('users')
                .select('name')
                .eq('id', session.user_id)
                .single();
              
              userData = user;

              // Get session time boundaries
              const sessionStart = new Date(session.session_start);
              const sessionEnd = session.session_end ? new Date(session.session_end) : new Date();

              // Get activity counts for this user (lifetime totals and session-specific)
              const [
                reviewsResult, 
                costsResult, 
                vendorsResult,
                sessionReviewsResult,
                sessionCostsResult,
                sessionVendorsResult
              ] = await Promise.all([
                // Lifetime totals
                supabase
                  .from('reviews')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', session.user_id),
                supabase
                  .from('costs')
                  .select('id', { count: 'exact', head: true })
                  .eq('created_by', session.user_id),
                supabase
                  .from('vendors')
                  .select('id', { count: 'exact', head: true })
                  .eq('created_by', session.user_id),
                // Session-specific counts
                supabase
                  .from('reviews')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', session.user_id)
                  .gte('created_at', sessionStart.toISOString())
                  .lte('created_at', sessionEnd.toISOString()),
                supabase
                  .from('costs')
                  .select('id', { count: 'exact', head: true })
                  .eq('created_by', session.user_id)
                  .gte('created_at', sessionStart.toISOString())
                  .lte('created_at', sessionEnd.toISOString()),
                supabase
                  .from('vendors')
                  .select('id', { count: 'exact', head: true })
                  .eq('created_by', session.user_id)
                  .gte('created_at', sessionStart.toISOString())
                  .lte('created_at', sessionEnd.toISOString())
              ]);

              activityCounts = {
                review_count: reviewsResult.count || 0,
                cost_count: costsResult.count || 0,
                vendor_count: vendorsResult.count || 0
              };

              sessionActivityCounts = {
                session_review_count: sessionReviewsResult.count || 0,
                session_cost_count: sessionCostsResult.count || 0,
                session_vendor_count: sessionVendorsResult.count || 0
              };
            } catch (error) {
              console.warn('Failed to fetch user details:', error);
            }
          }

          return {
            id: session.id,
            user_id: session.user_id,
            user_name: userData?.name,
            device_type: session.device_type,
            browser: session.browser,
            session_start: session.session_start,
            duration_seconds: session.duration_seconds,
            is_returning_user: session.is_returning_user || false,
            session_review_count: sessionActivityCounts.session_review_count,
            session_cost_count: sessionActivityCounts.session_cost_count,
            session_vendor_count: sessionActivityCounts.session_vendor_count,
            review_count: activityCounts.review_count,
            cost_count: activityCounts.cost_count,
            vendor_count: activityCounts.vendor_count
          };
        })
      );

      setUserActivities(activitiesWithDetails);

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

          {/* User Activity Table */}
          <div className="mt-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Authenticated User Activity (Last 2 Days)</h3>
              <p className="text-sm text-muted-foreground">
                Detailed view of authenticated user sessions with session actions and lifetime totals
              </p>
            </div>
            <UserActivityTable activities={userActivities} />
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}