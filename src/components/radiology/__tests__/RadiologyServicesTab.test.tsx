import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from '@/hooks/use-toast';
import RadiologyServicesTab from '../RadiologyServicesTab';
import { radiologyServicesApi } from '@/services/api';

// Mock the API and toast
jest.mock('@/services/api');
jest.mock('@/hooks/use-toast');

const mockToast = toast as jest.MockedFunction<typeof toast>;
const mockRadiologyServicesApi = radiologyServicesApi as jest.Mocked<typeof radiologyServicesApi>;

describe('RadiologyServicesTab', () => {
  const mockServices = [
    {
      service_id: '1',
      name: 'Chest X-Ray',
      description: 'Standard chest X-ray examination',
      price: 150.00,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      service_id: '2',
      name: 'MRI Scan - Brain',
      description: 'Magnetic Resonance Imaging of the brain',
      price: 800.00,
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockTemplates = [
    {
      template_id: '1',
      service_id: '1',
      template_name: 'Standard X-Ray Report',
      template_structure: {
        title: 'Chest X-Ray Report',
        fields: [
          { name: 'Lungs', type: 'textarea' },
          { name: 'Heart', type: 'textarea' }
        ]
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockRadiologyServicesApi.getAll.mockResolvedValue(mockServices);
    mockRadiologyServicesApi.getTemplates.mockResolvedValue(mockTemplates);
  });

  it('renders loading state initially', () => {
    render(<RadiologyServicesTab />);
    expect(screen.getByText('Loading services...')).toBeInTheDocument();
  });

  it('renders services after loading', async () => {
    render(<RadiologyServicesTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Chest X-Ray')).toBeInTheDocument();
      expect(screen.getByText('MRI Scan - Brain')).toBeInTheDocument();
    });
  });

  it('shows add service dialog when add button is clicked', async () => {
    render(<RadiologyServicesTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Add Service')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Service'));
    
    expect(screen.getByText('Add New Radiology Service')).toBeInTheDocument();
    expect(screen.getByLabelText('Service Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description *')).toBeInTheDocument();
  });

  it('shows templates dialog when templates button is clicked', async () => {
    render(<RadiologyServicesTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    const templatesButtons = screen.getAllByText('Templates');
    fireEvent.click(templatesButtons[0]);
    
    expect(screen.getByText('Report Templates - Chest X-Ray')).toBeInTheDocument();
  });

  it('filters services based on search term', async () => {
    render(<RadiologyServicesTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Chest X-Ray')).toBeInTheDocument();
      expect(screen.getByText('MRI Scan - Brain')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search services...');
    fireEvent.change(searchInput, { target: { value: 'Chest' } });

    expect(screen.getByText('Chest X-Ray')).toBeInTheDocument();
    expect(screen.queryByText('MRI Scan - Brain')).not.toBeInTheDocument();
  });

  it('handles service deletion', async () => {
    mockRadiologyServicesApi.delete.mockResolvedValue();
    
    render(<RadiologyServicesTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Chest X-Ray')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.getAttribute('data-lucide') === 'trash-2'
    );
    
    fireEvent.click(deleteButtons[0]);
    
    expect(screen.getByText('Delete Service')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Chest X-Ray"? This action cannot be undone.')).toBeInTheDocument();
  });

  it('handles template addition', async () => {
    mockRadiologyServicesApi.addTemplate.mockResolvedValue(mockTemplates[0]);
    
    render(<RadiologyServicesTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    const templatesButtons = screen.getAllByText('Templates');
    fireEvent.click(templatesButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Add Template')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Template'));
    
    expect(screen.getByText('Add New Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Template Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Template Structure (JSON) *')).toBeInTheDocument();
  });
});
