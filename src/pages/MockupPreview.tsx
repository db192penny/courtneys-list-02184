import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import mockupImage from "@/assets/mobile-points-breakdown-mockup.jpg";

const MockupPreview = () => {
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Design Mockup Preview — Courtney's List"
        description="Preview of improved mobile points breakdown design"
      />
      
      <section className="container max-w-4xl py-10">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">Design Mockup Preview</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Improved Mobile Points Breakdown Design</CardTitle>
            <p className="text-muted-foreground">
              This mockup shows suggested improvements for the points breakdown card on the profile page, 
              optimized for mobile viewing with better layout and visual hierarchy.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img 
                src={mockupImage} 
                alt="Mobile points breakdown design mockup showing improved layout with horizontal bar chart and better spacing"
                className="max-w-full h-auto rounded-lg shadow-lg"
                style={{ maxHeight: "80vh" }}
              />
            </div>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Key Improvements Shown:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Total points summary at the top for quick reference</li>
                <li>Horizontal bar chart instead of pie chart for better mobile readability</li>
                <li>Cleaner list layout with improved spacing and touch targets</li>
                <li>Better visual hierarchy with proper typography scaling</li>
                <li>Modern card design with appropriate mobile padding</li>
              </ul>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild>
                <Link to="/profile">View Current Profile Page</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/auth">Sign In to Access Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default MockupPreview;