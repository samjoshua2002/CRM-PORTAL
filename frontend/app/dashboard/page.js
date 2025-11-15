import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">Analytics and insights will be displayed here.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Detailed analytics and data visualizations for your lead funnel are on the way.</p>
        </CardContent>
      </Card>
    </div>
  );
}
