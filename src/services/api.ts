// Get the current hostname to determine if we're running locally or on network
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = '5000';
  
  // If running on localhost, use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `https://localhost:${port}/api`;
  }
  
  // If running on network, use the current hostname
  return `https://${hostname}:${port}/api`;
};

const API_BASE_URL = getApiBaseUrl();

export interface Prescription {
  id: number;
  created_at: string;
  appointment_id: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
  dispense_status: boolean;
  patient_name: string;
  doctor_name?: string;
  date: string;
}

export interface Medicine {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock_status: 'in_stock' | 'low_stock';
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  bill_id: string;
  appointment_id: string;
  medication_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_mode: 'cash' | 'online';
  transaction_id?: string;
  payment_status: string;
  created_at: string;
  patient_name: string;
  patient_phone?: string;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalBills: number;
  totalMedicines: number;
  totalStock: number;
  paymentBreakdown: Array<{
    payment_mode: string;
    count: number;
    revenue: number;
  }>;
  lowStockCount: number;
}

export interface LabService {
  patient_service_id: number;
  appointment_id: string;
  service_type_id: number;
  prescribed_at: string;
  sample_collected: boolean;
  sample_collected_at: string | null;
  report_status: 'Pending' | 'InProgress' | 'Completed';
  payment_status: boolean;
  service_type_name: string;
  sub_department_id: number;
  sub_department_name: string;
  prescribed_date: string;
}

export interface PatientDetails {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  patient_phone: string;
}

export interface PatientServicesResponse {
  patient: PatientDetails;
  services: LabService[];
}

export interface PatientTest {
  patient_test_id: number;
  patient_service_id: number;
  test_id: number;
  test_name: string;
  unit?: string;
  normal_min?: number;
  normal_max?: number;
}

export interface PatientTestResult {
  result_id: number;
  patient_test_id: number;
  result_value: string;
  reported_at: string;
}

export interface Test {
  test_id: number;
  test_name: string;
  test_description?: string;
  service_type_id: number;
}

export interface PendingLabTest {
  appointment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  patient_service_id: number;
  service_type_name: string;
  sub_department_name: string;
  sample_collected: boolean;
  sample_collected_at: string | null;
  report_status: string;
}

// Prescriptions API
export const prescriptionsApi = {
  getByAppointmentId: async (appointmentId: string): Promise<Prescription[]> => {
    const response = await fetch(`${API_BASE_URL}/prescriptions/${appointmentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch prescription');
    }
    return response.json();
  },

  getAll: async (): Promise<Prescription[]> => {
    const response = await fetch(`${API_BASE_URL}/prescriptions`);
    if (!response.ok) {
      throw new Error('Failed to fetch prescriptions');
    }
    return response.json();
  },

  updateDispenseStatus: async (appointmentId: string): Promise<Prescription[]> => {
    const response = await fetch(`${API_BASE_URL}/prescriptions/${appointmentId}/dispense`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      throw new Error('Failed to update dispense status');
    }
    return response.json();
  },

  delete: async (appointmentId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/prescriptions/${appointmentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete prescription');
    }
  },

  // SMS: Send prescription via SMS
  sendSMSPrescription: async (data: {
    appointment_id: string;
    patient_phone: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/prescriptions/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to send SMS message');
    }
    return response.json();
  },
};

// Medicines API
export const medicinesApi = {
  getAll: async (): Promise<Medicine[]> => {
    const response = await fetch(`${API_BASE_URL}/medicines`);
    if (!response.ok) {
      throw new Error('Failed to fetch medicines');
    }
    return response.json();
  },

  add: async (medicine: { name: string; price: number; quantity: number; expiry_date?: string | null }): Promise<Medicine> => {
    const response = await fetch(`${API_BASE_URL}/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(medicine),
    });
    if (!response.ok) {
      throw new Error('Failed to add medicine');
    }
    return response.json();
  },

  refill: async (id: number, quantity: number): Promise<Medicine> => {
    const response = await fetch(`${API_BASE_URL}/medicines/refill/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    });
    if (!response.ok) {
      throw new Error('Failed to refill medicine');
    }
    return response.json();
  },

  update: async (id: number, medicine: { name: string; price: number; expiry_date?: string | null }): Promise<Medicine> => {
    const response = await fetch(`${API_BASE_URL}/medicines/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(medicine),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update medicine error:', response.status, errorText);
      throw new Error(`Failed to update medicine: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  delete: async (id: number, confirmName: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/medicines/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmName }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete medicine');
    }
  },

  export: async (filter?: 'all' | 'lowstock'): Promise<any[]> => {
    const url = filter ? `${API_BASE_URL}/medicines/export?filter=${filter}` : `${API_BASE_URL}/medicines/export`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to export medicines');
    }
    return response.json();
  },
};

// Bills API
export const billsApi = {
  getAll: async (): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills`);
    if (!response.ok) {
      throw new Error('Failed to fetch bills');
    }
    return response.json();
  },

  getByAppointmentId: async (appointmentId: string): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills/${appointmentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bill details');
    }
    return response.json();
  },

  create: async (billData: {
    appointment_id: string;
    medicines: Array<{ name: string; quantity: number; price: number }>;
    payment_mode: 'cash' | 'online';
    transaction_id?: string;
  }): Promise<Bill[]> => {
    const response = await fetch(`${API_BASE_URL}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(billData),
    });
    if (!response.ok) {
      throw new Error('Failed to create bill');
    }
    return response.json();
  },

  // Razorpay: Create order
  createRazorpayOrder: async (amount: number, receipt?: string) => {
    const response = await fetch(`${API_BASE_URL}/bills/razorpay/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR', receipt }),
    });
    if (!response.ok) {
      throw new Error('Failed to create Razorpay order');
    }
    return response.json();
  },

  // Razorpay: Verify payment
  verifyRazorpayPayment: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/bills/razorpay/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to verify Razorpay payment');
    }
    return response.json();
  },

  // SMS: Send bill via SMS
  sendSMSBill: async (data: {
    appointment_id: string;
    patient_phone: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/bills/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to send SMS message');
    }
    return response.json();
  },
};

