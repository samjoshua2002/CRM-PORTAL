import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { createLead, startJourney } from '../lib/api';

const leadSchema = yup.object().shape({
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  phone: yup.string().optional(),
  program_interest: yup.string().required('Program of interest is required'),
  country_code: yup.string().length(2).required('Country is required'),
  consent_marketing: yup.boolean(),
});

export function useLeadForm(orgId) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [journeyId, setJourneyId] = useState(null);

  const form = useForm({
    resolver: yupResolver(leadSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      program_interest: '',
      country_code: '',
      consent_marketing: false,
    },
  });

  // Start journey on component mount
  useEffect(() => {
    const initJourney = async () => {
      try {
        const utmParams = new URLSearchParams(window.location.search);
        const journeyData = {
          org_id: orgId,
          page_url: window.location.href,
          referrer_url: document.referrer,
          utm_source: utmParams.get('utm_source'),
          utm_medium: utmParams.get('utm_medium'),
          utm_campaign: utmParams.get('utm_campaign'),
          utm_term: utmParams.get('utm_term'),
          utm_content: utmParams.get('utm_content'),
        };

        const response = await startJourney(journeyData);
        if (response.success) {
          setJourneyId(response.data.journey_id);
        }
      } catch (err) {
        console.error('Failed to start journey:', err);
      }
    };

    if (orgId) {
      initJourney();
    }
  }, [orgId]);

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const utmParams = new URLSearchParams(window.location.search);
      const leadData = {
        ...data,
        org_id: orgId,
        journey_id: journeyId,
        source_channel: 'web_form',
        page_url: window.location.href,
        utm_source: utmParams.get('utm_source'),
        utm_medium: utmParams.get('utm_medium'),
        utm_campaign: utmParams.get('utm_campaign'),
        utm_term: utmParams.get('utm_term'),
        utm_content: utmParams.get('utm_content'),
      };

      const response = await createLead(leadData);

      if (response.success) {
        setSuccess(true);
        form.reset();
      } else {
        setError(response.error || 'An unknown error occurred.');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit form.');
    } finally {
      setLoading(false);
    }
  };

  return { form, onSubmit, loading, error, success };
}
