# Radiology Services Management

This document describes the radiology services management functionality implemented in the CURA Hospitals system.

## Overview

The radiology services management system allows administrators to:
- Create, edit, and delete radiology services
- Manage report templates for each service
- Configure service pricing and descriptions
- Organize services with structured report templates

## Features

### 1. Service Management
- **Add Services**: Create new radiology services with name, description, and optional pricing
- **Edit Services**: Modify existing service details
- **Delete Services**: Remove services (with safety checks for dependencies)
- **Search & Filter**: Find services by name or description
- **Sorting**: Sort by name, price, or creation date

### 2. Template Management
- **Report Templates**: Create structured report templates for each service
- **JSON Structure**: Define template fields and types using JSON
- **Field Types**: Support for various input types (textarea, input, etc.)
- **Template Versioning**: Track creation and update timestamps

## Database Schema

### Radiology Services Table
```sql
CREATE TABLE public.radiology_services (
  service_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  price numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT radiology_services_pkey PRIMARY KEY (service_id)
);
```

### Report Templates Table
```sql
CREATE TABLE public.radiology_report_templates (
  template_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  service_id uuid NOT NULL,
  template_name character varying NOT NULL,
  template_structure jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT radiology_report_templates_pkey PRIMARY KEY (template_id),
  CONSTRAINT radiology_report_templates_service_fkey FOREIGN KEY (service_id) REFERENCES public.radiology_services(service_id)
);
```

## Template Structure

Templates use a JSON structure to define report fields. Example:

```json
{
  "title": "Ultrasound Abdomen and Pelvis",
  "fields": [
    {
      "name": "Liver",
      "type": "textarea",
      "default": "Normal in size and echopattern. No obvious focal lesion..."
    },
    {
      "name": "GB",
      "type": "textarea",
      "default": "Partially distended. Grossly normal..."
    },
    {
      "name": "Pancreas",
      "type": "textarea"
    },
    {
      "name": "Spleen",
      "type": "textarea"
    },
    {
      "name": "Kidneys",
      "type": "textarea"
    },
    {
      "name": "Urinary bladder",
      "type": "textarea"
    },
    {
      "name": "Uterus",
      "type": "textarea"
    },
    {
      "name": "Ovaries",
      "type": "textarea"
    },
    {
      "name": "Impression",
      "type": "textarea"
    },
    {
      "name": "Additional Information",
      "type": "textarea"
    }
  ],
  "footer": "Note: Investigations have their limitations. Solitary pathological/Radiological and other investigations never confirm the final diagnosis..."
}
```

## API Endpoints

### Services
- `GET /api/radiology-services` - Get all services
- `POST /api/radiology-services` - Create new service
- `PUT /api/radiology-services/:serviceId` - Update service
- `DELETE /api/radiology-services/:serviceId` - Delete service

### Templates
- `GET /api/radiology-services/:serviceId/templates` - Get templates for a service
- `POST /api/radiology-services/:serviceId/templates` - Create new template
- `PUT /api/radiology-services/:serviceId/templates/:templateId` - Update template
- `DELETE /api/radiology-services/:serviceId/templates/:templateId` - Delete template

## Usage

### Adding a New Service
1. Navigate to Radiology → Services tab
2. Click "Add Service" button
3. Fill in service name, description, and optional price
4. Click "Add Service" to save

### Creating a Report Template
1. Click "Templates" button for a service
2. Click "Add Template" button
3. Enter template name
4. Define JSON structure for the template
5. Click "Add Template" to save

### Template Field Types
- `textarea`: Multi-line text input
- `input`: Single-line text input
- `number`: Numeric input
- `select`: Dropdown selection
- `checkbox`: Boolean input

## Safety Features

- **Dependency Checks**: Services cannot be deleted if they have prescriptions or templates
- **Template Protection**: Templates cannot be deleted if they're used in reports
- **Validation**: JSON structure validation for templates
- **Confirmation Dialogs**: Delete operations require confirmation

## Integration

The radiology services system integrates with:
- **Prescriptions**: Services can be prescribed to patients
- **Reports**: Templates generate structured reports
- **Billing**: Service pricing is used for billing calculations

## Future Enhancements

- **Template Categories**: Organize templates by type or specialty
- **Field Validation**: Add validation rules for template fields
- **Template Import/Export**: Bulk template management
- **Version Control**: Track template changes over time
- **Preview Mode**: Preview reports before generation

## Troubleshooting

### Common Issues
1. **Template JSON Invalid**: Ensure JSON syntax is correct
2. **Service Deletion Fails**: Check if service has dependencies
3. **Template Not Found**: Verify template ID and service association

### Error Messages
- "Cannot delete service as it is being used in prescriptions"
- "Cannot delete service as it has associated report templates"
- "Template structure must be valid JSON"
- "Cannot delete template as it is being used in reports"

## Support

For technical support or questions about the radiology services management system, please contact the development team or refer to the system documentation.
