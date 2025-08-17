import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import UserBadge from "@/components/badges/UserBadge";
import AdminBadge from "@/components/badges/AdminBadge";
import BadgeProgress from "@/components/badges/BadgeProgress";
import PointHistoryTable from "@/components/badges/PointHistoryTable";
import ActivityGuide from "@/components/badges/ActivityGuide";
import BadgeLevelChart from "@/components/badges/BadgeLevelChart";


const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<number>(0);
  const [params] = useSearchParams();
  const onboarding = params.get("onboarding");
  
  const { data: badgeLevels = [] } = useBadgeLevels();
  const { data: isAdmin = false } = useIsAdmin();
  
  const currentBadge = getUserCurrentBadge(points, badgeLevels);
  const nextBadge = getUserNextBadge(points, badgeLevels);
  

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("points")
        .eq("id", auth.user.id)
        .single();

      if (error) {
        console.warn("[Profile] load error:", error);
      }
      if (!cancel) {
        setPoints(data?.points ?? 0);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Rewards & Activity — Courtney's List"
        description="Track your activity points and community engagement rewards."
        canonical={canonical}
      />
      <section className="container max-w-4xl py-10">
        <h1 className="text-3xl font-semibold mb-6">Rewards & Activity</h1>
{onboarding && (
          <Alert className="mb-4">
            <AlertTitle>Welcome!</AlertTitle>
            <AlertDescription>
              Select or join your community to finish setup. You can request a new community if yours isn't listed.
              <br />
              <Link to="/communities/request" className="underline">Request a community</Link>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Progress</CardTitle>
            <div className="flex flex-col gap-3 mt-3">
              <div className="flex items-center gap-3 flex-wrap">
                {currentBadge && (
                  <UserBadge
                    name={currentBadge.name}
                    color={currentBadge.color}
                    icon={currentBadge.icon}
                    size="lg"
                  />
                )}
                {isAdmin && <AdminBadge size="lg" />}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{points} Activity Points</span>
              </div>
              
              <BadgeProgress
                currentPoints={points}
                currentBadge={currentBadge}
                nextBadge={nextBadge}
              />
            </div>
          </CardHeader>
        </Card>
        
        {/* Activity Insights Section */}
        <div className="mt-8 space-y-6">
          <ActivityGuide />
          <BadgeLevelChart currentPoints={points} />
        </div>
        
        {/* Point History Section */}
        <div className="mt-8">
          <PointHistoryTable />
        </div>

      </section>
    </main>
  );
};

export default Profile;
