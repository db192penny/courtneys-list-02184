import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

type MobileAddCostModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  category: string;
};

export function MobileAddCostModal({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  category
}: MobileAddCostModalProps) {
  const [loading, setLoading] = useState(false);
  const [skipForNow, setSkipForNow] = useState(false);
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
            quantity: visitsPerMonth ? parseFloat(visitsPerMonth) : 1
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
            quantity: 1
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
            quantity: visitsPerYear ? parseFloat(visitsPerYear) : 1
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
            quantity: 1
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
            quantity: 1
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
            quantity: visitsPerYear ? parseFloat(visitsPerYear) : 1
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
            quantity: 1
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
            quantity: 1
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
            quantity: 1
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
            quantity: 1
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
        title: "Cost added successfully",
        description: `Added cost information for ${vendorName}`
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
          <div className="space-y-2">
            <Label htmlFor="monthlyPlan">Maintenance Plan</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="monthlyPlan"
                type="number"
                placeholder="160"
                value={monthlyPlan}
                onChange={(e) => setMonthlyPlan(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">/ Month</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="visits">Visits per Month</Label>
            <Input
              id="visits"
              type="number"
              placeholder="1"
              value={visitsPerMonth}
              onChange={(e) => setVisitsPerMonth(e.target.value)}
              onFocus={handleInputFocus}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      );
    }

    // HVAC
    if (categoryLower.includes("hvac")) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceCall">Service Call</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="serviceCall"
                type="number"
                placeholder="150"
                value={serviceCall}
                onChange={(e) => setServiceCall(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">/ Visit</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearlyPlan">Maintenance Plan</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="yearlyPlan"
                type="number"
                placeholder="400"
                value={yearlyPlan}
                onChange={(e) => setYearlyPlan(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">/ Year</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitsYear">Visits per Year</Label>
            <Input
              id="visitsYear"
              type="number"
              placeholder="2"
              value={visitsPerYear}
              onChange={(e) => setVisitsPerYear(e.target.value)}
              onFocus={handleInputFocus}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      );
    }

    // Generator
    if (categoryLower.includes("generator")) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceCall">Service Call</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="serviceCall"
                type="number"
                placeholder="200"
                value={serviceCall}
                onChange={(e) => setServiceCall(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">/ Visit</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="generatorInstallation">Installation Cost</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="generatorInstallation"
                type="number"
                placeholder="8500"
                value={generatorInstallation}
                onChange={(e) => setGeneratorInstallation(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">(one-time)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearlyPlan">Maintenance Plan</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="yearlyPlan"
                type="number"
                placeholder="500"
                value={yearlyPlan}
                onChange={(e) => setYearlyPlan(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">/ Year</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitsYear">Visits per Year</Label>
            <Input
              id="visitsYear"
              type="number"
              placeholder="2"
              value={visitsPerYear}
              onChange={(e) => setVisitsPerYear(e.target.value)}
              onFocus={handleInputFocus}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      );
    }

    // Plumbing/Electrical/Pet Grooming/House Cleaning/Mobile Tire Repair/Appliance Repair
    if (["plumbing", "electrical", "pet grooming", "house cleaning", "mobile tire repair", "appliance repair"].some(cat => categoryLower.includes(cat))) {
      return (
        <div className="space-y-2">
          <Label htmlFor="serviceCall">Service Call</Label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id="serviceCall"
              type="number"
              placeholder="125"
              value={serviceCall}
              onChange={(e) => setServiceCall(e.target.value)}
              onFocus={handleInputFocus}
              className="flex-1"
              style={{ fontSize: '16px' }}
            />
            <span className="text-sm text-muted-foreground">/ Visit</span>
          </div>
        </div>
      );
    }

    // Handyman
    if (categoryLower.includes("handyman")) {
      return (
        <div className="space-y-2">
          <Label htmlFor="hourlyRate">Hourly Rate</Label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id="hourlyRate"
              type="number"
              placeholder="75"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              onFocus={handleInputFocus}
              className="flex-1"
              style={{ fontSize: '16px' }}
            />
            <span className="text-sm text-muted-foreground">/ Hour</span>
          </div>
        </div>
      );
    }

    // Landscape Lighting
    if (categoryLower.includes("landscape lighting")) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="installationCost">Installation Cost</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="installationCost"
                type="number"
                placeholder="2500"
                value={installationCost}
                onChange={(e) => setInstallationCost(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">(one-time)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="hourlyRate"
                type="number"
                placeholder="85"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                onFocus={handleInputFocus}
                className="flex-1"
                style={{ fontSize: '16px' }}
              />
              <span className="text-sm text-muted-foreground">/ Hour</span>
            </div>
          </div>
        </div>
      );
    }

    // Roofing/GC - should not show this modal
    return (
      <div className="text-center text-muted-foreground p-4">
        <p>Please add pricing guidance in a review for this category.</p>
      </div>
    );
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Prevent iOS zoom by ensuring 16px font size
    e.target.style.fontSize = '16px';
    
    // Store original viewport position
    const originalScrollY = window.scrollY;
    
    // Prevent any automatic scrolling
    setTimeout(() => {
      window.scrollTo(0, originalScrollY);
      document.documentElement.scrollTop = originalScrollY;
      document.body.scrollTop = originalScrollY;
    }, 0);
  };

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t rounded-t-lg shadow-lg"
            style={{ 
              height: '85vh',
              maxHeight: '85vh',
              position: 'fixed',
              touchAction: 'pan-y'
            }}
          >
            <div className="flex flex-col h-full">
              <div className="text-left p-4 pb-4 flex-shrink-0 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Add Cost for {vendorName}</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onOpenChange(false)}
                    className="p-1 h-8 w-8"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 px-4 overflow-y-auto">
                <div className="space-y-6 pb-4">
                  <div className="space-y-4">
                    {getCategoryInputs()}
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="skip"
                      checked={skipForNow}
                      onCheckedChange={(checked) => setSkipForNow(checked === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="skip" className="text-sm text-muted-foreground leading-relaxed">
                      Skip for now
                    </Label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex-shrink-0 bg-background border-t p-4">
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}