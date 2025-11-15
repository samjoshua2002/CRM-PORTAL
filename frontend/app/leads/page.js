import { LeadListView } from '../components/LeadListView';

export default function LeadsPage() {
  // In a real application, these would come from the logged-in user's session
  const orgId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Example Org ID
  const counselorId = 'counselor-uuid-001'; // Example Counselor ID

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Leads</h1>
        <p className="mt-2 text-lg text-gray-600">Here are all the leads currently assigned to you.</p>
      </div>
      <LeadListView orgId={orgId} counselorId={counselorId} />
    </div>
  );
}
