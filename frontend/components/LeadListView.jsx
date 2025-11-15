'use client';

import useSWR from 'swr';
import { fetcher } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { useState } from 'react';

const getHotnessColor = (hotness) => {
  switch (hotness) {
    case 'hot': return 'bg-red-500';
    case 'warm': return 'bg-yellow-500';
    case 'cold': return 'bg-blue-500';
    default: return 'bg-gray-400';
  }
};

export function LeadListView({ orgId, counselorId }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', stage: '', hotness: '' });

  const queryParams = new URLSearchParams({
    org_id: orgId,
    assigned_counselor: counselorId,
    page,
    limit: 10,
    ...filters
  }).toString();

  const { data, error, isLoading } = useSWR(`/leads?${queryParams}`, fetcher);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1); // Reset to first page on filter change
  };

  if (isLoading) return <div>Loading leads...</div>;
  if (error) return <div className="text-red-500">Failed to load leads: {error.message}</div>;
  if (!data || !data.leads || data.leads.length === 0) {
    return <p>No leads assigned to you yet.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Assigned Leads</CardTitle>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Add filter controls here */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotness</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.leads.map((lead) => (
                <tr key={lead.lead_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.first_name} {lead.last_name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.program_interest}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.stage}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`w-3 h-3 rounded-full inline-block mr-2 ${getHotnessColor(lead.hotness_snapshot)}`}></span>
                    {lead.hotness_snapshot}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lead.assignment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href={`/leads/${lead.lead_id}`} className="text-primary-600 hover:text-primary-900">View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Add pagination controls here */}
      </CardContent>
    </Card>
  );
}
