import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useBadgeLevels, getUserCurrentBadge, getUserNextBadge } from "@/hooks/useBadgeLevels";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import UserBadge from "@/components/badges/UserBadge";
import AdminBadge from "@/components/badges/AdminBadge";
import BadgeProgress from "@/components/badges/BadgeProgress";
import PointHistoryTable from "@/components/badges/PointHistoryTable";
import ActivityGuide from "@/components/badges/ActivityGuide";
import BadgeLevelChart from "@/components/badges/BadgeLevelChart";
import { SimpleInvite } from "@/components/SimpleInvite";
import { Gift, Trophy } from "lucide-react";

const NeighborhoodCred = () => {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<number>(0);
  const [reviewsThisMonth, setReviewsThisMonth] = useState<number>(0);
  
  const { data: badgeLevels = [] } = useBadgeLevels();
  const { data: isAdmin = false } = useIsAdmin();
  
  const currentBadge = getUserCurrentBadge(points, badgeLevels);
  const nextBadge = getUserNextBadge(points, badgeLevels);

  // Calculate raffle entries based on total points
  const calculateRaffleEntries = (totalPoints: number, reviews: number) => {
    if (reviews === 0) return 0;
    
    const baseEntries = 1;
    const multiplier = totalPoints >= 100 ? 5 : 
                     totalPoints >= 50 ? 3 : 
                     totalPoints >= 20 ? 2 : 1;
    
    return baseEntries * multiplier;
  };

  const raffleEntries = calculateRaffleEntries(points, reviewsThisMonth);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }

      // Get user points
      const { data: userData } = await supabase
        .from("users")
        .select("points")
        .eq("id", auth.user.id)
        .single();

      // Get reviews this month for raffle eligibility
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id")
        .eq("user_id", auth.user.id)
        .gte("created_at", startOfMonth.toISOString());

      if (!cancel) {
        setPoints(userData?.points ?? 0);
        setReviewsThisMonth(reviewsData?.length ?? 0);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  // Progress to 20-point Starbucks reward
  const starbucksProgress = Math.min(points / 20, 1);
  const pointsToStarbucks = Math.max(20 - points, 0);

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Neighborhood Cred — Courtney's List"
        description="Track your community contributions and unlock rewards."
        canonical={canonical}
      />
      <section className="container max-w-4xl py-10">
        <h1 className="text-3xl font-semibold mb-6">Neighborhood Cred</h1>

        {/* Reward Progress Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Starbucks Reward */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">☕</div>
                  <div>
                    <h3 className="font-semibold">Coffee on Courtney</h3>
                    <p className="text-sm text-muted-foreground">$10 Starbucks Gift Card at 20 points</p>
                  </div>
                </div>
                {points >= 20 ? (
                  <div className="text-green-600 font-semibold">🎉 Earned!</div>
                ) : (
                  <div className="text-sm text-muted-foreground">{pointsToStarbucks} points to go</div>
                )}
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${starbucksProgress * 100}%` }}
                />
              </div>
              
              {points < 20 && (
                <div className="text-sm text-muted-foreground">
                  Quick path: 1 invite (10 pts) + 1 review (5 pts) + join bonus (5 pts) = 20 points!
                </div>
              )}
            </div>

            {/* Monthly Raffle */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">🎟️</div>
                  <div>
                    <h3 className="font-semibold">Monthly Service Raffle</h3>
                    <p className="text-sm text-muted-foreground">$200 toward any community provider</p>
                  </div>
                </div>
                {reviewsThisMonth > 0 ? (
                  <div className="text-green-600 font-semibold">✅ Entered</div>
                ) : (
                  <div className="text-sm text-muted-foreground">Need 1 review</div>
                )}
              </div>
              
              {reviewsThisMonth > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium">Your Entries: {raffleEntries}</div>
                    <div className="text-muted-foreground">
                      Base entry (1) + {raffleEntries - 1}x multiplier from {points} total points
                    </div>
                  </div>
                </div>
              )}
              
              {reviewsThisMonth === 0 && (
                <Button asChild size="sm" className="w-fit">
                  <Link to="/communities/boca-bridges">Leave Your First Review</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Status
            </CardTitle>
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

        {/* Invite Neighbors */}
        <SimpleInvite />

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

export default NeighborhoodCred;