// Analytics API
export const analyticsApi = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const response = await fetch(`${API_BASE_URL}/analytics/summary`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics summary');
    }
    return response.json();
  },

  getSalesTrend: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/analytics/sales-trend`);
    if (!response.ok) {
      throw new Error('Failed to fetch sales trend');
    }
    return response.json();
  },

  getMonthlyTrends: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/analytics/monthly-trends`);
    if (!response.ok) {
      throw new Error('Failed to fetch monthly trends');
    }
    return response.json();
  },

  getInventoryAnalytics: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/analytics/inventory-analytics`);
    if (!response.ok) {
      throw new Error('Failed to fetch inventory analytics');
    }
    return response.json();
  },

  getTopMedicines: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/analytics/top-medicines`);
    if (!response.ok) {
      throw new Error('Failed to fetch top medicines');
    }
    return response.json();
  },

  exportRevenue: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/analytics/export/revenue`);
    if (!response.ok) {
      throw new Error('Failed to export revenue data');
    }
    return response.json();
  },

  exportSalesSummary: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/analytics/export/sales-summary`);
    if (!response.ok) {
      throw new Error('Failed to export sales summary');
    }
    return response.json();
  },

  exportComplete: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/analytics/export/complete`);
    if (!response.ok) {
      throw new Error('Failed to export complete analytics');
    }
    return response.json();
  },
};

// Patient Services API (Lab Prescriptions)
export const patientServicesApi = {
  getAll: async (): Promise<LabService[]> => {
    const response = await fetch(`${API_BASE_URL}/patient-services`);
    if (!response.ok) {
      throw new Error('Failed to fetch patient services');
    }
    return response.json();
  },

  getByAppointmentId: async (appointmentId: string): Promise<PatientServicesResponse> => {
    const response = await fetch(`${API_BASE_URL}/patient-services/appointment/${appointmentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch patient services by appointment');
    }
    return response.json();
  },



  updateSampleCollected: async (id: number, sample_collected: boolean): Promise<LabService> => {
    const response = await fetch(`${API_BASE_URL}/patient-services/${id}/sample-collected`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sample_collected }),
    });
    if (!response.ok) {
      throw new Error('Failed to update sample collection status');
    }
    return response.json();
  },

  updateReportStatus: async (id: number, report_status: 'Pending' | 'InProgress' | 'Completed'): Promise<LabService> => {
    const response = await fetch(`${API_BASE_URL}/patient-services/${id}/report-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report_status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update report status');
    }
    return response.json();
  },

  updatePaymentStatus: async (id: number, payment_status: boolean): Promise<LabService> => {
    const response = await fetch(`${API_BASE_URL}/patient-services/${id}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update payment status');
    }
    return response.json();
  },


};

