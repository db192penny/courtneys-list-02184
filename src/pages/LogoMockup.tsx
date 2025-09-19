import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Monitor, Smartphone, Palette, Type } from "lucide-react";
import SEO from "@/components/SEO";

// New Logo Component - Desktop Version
function NewLogoDesktop() {
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🏘️</span>
        <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Courtney's List
        </span>
      </div>
      <p className="text-sm text-muted-foreground ml-8 mt-1">
        Trusted Provider Reviews by Neighbors
      </p>
    </div>
  );
}

// New Logo Component - Mobile Version  
function NewLogoMobile() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">🏘️</span>
      <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Courtney's List
      </span>
    </div>
  );
}

// Current Logo for Comparison
function CurrentLogo({ mobile }: { mobile?: boolean }) {
  return (
    <span className={`font-semibold cursor-default ${mobile ? 'text-lg' : 'text-xl'}`}>
      Courtney's List
    </span>
  );
}

// Mock Header Component with New Logo
function MockHeaderWithNewLogo({ mobile }: { mobile?: boolean }) {
  return (
    <header className="w-full border-b bg-background/80 backdrop-blur">
      <nav className="container flex h-12 sm:h-14 items-center justify-between">
        {mobile ? <NewLogoMobile /> : <NewLogoDesktop />}
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <span className="text-blue-600">⭐</span>
            <span className="font-semibold ml-1">125 pts</span>
          </Badge>
          <Button size="sm">Menu</Button>
        </div>
      </nav>
    </header>
  );
}

// Mock Header Component with Current Logo
function MockHeaderWithCurrentLogo({ mobile }: { mobile?: boolean }) {
  return (
    <header className="w-full border-b bg-background/80 backdrop-blur">
      <nav className="container flex h-12 sm:h-14 items-center justify-between">
        <CurrentLogo mobile={mobile} />
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <span className="text-blue-600">⭐</span>
            <span className="font-semibold ml-1">125 pts</span>
          </Badge>
          <Button size="sm">Menu</Button>
        </div>
      </nav>
    </header>
  );
}

export default function LogoMockup() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Logo Design Mockup - Courtney's List"
        description="Preview of the updated Courtney's List logo design with community branding and responsive layouts"
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Button asChild variant="outline" size="sm">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Logo Design Mockup</h1>
          <p className="text-muted-foreground">
            Preview of the updated "Courtney's List" brand identity with community-focused design
          </p>
        </div>

        {/* Live Header Previews */}
        <div className="space-y-8">
          {/* New Design Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-600" />
                New Logo Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Desktop Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Desktop Layout</span>
                </div>
                <div className="border rounded-lg bg-background overflow-hidden">
                  <MockHeaderWithNewLogo />
                </div>
              </div>

              {/* Mobile Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Mobile Layout</span>
                </div>
                <div className="border rounded-lg bg-background overflow-hidden max-w-sm">
                  <MockHeaderWithNewLogo mobile />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Design for Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-muted-foreground" />
                Current Logo (Comparison)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Desktop Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Desktop Layout</span>
                </div>
                <div className="border rounded-lg bg-background overflow-hidden">
                  <MockHeaderWithCurrentLogo />
                </div>
              </div>

              {/* Mobile Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Mobile Layout</span>
                </div>
                <div className="border rounded-lg bg-background overflow-hidden max-w-sm">
                  <MockHeaderWithCurrentLogo mobile />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Design Details */}
          <Card>
            <CardHeader>
              <CardTitle>Design Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Visual Elements</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-lg">🏘️</span>
                      <span>Community house icon for neighborhood trust</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
                      <span>Blue-to-purple gradient for modern appeal</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>Clean, professional typography</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Responsive Behavior</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Desktop:</strong> Icon + brand name + tagline</li>
                    <li><strong>Mobile:</strong> Icon + brand name (horizontal)</li>
                    <li><strong>Tagline:</strong> Hidden on mobile for space efficiency</li>
                    <li><strong>Spacing:</strong> Optimized for both layouts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Variations */}
          <Card>
            <CardHeader>
              <CardTitle>Color & Typography Samples</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Brand Name Variations</h4>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Courtney's List
                    </div>
                    <div className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      Courtney's List
                    </div>
                    <div className="text-lg font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                      Courtney's List
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Tagline Styles</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Trusted Provider Reviews by Neighbors</p>
                    <p className="text-xs text-muted-foreground italic">Trusted Provider Reviews by Neighbors</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This mockup demonstrates how the new logo will look across different devices and contexts. 
                The design uses semantic color tokens from the existing design system for consistency.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link to="/signin">Try the Experience</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/profile">Current Profile Page</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}