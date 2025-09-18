import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type AddCostModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  category: string;
};

export function AddCostModal({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  category
}: AddCostModalProps) {
  const [loading, setLoading] = useState(false);
  const [skipForNow, setSkipForNow] = useState(false);
  const [showName, setShowName] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Category-specific form states
  const [monthlyPlan, setMonthlyPlan] = useState("");
  const [visitsPerMonth, setVisitsPerMonth] = useState("");
  const [serviceCall, setServiceCall] = useState("");
  const [yearlyPlan, setYearlyPlan] = useState("");
  const [visitsPerYear, setVisitsPerYear] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [installationCost, setInstallationCost] = useState("");

  const categoryLower = category.toLowerCase();

  const handleSubmit = async () => {
    if (skipForNow) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      // Get user's address for cost submission
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add cost information",
          variant: "destructive"
        });
        return;
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select("address")
        .eq("id", user.user.id)
        .single();

      if (!userProfile?.address) {
        toast({
          title: "Address required",
          description: "Please add your address on your Profile page to submit costs",
          variant: "destructive"
        });
        return;
      }

      const costsToInsert = [];

      // Pool/Landscaping/Pest Control
      if (["pool", "pool service", "landscaping", "pest control"].some(cat => categoryLower.includes(cat))) {
        if (monthlyPlan) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(monthlyPlan),
            cost_kind: "monthly_plan",
            unit: "month",
            period: "monthly",
            quantity: visitsPerMonth ? parseFloat(visitsPerMonth) : 1,
            anonymous: !showName
          });
        }
      }
      
      // HVAC
      else if (["hvac"].some(cat => categoryLower.includes(cat))) {
        if (serviceCall) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(serviceCall),
            cost_kind: "service_call",
            unit: "visit",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
        if (yearlyPlan) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(yearlyPlan),
            cost_kind: "monthly_plan",
            unit: "month",
            period: "annually",
            quantity: visitsPerYear ? parseFloat(visitsPerYear) : 1,
            anonymous: !showName
          });
        }
      }
      
      // Plumbing/Electrical/Pet Grooming/House Cleaning/Mobile Tire Repair/Appliance Repair
      else if (["plumbing", "electrical", "pet grooming", "house cleaning", "mobile tire repair", "appliance repair"].some(cat => categoryLower.includes(cat))) {
        if (serviceCall) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(serviceCall),
            cost_kind: "service_call",
            unit: "visit",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
      }
      
      // Handyman
      else if (categoryLower.includes("handyman")) {
        if (hourlyRate) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(hourlyRate),
            cost_kind: "hourly",
            unit: "hour",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
      }
      
      // Landscape Lighting
      else if (categoryLower.includes("landscape lighting")) {
        if (installationCost) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(installationCost),
            cost_kind: "one_time",
            unit: "installation",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
        if (hourlyRate) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(hourlyRate),
            cost_kind: "hourly",
            unit: "hour",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
      }

      if (costsToInsert.length === 0) {
        toast({
          title: "No costs entered",
          description: "Please enter at least one cost amount",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("costs")
        .insert(costsToInsert);

      if (error) throw error;

      toast({
        title: "💰 Cost Added!",
        description: "You earned 5 points! You're getting closer to your free Starbucks card! ☕",
        duration: 5000,
        className: "bg-green-50 border-green-500 border-2 text-green-900"
      });

      // Refresh the vendor stats query
      queryClient.invalidateQueries({ queryKey: ["vendorStats"] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding cost:", error);
      toast({
        title: "Error adding cost",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInputs = () => {
    // Pool/Landscaping/Pest Control
    if (["pool", "pool service", "landscaping", "pest control"].some(cat => categoryLower.includes(cat))) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="monthlyPlan">Maintenance Plan</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="monthlyPlan"
                type="number"
                placeholder="160"
                value={monthlyPlan}
                onChange={(e) => setMonthlyPlan(e.target.value)}
              />
              <span>/ Month</span>
            </div>
          </div>
          <div>
            <Label htmlFor="visits">Visits per Month</Label>
            <Input
              id="visits"
              type="number"
              placeholder="1"
              value={visitsPerMonth}
              onChange={(e) => setVisitsPerMonth(e.target.value)}
            />
          </div>
        </div>
      );
    }

    // HVAC
    if (categoryLower.includes("hvac")) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="serviceCall">Service Call</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="serviceCall"
                type="number"
                placeholder="150"
                value={serviceCall}
                onChange={(e) => setServiceCall(e.target.value)}
              />
              <span>/ Visit</span>
            </div>
          </div>
          <div>
            <Label htmlFor="yearlyPlan">Maintenance Plan</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="yearlyPlan"
                type="number"
                placeholder="400"
                value={yearlyPlan}
                onChange={(e) => setYearlyPlan(e.target.value)}
              />
              <span>/ Year</span>
            </div>
          </div>
          <div>
            <Label htmlFor="visitsYear">Visits per Year</Label>
            <Input
              id="visitsYear"
              type="number"
              placeholder="2"
              value={visitsPerYear}
              onChange={(e) => setVisitsPerYear(e.target.value)}
            />
          </div>
        </div>
      );
    }

    // Plumbing/Electrical/Pet Grooming/House Cleaning/Mobile Tire Repair/Appliance Repair
    if (["plumbing", "electrical", "pet grooming", "house cleaning", "mobile tire repair", "appliance repair"].some(cat => categoryLower.includes(cat))) {
      return (
        <div>
          <Label htmlFor="serviceCall">Service Call</Label>
          <div className="flex items-center space-x-2">
            <span>$</span>
            <Input
              id="serviceCall"
              type="number"
              placeholder="125"
              value={serviceCall}
              onChange={(e) => setServiceCall(e.target.value)}
            />
            <span>/ Visit</span>
          </div>
        </div>
      );
    }

    // Handyman
    if (categoryLower.includes("handyman")) {
      return (
        <div>
          <Label htmlFor="hourlyRate">Hourly Rate</Label>
          <div className="flex items-center space-x-2">
            <span>$</span>
            <Input
              id="hourlyRate"
              type="number"
              placeholder="75"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
            <span>/ Hour</span>
          </div>
        </div>
      );
    }

    // Landscape Lighting
    if (categoryLower.includes("landscape lighting")) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="installationCost">Installation Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="installationCost"
                type="number"
                placeholder="2500"
                value={installationCost}
                onChange={(e) => setInstallationCost(e.target.value)}
              />
              <span>(one-time)</span>
            </div>
          </div>
          <div>
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="hourlyRate"
                type="number"
                placeholder="85"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
              <span>/ Hour</span>
            </div>
          </div>
        </div>
      );
    }

    // Roofing/GC - should not show this modal
    return (
      <div className="text-center text-muted-foreground">
        <p>Please add pricing guidance in a review for this category.</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Cost for {vendorName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {getCategoryInputs()}
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showName"
              checked={showName}
              onCheckedChange={(checked) => setShowName(checked === true)}
            />
            <Label htmlFor="showName" className="text-sm">
              Show My Name
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip"
              checked={skipForNow}
              onCheckedChange={(checked) => setSkipForNow(checked === true)}
            />
            <Label htmlFor="skip" className="text-sm text-muted-foreground">
              Skip for now
            </Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}