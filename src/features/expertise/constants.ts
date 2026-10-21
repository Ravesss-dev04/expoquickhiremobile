export type ExpertiseCategory = {
  id: string;
  label: string;
  description: string;
};

export const expertiseCategories: ExpertiseCategory[] = [
  { id: 'event-staff', label: 'Event Staff', description: 'Setup, guest support, and event operations.' },
  { id: 'service-crew', label: 'Service Crew', description: 'Front-of-house and service-led hospitality work.' },
  { id: 'sales-promoter', label: 'Sales Promoter', description: 'Promotions, demos, and in-person sales support.' },
  { id: 'customer-service', label: 'Customer Service', description: 'Help desk, support, and customer care roles.' },
  { id: 'warehouse-assistant', label: 'Warehouse Assistant', description: 'Inventory, packing, and dispatch support.' },
  { id: 'delivery-support', label: 'Delivery Support', description: 'Logistics coordination and route assistance.' },
  { id: 'administrative-assistant', label: 'Administrative Assistant', description: 'Scheduling, document handling, and office support.' },
  { id: 'retail-assistant', label: 'Retail Assistant', description: 'Store support, merchandising, and customer engagement.' },
];

export const MAX_EXPERTISE_SELECTIONS = 3;
