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
  const [generatorInstallation, setGeneratorInstallation] = useState("");
  
  // New categories
  const [perRoomCost, setPerRoomCost] = useState("");
  const [perItemCost, setPerItemCost] = useState("");
  const [patioInstallation, setPatioInstallation] = useState("");
  const [patioRepair, setPatioRepair] = useState("");
  const [holidayInstallation, setHolidayInstallation] = useState("");
  const [holidayRemoval, setHolidayRemoval] = useState("");
  const [seasonalPackage, setSeasonalPackage] = useState("");

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
      
      // Generator
      else if (categoryLower.includes("generator")) {
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
        if (generatorInstallation) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(generatorInstallation),
            cost_kind: "installation",
            unit: "installation",
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
            cost_kind: "yearly_plan",
            unit: "year",
            period: "yearly",
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
      
      // Carpet & Sofa Cleaning
      else if (categoryLower.includes("carpet & sofa cleaning")) {
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
        if (perRoomCost) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(perRoomCost),
            cost_kind: "hourly",
            unit: "room",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
        if (perItemCost) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(perItemCost),
            cost_kind: "one_time",
            unit: "item",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
      }
      
      // Patio Screening
      else if (categoryLower.includes("patio screening")) {
        if (patioInstallation) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(patioInstallation),
            cost_kind: "installation",
            unit: "sq ft",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
        if (patioRepair) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(patioRepair),
            cost_kind: "service_call",
            unit: "panel",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
      }
      
      // Holiday Lighting
      else if (categoryLower.includes("holiday lighting")) {
        if (holidayInstallation) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(holidayInstallation),
            cost_kind: "installation",
            unit: "linear ft",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
        if (holidayRemoval) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(holidayRemoval),
            cost_kind: "service_call",
            unit: "visit",
            period: "one_time",
            quantity: 1,
            anonymous: !showName
          });
        }
        if (seasonalPackage) {
          costsToInsert.push({
            vendor_id: vendorId,
            household_address: userProfile.address,
            amount: parseFloat(seasonalPackage),
            cost_kind: "yearly_plan",
            unit: "season",
            period: "yearly",
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

    // Generator
    if (categoryLower.includes("generator")) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="serviceCall">Service Call</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="serviceCall"
                type="number"
                placeholder="200"
                value={serviceCall}
                onChange={(e) => setServiceCall(e.target.value)}
              />
              <span>/ Visit</span>
            </div>
          </div>
          <div>
            <Label htmlFor="generatorInstallation">Installation Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="generatorInstallation"
                type="number"
                placeholder="8500"
                value={generatorInstallation}
                onChange={(e) => setGeneratorInstallation(e.target.value)}
              />
              <span>(one-time)</span>
            </div>
          </div>
          <div>
            <Label htmlFor="yearlyPlan">Maintenance Plan</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="yearlyPlan"
                type="number"
                placeholder="500"
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

    // Carpet & Sofa Cleaning
    if (categoryLower.includes("carpet & sofa cleaning")) {
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
            <Label htmlFor="perRoomCost">Per Room Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="perRoomCost"
                type="number"
                placeholder="75"
                value={perRoomCost}
                onChange={(e) => setPerRoomCost(e.target.value)}
              />
              <span>/ Room</span>
            </div>
          </div>
          <div>
            <Label htmlFor="perItemCost">Per Item Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="perItemCost"
                type="number"
                placeholder="50"
                value={perItemCost}
                onChange={(e) => setPerItemCost(e.target.value)}
              />
              <span>/ Item</span>
            </div>
          </div>
        </div>
      );
    }

    // Patio Screening
    if (categoryLower.includes("patio screening")) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="patioInstallation">Installation Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="patioInstallation"
                type="number"
                placeholder="15"
                value={patioInstallation}
                onChange={(e) => setPatioInstallation(e.target.value)}
              />
              <span>/ Sq Ft</span>
            </div>
          </div>
          <div>
            <Label htmlFor="patioRepair">Repair Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="patioRepair"
                type="number"
                placeholder="250"
                value={patioRepair}
                onChange={(e) => setPatioRepair(e.target.value)}
              />
              <span>/ Panel</span>
            </div>
          </div>
        </div>
      );
    }

    // Holiday Lighting
    if (categoryLower.includes("holiday lighting")) {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="holidayInstallation">Installation Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="holidayInstallation"
                type="number"
                placeholder="8"
                value={holidayInstallation}
                onChange={(e) => setHolidayInstallation(e.target.value)}
              />
              <span>/ Linear Ft</span>
            </div>
          </div>
          <div>
            <Label htmlFor="holidayRemoval">Removal Cost</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="holidayRemoval"
                type="number"
                placeholder="300"
                value={holidayRemoval}
                onChange={(e) => setHolidayRemoval(e.target.value)}
              />
              <span>/ Visit</span>
            </div>
          </div>
          <div>
            <Label htmlFor="seasonalPackage">Seasonal Package</Label>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input
                id="seasonalPackage"
                type="number"
                placeholder="1500"
                value={seasonalPackage}
                onChange={(e) => setSeasonalPackage(e.target.value)}
              />
              <span>/ Season</span>
            </div>
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