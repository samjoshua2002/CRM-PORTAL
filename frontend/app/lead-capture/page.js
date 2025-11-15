import { LeadForm } from '../components/LeadForm';

export default function LeadCapturePage() {
  // In a real application, orgId would come from session, config, or URL
  const orgId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Example Org ID

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Apply Now</h1>
        <p className="mt-2 text-lg text-gray-600">Start your journey with us by filling out the form below.</p>
      </div>
      <LeadForm orgId={orgId} />
    </div>
  );
}
