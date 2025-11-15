'use client';

import { useLeadForm } from '../hooks/useLeadForm';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

export function LeadForm({ orgId }) {
  const { form, onSubmit, loading, error, success } = useLeadForm(orgId);
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Request Information</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-green-600">Thank You!</h3>
            <p className="mt-2 text-gray-600">
              Your request has been received. We will be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="first_name"
                label="First Name"
                {...register('first_name')}
                error={errors.first_name}
                required
              />
              <Input
                id="last_name"
                label="Last Name"
                {...register('last_name')}
                error={errors.last_name}
                required
              />
            </div>

            <Input
              id="email"
              label="Email Address"
              type="email"
              {...register('email')}
              error={errors.email}
              required
            />

            <Input
              id="phone"
              label="Phone Number (Optional)"
              type="tel"
              {...register('phone')}
              error={errors.phone}
            />

            <Input
              id="program_interest"
              label="Program of Interest"
              {...register('program_interest')}
              error={errors.program_interest}
              required
            />

            <div>
              <label htmlFor="country_code" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <select
                id="country_code"
                {...register('country_code')}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-${errors.country_code ? 'red-500' : 'gray-300'} focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md`}
              >
                <option value="">Select a country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="IN">India</option>
                {/* Add other countries as needed */}
              </select>
              {errors.country_code && <p className="mt-2 text-sm text-red-600">{errors.country_code.message}</p>}
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consent_marketing"
                  type="checkbox"
                  {...register('consent_marketing')}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="consent_marketing" className="font-medium text-gray-700">
                  I agree to receive marketing communications.
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">There was an error with your submission</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Submitting...' : 'Request Information'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