// Radiology Prescriptions API
export const radiologyPrescriptionsApi = {
  getAll: async (): Promise<RadiologyService[]> => {
    const response = await fetch(`${API_BASE_URL}/radiology-prescriptions`);
    if (!response.ok) {
      throw new Error('Failed to fetch radiology prescriptions');
    }
    return response.json();
  },
  
  getByAppointmentId: async (appointmentId: string): Promise<RadiologyPrescriptionsResponse> => {
    const response = await fetch(`${API_BASE_URL}/radiology-prescriptions/appointment/${appointmentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch radiology prescriptions by appointment');
    }
    return response.json();
  },

  updateTestConducted: async (prescriptionId: string, testConducted: boolean): Promise<RadiologyService> => {
    const response = await fetch(`${API_BASE_URL}/radiology-prescriptions/${prescriptionId}/test-conducted`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test_conducted: testConducted }),
    });
    if (!response.ok) {
      throw new Error('Failed to update test conducted status');
    }
    return response.json();
  },

  updateStatus: async (prescriptionId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<RadiologyService> => {
    const response = await fetch(`${API_BASE_URL}/radiology-prescriptions/${prescriptionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    return response.json();
  },

  updatePaymentStatus: async (prescriptionId: string, paymentStatus: boolean): Promise<RadiologyService> => {
    const response = await fetch(`${API_BASE_URL}/radiology-prescriptions/${prescriptionId}/payment-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
    if (!response.ok) {
      throw new Error('Failed to update payment status');
    }
    return response.json();
  },
};

// Radiology Reports API
export const radiologyReportsApi = {
  getAll: async (): Promise<RadiologyReport[]> => {
    const response = await fetch(`${API_BASE_URL}/radiology-reports`);
    if (!response.ok) {
      throw new Error('Failed to fetch radiology reports');
    }
    return response.json();
  },

  getById: async (reportId: string): Promise<RadiologyReport> => {
    const response = await fetch(`${API_BASE_URL}/radiology-reports/${reportId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch radiology report');
    }
    return response.json();
  },

  getByPrescriptionId: async (prescriptionId: string): Promise<RadiologyReport[]> => {
    const response = await fetch(`${API_BASE_URL}/radiology-reports/prescription/${prescriptionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch radiology reports by prescription');
    }
    return response.json();
  },

  create: async (report: { prescription_id: string; template_id: string; report_data: any }): Promise<RadiologyReport> => {
    const response = await fetch(`${API_BASE_URL}/radiology-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });
    if (!response.ok) {
      throw new Error('Failed to create radiology report');
    }
    return response.json();
  },

  update: async (reportId: string, report: { report_data: any }): Promise<RadiologyReport> => {
    const response = await fetch(`${API_BASE_URL}/radiology-reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });
    if (!response.ok) {
      throw new Error('Failed to update radiology report');
    }
    return response.json();
  },

  delete: async (reportId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/radiology-reports/${reportId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete radiology report');
    }
  },
};

// Radiology Services API
export const radiologyServicesApi = {
  getAll: async (): Promise<RadiologyServiceType[]> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services`);
    if (!response.ok) {
      throw new Error('Failed to fetch radiology services');
    }
    return response.json();
  },

  add: async (service: { name: string; price?: number }): Promise<RadiologyServiceType> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(service),
    });
    if (!response.ok) {
      throw new Error('Failed to add radiology service');
    }
    return response.json();
  },

  update: async (serviceId: string, service: { name: string; price?: number }): Promise<RadiologyServiceType> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(service),
    });
    if (!response.ok) {
      throw new Error('Failed to update radiology service');
    }
    return response.json();
  },

  delete: async (serviceId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services/${serviceId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete radiology service');
    }
  },

  getTemplates: async (serviceId: string): Promise<RadiologyTemplate[]> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services/${serviceId}/templates`);
    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }
    return response.json();
  },

  addTemplate: async (serviceId: string, template: { template_name: string; template_structure: any }): Promise<RadiologyTemplate> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services/${serviceId}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });
    if (!response.ok) {
      throw new Error('Failed to add template');
    }
    return response.json();
  },

  updateTemplate: async (serviceId: string, templateId: string, template: { template_name: string; template_structure: any }): Promise<RadiologyTemplate> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services/${serviceId}/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    });
    if (!response.ok) {
      throw new Error('Failed to update template');
    }
    return response.json();
  },

  deleteTemplate: async (serviceId: string, templateId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/radiology-services/${serviceId}/templates/${templateId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete template');
    }
  },
};

// Lab Tests API
export const labTestsApi = {
  getPendingTests: async (): Promise<PendingLabTest[]> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/pending`);
    if (!response.ok) {
      throw new Error('Failed to fetch pending lab tests');
    }
    return response.json();
  },

  getCompletedReports: async (): Promise<PendingLabTest[]> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/completed`);
    if (!response.ok) {
      throw new Error('Failed to fetch completed reports');
    }
    return response.json();
  },

  getTestsByService: async (patientServiceId: number): Promise<PatientTest[]> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/service/${patientServiceId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tests by service');
    }
    return response.json();
  },

  getTestResults: async (patientTestId: number): Promise<PatientTestResult[]> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/${patientTestId}/results`);
    if (!response.ok) {
      throw new Error('Failed to fetch test results');
    }
    return response.json();
  },

  saveTestResult: async (patientTestId: number, resultValue: string): Promise<PatientTestResult> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/${patientTestId}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ result_value: resultValue }),
    });
    if (!response.ok) {
      throw new Error('Failed to save test result');
    }
    return response.json();
  },

  updateTestResult: async (resultId: number, resultValue: string): Promise<PatientTestResult> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/results/${resultId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ result_value: resultValue }),
    });
    if (!response.ok) {
      throw new Error('Failed to update test result');
    }
    return response.json();
  },

  updateReportStatus: async (patientServiceId: number, reportStatus: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/lab-tests/service/${patientServiceId}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report_status: reportStatus }),
    });
    if (!response.ok) {
      throw new Error('Failed to update report status');
    }
    return response.json();
  },
};

