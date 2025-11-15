'use client';

import useSWR from 'swr';
import { fetcher } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const DetailItem = ({ label, value }) => (
  <div>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value || 'N/A'}</dd>
  </div>
);

export default function LeadDetailPage({ params }) {
  const { id } = params;
  const { data: lead, error, isLoading } = useSWR(id ? `/leads/${id}` : null, fetcher);

  if (isLoading) return <div>Loading lead details...</div>;
  if (error) return <div className="text-red-500">Failed to load lead: {error.message}</div>;
  if (!lead) return <p>Lead not found.</p>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{lead.first_name} {lead.last_name}</h1>
          <p className="mt-1 text-gray-500">{lead.email} &middot; {lead.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Status</p>
          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            {lead.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader><CardTitle>Lead Information</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <DetailItem label="Program of Interest" value={lead.program_interest} />
                <DetailItem label="Country" value={lead.country_name} />
                <DetailItem label="Assigned Counselor" value={lead.assigned_counselor} />
                <DetailItem label="Assignment Date" value={new Date(lead.assignment_date).toLocaleString()} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Touchpoint Journey</CardTitle></CardHeader>
            <CardContent>
              {/* Timeline of touchpoints */}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Lead Score</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`text-5xl font-bold text-${lead.hotness_snapshot === 'hot' ? 'red' : lead.hotness_snapshot === 'warm' ? 'yellow' : 'blue'}-500`}>{lead.lead_score}</div>
                <div className="text-lg font-medium capitalize">{lead.hotness_snapshot}</div>
              </div>
              <dl className="mt-6 space-y-4">
                <DetailItem label="Academic Score" value={lead.academic_score} />
                <DetailItem label="Experience Score" value={lead.experience_score} />
                <DetailItem label="Program Fit Score" value={lead.program_fit_score} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
