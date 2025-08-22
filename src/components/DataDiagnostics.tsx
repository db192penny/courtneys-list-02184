
import { useDataDiagnostics } from "@/hooks/useDataDiagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DataDiagnostics() {
  const { data: diagnostics, isLoading, error } = useDataDiagnostics();

  if (isLoading) return <div>Loading diagnostics...</div>;
  if (error) return <div>Error loading diagnostics: {error.message}</div>;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Data Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>Home Vendors Count: {diagnostics?.homeVendorsCount}</div>
          <div>Reviews Count: {diagnostics?.reviewsCount}</div>
          <div>Duplicate Entries: {diagnostics?.duplicateEntries}</div>
          {diagnostics?.duplicateDetails && diagnostics.duplicateDetails.length > 0 && (
            <div>
              <div className="font-medium">Duplicate Details:</div>
              <pre className="text-xs bg-muted p-2 rounded">
                {JSON.stringify(diagnostics.duplicateDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