// Services API
export const servicesApi = {
  getAll: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/services/all`);
    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }
    return response.json();
  },

  getDepartments: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/services/departments`);
    if (!response.ok) {
      throw new Error('Failed to fetch departments');
    }
    return response.json();
  },

  getServiceTypes: async (departmentId: number): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/services/service-types/${departmentId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch service types');
    }
    return response.json();
  },

  getTests: async (serviceTypeId: number): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/services/tests/${serviceTypeId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tests');
    }
    return response.json();
  },

  getStructure: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/services/structure`);
    if (!response.ok) {
      throw new Error('Failed to fetch service structure');
    }
    return response.json();
  },
};

// Radiology interfaces
export interface RadiologyService {
  prescription_id: string;
  appointment_id: string;
  service_id: string;
  patient_name: string;
  doctor_name: string;
  payment_status: boolean;
  test_conducted: boolean;
  test_conducted_at: string | null;
  service_name: string;
  prescribed_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface RadiologyReport {
  report_id: string;
  prescription_id: string;
  template_id: string;
  report_data: any;
  report_file_path: string | null;
  created_at: string;
  updated_at: string;
  service_id?: string;
  service_name?: string;
}

export interface RadiologyPrescriptionsResponse {
  patient: {
    patient_id: string;
    patient_name: string;
    doctor_name: string;
    appointment_date: string;
  };
  services: RadiologyService[];
}

export interface RadiologyServiceType {
  service_id: string;
  name: string;
  price?: number;
}

export interface RadiologyTemplate {
  template_id: string;
  service_id: string;
  template_name: string;
  template_structure: any;
  created_at: string;
  updated_at: string;
}

// Patient Test Results interfaces
export interface PatientTestResult {
  result_id: number;
  patient_test_id: number;
  result_value: string;
  reported_at: string;
  test_name: string;
  unit: string;
  normal_min: number;
  normal_max: number;
  status?: 'normal' | 'high' | 'low';
}

export interface PatientInfo {
  patient_name: string;
  doctor_name: string;
  phone: string;
  sample_collected: string;
  sample_received: string;
  report_on: string;
}

export interface MedicalReportData {
  patient_info: PatientInfo;
  service_info: {
    service_type_name: string;
    sub_department_name: string;
  };
  test_results: PatientTestResult[];
}

// Patient Test Results API
export const patientTestResultsApi = {
  // Get detailed medical report data for a specific patient service
  getMedicalReportData: async (patientServiceId: number): Promise<MedicalReportData> => {
    return api.get(`/patient-services/${patientServiceId}/medical-report`);
  },

  // Get test results for a patient service
  getTestResults: async (patientServiceId: number): Promise<PatientTestResult[]> => {
    return api.get(`/patient-services/${patientServiceId}/test-results`);
  },

  // Get patient information by appointment ID
  getPatientInfo: async (appointmentId: string): Promise<PatientInfo> => {
    return api.get(`/appointments/${appointmentId}/patient-info`);
  },
};

// Generic API client for services
export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to post to ${endpoint}`);
    }
    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update ${endpoint}`);
    }
    return response.json();
  },

  delete: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete ${endpoint}`);
    }
    return response.json();
  },
};