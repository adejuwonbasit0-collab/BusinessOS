export interface NicheDefinition {
  key: string;
  name: string;
  icon: string;
  category: string;
  categoryName: string;
  description: string;
  terminology: {
    contacts: string;
    deals: string;
    bookings: string;
    products: string;
    orders: string;
    invoices: string;
    staff: string;
    branches: string;
  };
  kpis: Array<{
    label: string;
    value: string;
    change?: number;
    sub?: string;
    icon: string;
    color: 'blue' | 'green' | 'violet' | 'amber' | 'teal' | 'red';
  }>;
  quickActions: Array<{
    label: string;
    action: string;
    icon: string;
    color?: string;
  }>;
  operationalTitle: string;
  operationalColumns: string[];
  mockRecords: Array<Record<string, any>>;
  suggestedModules: string[];
}

export const NICHE_CATEGORIES = [
  { key: 'education', name: 'Education & Training', icon: '🎓' },
  { key: 'hospitality', name: 'Hospitality, Travel & Events', icon: '🏨' },
  { key: 'health', name: 'Healthcare & Personal Wellness', icon: '🏥' },
  { key: 'retail', name: 'Retail & E-Commerce', icon: '🛍️' },
  { key: 'professional', name: 'Professional & Creative Services', icon: '💼' },
  { key: 'construction', name: 'Construction, Real Estate & Manufacturing', icon: '🏗️' },
  { key: 'transport', name: 'Logistics, Transport & Automotive', icon: '🚚' },
  { key: 'public_interest', name: 'Agriculture & Public Interest', icon: '🌾' },
  { key: 'media', name: 'Media, Entertainment & Community', icon: '🎬' },
];

export const NICHES_DATA: Record<string, NicheDefinition> = {
  // ── 1. Education & Training ───────────────────────────────────────────────
  school: {
    key: 'school',
    name: 'Primary & Secondary Schools',
    icon: '🎓',
    category: 'education',
    categoryName: 'Education & Training',
    description: 'Student enrolments, academic terms, attendance, tuition fees, parent portal and report cards.',
    terminology: { contacts: 'Students', deals: 'Admissions', bookings: 'Classes', products: 'Courses & Uniforms', orders: 'Fee Invoices', invoices: 'Tuition Fees', staff: 'Teachers', branches: 'Campuses' },
    kpis: [
      { label: 'Enrolled Students', value: '1,420', change: 8.5, sub: 'Active students this term', icon: 'Users', color: 'blue' },
      { label: 'Average Attendance', value: '96.4%', change: 1.2, sub: 'Daily attendance rate', icon: 'CheckCircle', color: 'green' },
      { label: 'Term Tuition Collected', value: '$342,800', change: 14.1, sub: '92% of term target', icon: 'DollarSign', color: 'teal' },
      { label: 'Pending Admissions', value: '38', change: -5.0, sub: 'Applicants in review', icon: 'Clock', color: 'amber' },
    ],
    quickActions: [
      { label: 'Enrol Student', action: 'contacts', icon: 'UserPlus' },
      { label: 'Record Attendance', action: 'bookings', icon: 'CalendarCheck' },
      { label: 'Generate Fee Invoice', action: 'finance', icon: 'Receipt' },
      { label: 'Publish Announcement', action: 'communication', icon: 'Send' },
    ],
    operationalTitle: 'Active Classes & Enrolment Timetable',
    operationalColumns: ['Grade / Class', 'Room', 'Homeroom Teacher', 'Enrolled', 'Fee Status', 'Action'],
    mockRecords: [
      { col1: 'Grade 10 - Advanced Math', col2: 'Room 204', col3: 'Dr. Michael Chen', col4: '28 / 30', col5: '96% Paid' },
      { col1: 'Grade 11 - Biology Lab', col2: 'Science Wing B', col3: 'Ms. Sarah Jenkins', col4: '25 / 25', col5: '100% Paid' },
      { col1: 'Grade 9 - English Literature', col2: 'Room 108', col3: 'Mr. David Okafor', col4: '30 / 30', col5: '88% Paid' },
      { col1: 'Grade 12 - World History', col2: 'Auditorium 2', col3: 'Mrs. Emily Vance', col4: '26 / 30', col5: '94% Paid' },
    ],
    suggestedModules: ['crm', 'finance', 'booking', 'documents', 'portals', 'communication'],
  },

  university: {
    key: 'university',
    name: 'Universities & Colleges',
    icon: '🏛️',
    category: 'education',
    categoryName: 'Education & Training',
    description: 'Faculties, course registration, semester exams, research grants, alumni and student accounts.',
    terminology: { contacts: 'Students', deals: 'Admissions', bookings: 'Lectures', products: 'Degrees & Courses', orders: 'Tuition Billings', invoices: 'Semester Fees', staff: 'Professors & Lecturers', branches: 'Faculties' },
    kpis: [
      { label: 'Total Undergrads', value: '8,650', change: 6.2, sub: 'Fall Semester cohort', icon: 'Users', color: 'blue' },
      { label: 'Course Fill Rate', value: '94.8%', change: 2.5, sub: 'Lecture halls utilization', icon: 'GraduationCap', color: 'violet' },
      { label: 'Grant Funding', value: '$1.85M', change: 18.0, sub: 'Active research capital', icon: 'DollarSign', color: 'teal' },
      { label: 'Active Faculty', value: '340', change: 3.1, sub: 'Tenured & adjunct staff', icon: 'Briefcase', color: 'green' },
    ],
    quickActions: [
      { label: 'Register Course', action: 'bookings', icon: 'BookOpen' },
      { label: 'New Student Intake', action: 'contacts', icon: 'UserCheck' },
      { label: 'Manage Research Project', action: 'projects', icon: 'FolderGit2' },
      { label: 'Process Semester Invoices', action: 'finance', icon: 'CreditCard' },
    ],
    operationalTitle: 'Faculties & Lecture Modules',
    operationalColumns: ['Faculty', 'Course Code', 'Lead Professor', 'Credits', 'Capacity', 'Status'],
    mockRecords: [
      { col1: 'Computer Science', col2: 'CS-401 Algorithms', col3: 'Prof. Alan Wright', col4: '4 Credits', col5: '120 / 120 (Full)' },
      { col1: 'Medicine & Health', col2: 'MED-205 Anatomy', col3: 'Dr. Rebecca Stone', col4: '5 Credits', col5: '85 / 90' },
      { col1: 'Business Administration', col2: 'MBA-610 Finance', col3: 'Prof. Kenneth Ross', col4: '3 Credits', col5: '64 / 70' },
      { col1: 'Engineering', col2: 'ENG-302 Robotics', col3: 'Dr. Linda Nwachukwu', col4: '4 Credits', col5: '48 / 50' },
    ],
    suggestedModules: ['crm', 'finance', 'accounting', 'projects', 'documents', 'portals'],
  },

  tutor: {
    key: 'tutor',
    name: 'Private Tutors & Lessons',
    icon: '👨‍🏫',
    category: 'education',
    categoryName: 'Education & Training',
    description: 'One-on-one sessions, lesson schedules, student progress tracking, hourly invoicing and homework files.',
    terminology: { contacts: 'Students / Tutees', deals: 'Trial Requests', bookings: 'Private Lessons', products: 'Lesson Packages', orders: 'Package Bookings', invoices: 'Lesson Invoices', staff: 'Instructors', branches: 'Study Locations' },
    kpis: [
      { label: 'Active Students', value: '42', change: 12.0, sub: 'Weekly recurring learners', icon: 'Users', color: 'blue' },
      { label: 'Lesson Hours Taught', value: '64 hrs', change: 8.5, sub: 'This month to date', icon: 'Clock', color: 'violet' },
      { label: 'Hourly Revenue', value: '$4,160', change: 15.2, sub: '$65 / hr average rate', icon: 'DollarSign', color: 'green' },
      { label: 'Upcoming Lessons', value: '18', change: 0, sub: 'Scheduled next 7 days', icon: 'Calendar', color: 'amber' },
    ],
    quickActions: [
      { label: 'Schedule Lesson', action: 'bookings', icon: 'CalendarPlus' },
      { label: 'Log Progress Note', action: 'documents', icon: 'FileEdit' },
      { label: 'Send Hourly Invoice', action: 'finance', icon: 'Receipt' },
      { label: 'Share Homework', action: 'portals', icon: 'Upload' },
    ],
    operationalTitle: 'This Week\'s Lesson Schedule',
    operationalColumns: ['Student Name', 'Subject', 'Date & Time', 'Duration', 'Rate', 'Status'],
    mockRecords: [
      { col1: 'Liam Harrison', col2: 'Calculus BC', col3: 'Today, 4:00 PM', col4: '60 min', col5: '$70.00' },
      { col1: 'Maya Patel', col2: 'SAT Verbal Prep', col3: 'Tomorrow, 5:30 PM', col4: '90 min', col5: '$100.00' },
      { col1: 'Noah Al-Mansoor', col2: 'Physics Honors', col3: 'Friday, 3:00 PM', col4: '60 min', col5: '$65.00' },
    ],
    suggestedModules: ['crm', 'booking', 'finance', 'documents', 'portals'],
  },

  // ── 2. Hospitality, Travel & Events ──────────────────────────────────────
  hotel: {
    key: 'hotel',
    name: 'Hotels & Resorts',
    icon: '🏨',
    category: 'hospitality',
    categoryName: 'Hospitality, Travel & Events',
    description: 'Room reservations, guest check-in/out, housekeeping status, minibar POS, night audit and billing.',
    terminology: { contacts: 'Guests', deals: 'Reservations', bookings: 'Room Stays', products: 'Rooms & Amenities', orders: 'Folio Charges', invoices: 'Guest Folios', staff: 'Hotel Staff & Concierge', branches: 'Properties' },
    kpis: [
      { label: 'Occupancy Rate', value: '88.4%', change: 7.2, sub: '115 of 130 rooms booked', icon: 'Building2', color: 'blue' },
      { label: 'RevPAR', value: '$164.20', change: 9.8, sub: 'Revenue per available room', icon: 'DollarSign', color: 'green' },
      { label: 'Today Arrivals', value: '34', change: 0, sub: 'Check-in from 2:00 PM', icon: 'DoorOpen', color: 'violet' },
      { label: 'Housekeeping Clean', value: '92%', change: 3.5, sub: '120 rooms inspected', icon: 'Sparkles', color: 'teal' },
    ],
    quickActions: [
      { label: 'New Reservation', action: 'bookings', icon: 'CalendarPlus' },
      { label: 'Fast Check-In', action: 'contacts', icon: 'KeyRound' },
      { label: 'Housekeeping Board', action: 'projects', icon: 'Bed' },
      { label: 'Print Guest Folio', action: 'finance', icon: 'Printer' },
    ],
    operationalTitle: 'Current Room Occupancy & Front Desk Queue',
    operationalColumns: ['Room #', 'Type', 'Guest Name', 'Check In - Out', 'Status', 'Folio Balance'],
    mockRecords: [
      { col1: 'Suite 401', col2: 'Executive Ocean View', col3: 'Alexander Hamilton', col4: 'Oct 22 - Oct 27', col5: 'Occupied' },
      { col1: 'Room 214', col2: 'Deluxe King', col3: 'Beatrice Gomez', col4: 'Oct 23 - Oct 25', col5: 'Arrival Today' },
      { col1: 'Room 108', col2: 'Standard Queen', col3: 'Marcus Brody', col4: 'Oct 20 - Oct 23', col5: 'Departure' },
      { col1: 'Penthouse A', col2: 'Presidential Suite', col3: 'Victoria Sterling', col4: 'Oct 22 - Nov 01', col5: 'Occupied' },
    ],
    suggestedModules: ['crm', 'booking', 'finance', 'hr', 'documents', 'website', 'portals'],
  },

  restaurant: {
    key: 'restaurant',
    name: 'Restaurants & Cafés',
    icon: '🍽️',
    category: 'hospitality',
    categoryName: 'Hospitality, Travel & Events',
    description: 'Table reservations, table POS register, kitchen order tickets (KOT), inventory recipes and daily takings.',
    terminology: { contacts: 'Diners & VIPs', deals: 'Party Bookings', bookings: 'Table Reservations', products: 'Menu Items', orders: 'Table Orders', invoices: 'Meal Receipts', staff: 'Chefs & Waitstaff', branches: 'Outlets' },
    kpis: [
      { label: 'Today\'s Covers', value: '248', change: 11.5, sub: 'Dinner rush expected', icon: 'Users', color: 'blue' },
      { label: 'Daily Takings', value: '$8,420', change: 14.0, sub: 'Average $34 per cover', icon: 'DollarSign', color: 'green' },
      { label: 'Table Turnover', value: '48 min', change: -6.2, sub: 'Average seating time', icon: 'Clock', color: 'violet' },
      { label: 'Low Ingredient Alerts', value: '3 items', change: 0, sub: 'Fresh salmon, truffle oil', icon: 'AlertTriangle', color: 'amber' },
    ],
    quickActions: [
      { label: 'Open POS Register', action: 'sales', icon: 'Receipt' },
      { label: 'Book Table', action: 'bookings', icon: 'UtensilsCrossed' },
      { label: 'Order Ingredients', action: 'inventory', icon: 'Truck' },
      { label: 'Daily Shift Close', action: 'accounting', icon: 'Calculator' },
    ],
    operationalTitle: 'Dining Room Floor & Active Tables',
    operationalColumns: ['Table #', 'Guests', 'Assigned Server', 'Current Bill', 'Order Status', 'Time Seated'],
    mockRecords: [
      { col1: 'Table 4 (Booth)', col2: '4 Guests', col3: 'Marco R.', col4: '$148.50', col5: 'Main Course Served' },
      { col1: 'Table 7 (Patio)', col2: '2 Guests', col3: 'Elena K.', col4: '$72.00', col5: 'Starters Placed' },
      { col1: 'Table 12 (VIP)', col2: '8 Guests', col3: 'Chef Special', col4: '$420.00', col5: 'Desserts & Coffee' },
      { col1: 'Bar Seat 3-4', col2: '2 Guests', col3: 'Toby B.', col4: '$54.00', col5: 'Drinks Only' },
    ],
    suggestedModules: ['sales', 'inventory', 'booking', 'finance', 'hr'],
  },

  airport: {
    key: 'airport',
    name: 'Airports & Aviation Services',
    icon: '🛫',
    category: 'hospitality',
    categoryName: 'Hospitality, Travel & Events',
    description: 'Gate management, flight handling, ground operations, tarmac equipment maintenance, aviation refueling and tenant leasing.',
    terminology: { contacts: 'Airlines & Passengers', deals: 'Handling Contracts', bookings: 'Gate Allocations', products: 'Aviation Services', orders: 'Service Invoices', invoices: 'Handling Bills', staff: 'Ground Crew & Security', branches: 'Terminals' },
    kpis: [
      { label: 'Flights Handled Today', value: '142', change: 4.8, sub: 'Commercial & Cargo', icon: 'Plane', color: 'blue' },
      { label: 'On-Time Departure', value: '94.2%', change: 1.8, sub: 'Tarmac SLA target >92%', icon: 'CheckCircle', color: 'green' },
      { label: 'Jet Fuel Dispensed', value: '84,200 L', change: 8.5, sub: 'Hydrant & bowser ops', icon: 'Droplets', color: 'teal' },
      { label: 'Active Gate Occupancy', value: '88%', change: 2.0, sub: '18 of 20 gates assigned', icon: 'Building', color: 'violet' },
    ],
    quickActions: [
      { label: 'Assign Flight Gate', action: 'bookings', icon: 'PlaneLanding' },
      { label: 'Log Fueling Order', action: 'inventory', icon: 'Fuel' },
      { label: 'Dispatch Ground Crew', action: 'hr', icon: 'Users' },
      { label: 'Tarmac Safety Log', action: 'documents', icon: 'ShieldAlert' },
    ],
    operationalTitle: 'Active Gate Schedule & Flight Dispatches',
    operationalColumns: ['Flight #', 'Airline', 'Origin / Dest', 'Gate', 'Schedule', 'Turnaround Status'],
    mockRecords: [
      { col1: 'BA-248', col2: 'British Airways', col3: 'London LHR -> Lagos', col4: 'Gate 04', col5: '14:20 Dep' },
      { col1: 'DL-812', col2: 'Delta Airlines', col3: 'Atlanta ATL -> Paris', col4: 'Gate 08', col5: '14:45 Dep' },
      { col1: 'EK-782', col2: 'Emirates', col3: 'Dubai DXB -> New York', col4: 'Gate 02', col5: '15:10 Boarding' },
      { col1: 'QA-311', col2: 'Qatar Cargo', col3: 'Doha DOH -> Frankfurt', col4: 'Cargo Bay 1', col5: '15:30 Loading' },
    ],
    suggestedModules: ['projects', 'hr', 'documents', 'inventory', 'finance', 'communication'],
  },

  // ── 3. Healthcare & Personal Wellness ─────────────────────────────────────
  hospital: {
    key: 'hospital',
    name: 'Hospitals & Medical Centres',
    icon: '🏥',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    description: 'Patient records (EMR), consultations, ward bed allocation, pharmacy stock, lab tests and insurance claims.',
    terminology: { contacts: 'Patients', deals: 'Admissions', bookings: 'Consultations', products: 'Medications & Procedures', orders: 'Treatment Orders', invoices: 'Medical Bills', staff: 'Doctors & Nurses', branches: 'Wards & Clinics' },
    kpis: [
      { label: 'Patients Treated Today', value: '318', change: 9.4, sub: 'Outpatient & Emergency', icon: 'HeartPulse', color: 'red' },
      { label: 'Bed Occupancy', value: '86.5%', change: 2.1, sub: '142 of 164 beds filled', icon: 'Bed', color: 'blue' },
      { label: 'Average Triage Wait', value: '14 min', change: -18.0, sub: 'Emergency response time', icon: 'Clock', color: 'green' },
      { label: 'Pending Lab Results', value: '24', change: -4.0, sub: 'In diagnostic queue', icon: 'TestTube', color: 'amber' },
    ],
    quickActions: [
      { label: 'Register Patient', action: 'contacts', icon: 'UserPlus' },
      { label: 'Book Doctor Consultation', action: 'bookings', icon: 'Stethoscope' },
      { label: 'Dispense Medication', action: 'inventory', icon: 'Pill' },
      { label: 'Generate Insurance Claim', action: 'finance', icon: 'FileText' },
    ],
    operationalTitle: 'Today\'s Outpatient Clinic & Ward Patients',
    operationalColumns: ['MRN / ID', 'Patient Name', 'Attending Physician', 'Department', 'Triage Category', 'Status'],
    mockRecords: [
      { col1: 'MED-9041', col2: 'Eleanor Roosevelt', col3: 'Dr. Gregory House', col4: 'Cardiology', col5: 'Urgent' },
      { col1: 'MED-9042', col2: 'Samuel Adebayo', col3: 'Dr. Ngozi Eze', col4: 'Orthopedics', col5: 'Standard' },
      { col1: 'MED-9043', col2: 'Maria Hernandez', col3: 'Dr. James Wilson', col4: 'Pediatrics', col5: 'Follow-up' },
      { col1: 'MED-9044', col2: 'Chen Wei', col3: 'Dr. Lisa Cuddy', col4: 'General Surgery', col5: 'Pre-op' },
    ],
    suggestedModules: ['crm', 'booking', 'inventory', 'finance', 'documents', 'hr', 'portals'],
  },

  beauty_salon: {
    key: 'beauty_salon',
    name: 'Barbershops, Salons & Spas',
    icon: '💈',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    description: 'Stylist chairs, haircut bookings, walk-in register, hair products POS, stylist commission calculations and client history.',
    terminology: { contacts: 'Clients', deals: 'Style Consultations', bookings: 'Appointments', products: 'Services & Haircare', orders: 'Salon Tickets', invoices: 'Service Receipts', staff: 'Barbers & Stylists', branches: 'Salon Locations' },
    kpis: [
      { label: 'Booked Appointments', value: '38', change: 14.5, sub: '8 chairs running today', icon: 'Scissors', color: 'violet' },
      { label: 'Walk-ins Welcomed', value: '16', change: 8.0, sub: 'Quick barber queue', icon: 'UserCheck', color: 'blue' },
      { label: 'Retail Product Sales', value: '$1,240', change: 22.1, sub: 'Pomades, oils & balms', icon: 'ShoppingBag', color: 'green' },
      { label: 'Stylist Commissions', value: '$890.00', change: 12.0, sub: 'Commission pool today', icon: 'DollarSign', color: 'teal' },
    ],
    quickActions: [
      { label: 'New Appointment', action: 'bookings', icon: 'CalendarPlus' },
      { label: 'New Walk-in Ticket', action: 'sales', icon: 'Scissors' },
      { label: 'Sell Haircare Product', action: 'sales', icon: 'ShoppingBag' },
      { label: 'View Stylist Earnings', action: 'hr', icon: 'DollarSign' },
    ],
    operationalTitle: 'Stylist Chair Schedule & Walk-in Board',
    operationalColumns: ['Chair / Station', 'Stylist', 'Current Client', 'Service Requested', 'Time Slot', 'Bill'],
    mockRecords: [
      { col1: 'Chair 1 (Master)', col2: 'Andre "Cuts" Smith', col3: 'Julian Thorne', col4: 'Skin Fade + Beard Sculpt', col5: '14:00 - 14:45' },
      { col1: 'Chair 2', col2: 'Zara Laurent', col3: 'Chloe Martin', col4: 'Balayage & Blowdry', col5: '13:30 - 15:30' },
      { col1: 'Station 3 (Spa)', col2: 'Mia Tanaka', col3: 'Sophia Jenkins', col4: 'Hydrating Facial Massage', col5: '14:30 - 15:15' },
      { col1: 'Chair 4 (Barber)', col2: 'Kofi Mensah', col3: 'Tariq Al-Fahad', col4: 'Hot Towel Shave', col5: '14:15 - 14:45' },
    ],
    suggestedModules: ['booking', 'sales', 'inventory', 'crm', 'finance', 'website'],
  },

  dental: {
    key: 'dental',
    name: 'Dental Practices',
    icon: '🦷',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    description: 'Patient dental charts, hygienist appointments, treatment plans, teeth cleaning, x-rays and recall reminders.',
    terminology: { contacts: 'Patients', deals: 'Treatment Plans', bookings: 'Dental Appointments', products: 'Procedures & Supplies', orders: 'Treatment Bills', invoices: 'Patient Statements', staff: 'Dentists & Hygienists', branches: 'Clinics' },
    kpis: [
      { label: 'Today\'s Patients', value: '26', change: 8.3, sub: '3 operatory chairs active', icon: 'Smile', color: 'blue' },
      { label: 'Treatment Value', value: '$9,850', change: 15.0, sub: 'Crowns, cleanings, braces', icon: 'DollarSign', color: 'green' },
      { label: 'Recall Compliance', value: '84%', change: 4.2, sub: '6-month hygiene returns', icon: 'CalendarCheck', color: 'teal' },
      { label: 'Insurance Verification', value: '100%', change: 0, sub: 'All pre-authorized', icon: 'ShieldCheck', color: 'violet' },
    ],
    quickActions: [
      { label: 'Book Dental Visit', action: 'bookings', icon: 'CalendarPlus' },
      { label: 'Create Treatment Plan', action: 'documents', icon: 'ClipboardPlus' },
      { label: 'Send Recall Reminder', action: 'communication', icon: 'BellRing' },
      { label: 'Check Lab Order', action: 'inventory', icon: 'Package' },
    ],
    operationalTitle: 'Operatory Chair Schedule',
    operationalColumns: ['Operatory', 'Dentist', 'Patient', 'Procedure', 'Time', 'Est. Fee'],
    mockRecords: [
      { col1: 'Operatory 1', col2: 'Dr. Sarah Mitchell, DDS', col3: 'Brian O\'Connor', col4: 'Porcelain Crown Prep', col5: '14:00 - 15:00' },
      { col1: 'Operatory 2 (Hygiene)', col2: 'Lisa Ray, RDH', col3: 'Amina Yusuf', col4: 'Deep Cleaning & Fluoride', col5: '14:15 - 15:00' },
      { col1: 'Operatory 3', col2: 'Dr. Kevin Miller, DMD', col3: 'George Vance', col4: 'Root Canal Therapy', col5: '15:15 - 16:30' },
    ],
    suggestedModules: ['crm', 'booking', 'finance', 'documents', 'portals'],
  },

  pharmacy: {
    key: 'pharmacy',
    name: 'Pharmacies & Chemists',
    icon: '💊',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    description: 'Prescription dispensing, batch expiry tracking, OTC medicine sales, supplier reorders and health consultations.',
    terminology: { contacts: 'Patients & Customers', deals: 'Prescription Orders', bookings: 'Consultations & Vaccinations', products: 'Medications & OTC Products', orders: 'Dispense Orders', invoices: 'Receipts', staff: 'Pharmacists & Dispensers', branches: 'Pharmacies' },
    kpis: [
      { label: 'Prescriptions Filled', value: '184', change: 12.4, sub: 'Rx dispensed today', icon: 'Pill', color: 'teal' },
      { label: 'Daily Counter Sales', value: '$6,840', change: 9.1, sub: 'OTC, vitamins & skincare', icon: 'DollarSign', color: 'green' },
      { label: 'Expiring Stock Alerts', value: '4 batches', change: -2.0, sub: 'Within 60-day threshold', icon: 'AlertTriangle', color: 'amber' },
      { label: 'Drug Interaction Checks', value: '100%', change: 0, sub: 'Zero adverse flags', icon: 'ShieldCheck', color: 'blue' },
    ],
    quickActions: [
      { label: 'Dispense Rx', action: 'sales', icon: 'PlusCircle' },
      { label: 'Scan Barcode', action: 'inventory', icon: 'ScanLine' },
      { label: 'Reorder from Wholesaler', action: 'inventory', icon: 'Truck' },
      { label: 'Vaccination Appointment', action: 'bookings', icon: 'Syringe' },
    ],
    operationalTitle: 'Active Prescription Queue',
    operationalColumns: ['Rx Number', 'Patient Name', 'Prescribed Drug', 'Dosage', 'Prescriber', 'Dispense Status'],
    mockRecords: [
      { col1: 'RX-88219', col2: 'Hannah Abbott', col3: 'Amoxicillin 500mg', col4: '1 tid x 7 days', col5: 'Dr. K. Smith' },
      { col1: 'RX-88220', col2: 'David Adeleke', col3: 'Atorvastatin 20mg', col4: '1 daily x 30 days', col5: 'Dr. N. Eze' },
      { col1: 'RX-88221', col2: 'Robert Brown', col3: 'Ventolin Inhaler 100mcg', col4: '2 puffs prn', col5: 'Dr. M. Chen' },
    ],
    suggestedModules: ['inventory', 'sales', 'crm', 'finance', 'booking'],
  },

  // ── 4. Retail & E-Commerce ───────────────────────────────────────────────
  retail: {
    key: 'retail',
    name: 'Retail Stores & Boutiques',
    icon: '🛍️',
    category: 'retail',
    categoryName: 'Retail & E-Commerce',
    description: 'In-store POS register, barcode scanner, multi-variant products (size/color), stock replenishment and loyalty rewards.',
    terminology: { contacts: 'Shoppers & VIPs', deals: 'Wholesale Enquiries', bookings: 'Personal Styling', products: 'Merchandise & Items', orders: 'Store Sales', invoices: 'Receipts', staff: 'Cashiers & Store Associates', branches: 'Stores & Outlets' },
    kpis: [
      { label: 'Daily Sales', value: '$5,920', change: 16.4, sub: '142 customer transactions', icon: 'DollarSign', color: 'green' },
      { label: 'Units Sold', value: '384 pcs', change: 11.2, sub: 'Average 2.7 items / cart', icon: 'ShoppingBag', color: 'blue' },
      { label: 'Average Basket Size', value: '$41.69', change: 4.8, sub: 'Trending above target', icon: 'TrendingUp', color: 'violet' },
      { label: 'Reorder Triggers', value: '6 items', change: 0, sub: 'Fast selling inventory', icon: 'AlertCircle', color: 'amber' },
    ],
    quickActions: [
      { label: 'Open POS Register', action: 'sales', icon: 'ScanBarcode' },
      { label: 'Add Product & Barcode', action: 'inventory', icon: 'Plus' },
      { label: 'Stock Take / Count', action: 'inventory', icon: 'ClipboardCheck' },
      { label: 'Print Thermal Receipt', action: 'sales', icon: 'Printer' },
    ],
    operationalTitle: 'Live POS Register Transactions',
    operationalColumns: ['Receipt #', 'Time', 'Items', 'Cashier', 'Payment Method', 'Total'],
    mockRecords: [
      { col1: 'REC-10492', col2: '14:24', col3: 'Slim Denim Jean (32W), Linen Shirt', col4: 'Jessica M.', col5: 'Card (Stripe)' },
      { col1: 'REC-10493', col2: '14:31', col3: 'Leather Belt (Black), Socks Pack', col4: 'Alex D.', col5: 'Cash' },
      { col1: 'REC-10494', col2: '14:38', col3: 'Wool Overcoat (Charcoal M)', col4: 'Jessica M.', col5: 'Paystack' },
    ],
    suggestedModules: ['sales', 'inventory', 'crm', 'finance', 'website'],
  },

  ecommerce: {
    key: 'ecommerce',
    name: 'E-Commerce & Online Stores',
    icon: '🛒',
    category: 'retail',
    categoryName: 'Retail & E-Commerce',
    description: 'Online store catalogue, shopping cart, digital checkout, order dispatch, courier tracking and WhatsApp order receiver.',
    terminology: { contacts: 'Online Shoppers', deals: 'Abandoned Carts', bookings: 'Delivery Windows', products: 'Online Products', orders: 'E-commerce Orders', invoices: 'Digital Invoices', staff: 'Fulfillment Team', branches: 'Fulfillment Hubs' },
    kpis: [
      { label: 'Online Revenue', value: '$12,480', change: 21.0, sub: 'This week across channels', icon: 'DollarSign', color: 'green' },
      { label: 'Orders to Dispatch', value: '48 orders', change: -12.0, sub: 'Awaiting shipping labels', icon: 'PackageCheck', color: 'blue' },
      { label: 'Store Conversion Rate', value: '3.42%', change: 0.6, sub: '14,200 store sessions', icon: 'TrendingUp', color: 'violet' },
      { label: 'WhatsApp Orders', value: '19 orders', change: 45.0, sub: 'Direct chat sales', icon: 'MessageSquare', color: 'teal' },
    ],
    quickActions: [
      { label: 'Print Shipping Labels', action: 'sales', icon: 'Printer' },
      { label: 'Manage Online Catalogue', action: 'inventory', icon: 'ShoppingBag' },
      { label: 'Edit Public Storefront', action: 'website', icon: 'Globe' },
      { label: 'View WhatsApp Inquiries', action: 'communication', icon: 'MessageCircle' },
    ],
    operationalTitle: 'Fulfillment & Outbound Shipping Queue',
    operationalColumns: ['Order #', 'Customer', 'Items', 'Destination', 'Payment Status', 'Fulfillment'],
    mockRecords: [
      { col1: 'ORD-9840', col2: 'Kelechi Nwosu', col3: '3 Items ($120.00)', col4: 'Lagos, Nigeria', col5: 'Paid (Flutterwave)' },
      { col1: 'ORD-9841', col2: 'Sophie Dubois', col3: '1 Item ($85.00)', col4: 'Paris, France', col5: 'Paid (Stripe)' },
      { col1: 'ORD-9842', col2: 'Marcus Sterling', col3: '4 Items ($210.00)', col4: 'London, UK', col5: 'Paid (PayPal)' },
      { col1: 'ORD-9843', col2: 'Amina Bello', col3: '2 Items ($64.00)', col4: 'Abuja, Nigeria', col5: 'WhatsApp Order' },
    ],
    suggestedModules: ['sales', 'inventory', 'website', 'finance', 'communication', 'portals'],
  },

  // ── 5. Professional & Creative Services ──────────────────────────────────
  professional_services: {
    key: 'professional_services',
    name: 'Freelancers & Independent Contractors',
    icon: '💻',
    category: 'professional',
    categoryName: 'Professional & Creative Services',
    description: 'Client proposals, project milestones, hourly time tracking, automated recurring invoices and client approvals.',
    terminology: { contacts: 'Clients', deals: 'Proposals & Leads', bookings: 'Consulting Calls', products: 'Services & Packages', orders: 'Client Retainers', invoices: 'Invoices', staff: 'Collaborators', branches: 'Workspaces' },
    kpis: [
      { label: 'Monthly Retainers', value: '$8,250', change: 18.5, sub: '6 active client contracts', icon: 'DollarSign', color: 'green' },
      { label: 'Billable Hours', value: '118 hrs', change: 5.2, sub: 'Target 140 hrs / mo', icon: 'Clock', color: 'blue' },
      { label: 'Pipeline Proposals', value: '$14,600', change: 24.0, sub: '3 proposals awaiting sign', icon: 'TrendingUp', color: 'violet' },
      { label: 'Outstanding Invoices', value: '$2,100', change: -10.0, sub: 'Due in 14 days', icon: 'AlertCircle', color: 'amber' },
    ],
    quickActions: [
      { label: 'Create Invoice', action: 'finance', icon: 'Receipt' },
      { label: 'Log Billable Time', action: 'projects', icon: 'Timer' },
      { label: 'Send Proposal', action: 'crm', icon: 'Send' },
      { label: 'Share Client Portal', action: 'portals', icon: 'Share2' },
    ],
    operationalTitle: 'Active Client Deliverables & Milestones',
    operationalColumns: ['Client', 'Project / Retainer', 'Next Deliverable', 'Due Date', 'Budget Burned', 'Status'],
    mockRecords: [
      { col1: 'FinTech Dynamics', col2: 'Brand & UI Design', col3: 'Mobile App Figma System', col4: 'Oct 28', col5: '75% ($6,000 / $8,000)' },
      { col1: 'Apex Legal Group', col2: 'SEO & Content Retainer', col3: 'Monthly Analytics Brief', col4: 'Oct 31', col5: '100% ($2,500 / $2,500)' },
      { col1: 'Kura Logistics', col2: 'Custom Web Portal', col3: 'Stripe Webhook Integration', col4: 'Nov 04', col5: '40% ($4,000 / $10,000)' },
    ],
    suggestedModules: ['crm', 'projects', 'finance', 'documents', 'portals'],
  },

  law_firm: {
    key: 'law_firm',
    name: 'Law Firms & Legal Practices',
    icon: '⚖️',
    category: 'professional',
    categoryName: 'Professional & Creative Services',
    description: 'Case matters, trust accounting (IOLTA), billing by tenth of an hour (0.1hr), court deadlines and e-signature contracts.',
    terminology: { contacts: 'Clients', deals: 'Matters & Retainers', bookings: 'Consultations & Hearings', products: 'Legal Services', orders: 'Matter Retainers', invoices: 'Fee Notes', staff: 'Attorneys & Paralegals', branches: 'Offices' },
    kpis: [
      { label: 'Active Legal Matters', value: '84', change: 6.3, sub: 'Litigation, Corporate, IP', icon: 'Scale', color: 'violet' },
      { label: 'Realized Billings', value: '$68,400', change: 11.2, sub: 'Average $425 / partner hr', icon: 'DollarSign', color: 'green' },
      { label: 'Upcoming Court Dates', value: '7 hearings', change: 0, sub: 'Scheduled this fortnight', icon: 'Calendar', color: 'red' },
      { label: 'Trust Account Balance', value: '$240,000', change: 4.5, sub: 'Client retainers in escrow', icon: 'Shield', color: 'blue' },
    ],
    quickActions: [
      { label: 'Open New Matter', action: 'projects', icon: 'Briefcase' },
      { label: 'Log Billable Units', action: 'projects', icon: 'Clock' },
      { label: 'Send Fee Note', action: 'finance', icon: 'Receipt' },
      { label: 'Draft Legal Contract', action: 'documents', icon: 'FileText' },
    ],
    operationalTitle: 'Active Legal Matters & Court Dates',
    operationalColumns: ['Matter #', 'Case Title', 'Lead Counsel', 'Practice Area', 'Next Milestone', 'Court Date'],
    mockRecords: [
      { col1: 'MAT-2026-081', col2: 'NexGen vs. OmniCorp IP Patent', col3: 'E. Sterling, Partner', col4: 'Intellectual Property', col5: 'Deposition Prep' },
      { col1: 'MAT-2026-094', col2: 'Crown Logistics Series B Acquisition', col3: 'M. Adebayo, Senior Assoc.', col4: 'Corporate M&A', col5: 'Due Diligence Close' },
      { col1: 'MAT-2026-102', col2: 'Cityview Land Title Arbitration', col3: 'S. Jenkins, Partner', col4: 'Real Estate & Dispute', col5: 'Tribunal Hearing' },
    ],
    suggestedModules: ['crm', 'projects', 'documents', 'finance', 'accounting', 'portals'],
  },

  accounting_firm: {
    key: 'accounting_firm',
    name: 'Accounting & Tax Firms',
    icon: '🧾',
    category: 'professional',
    categoryName: 'Professional & Creative Services',
    description: 'Client tax filings, annual audits, monthly bookkeeping, payroll dispatch, VAT returns and ledger reconciliation.',
    terminology: { contacts: 'Business Clients', deals: 'Audit & Tax Engagements', bookings: 'Tax Review Sessions', products: 'Audit & Filing Services', orders: 'Annual Retainers', invoices: 'Audit Fees', staff: 'CPAs & Auditors', branches: 'Firm Branches' },
    kpis: [
      { label: 'Client Books Managed', value: '112', change: 14.2, sub: 'Monthly active companies', icon: 'Calculator', color: 'blue' },
      { label: 'Tax Returns Filed', value: '48 / 60', change: 20.0, sub: 'Quarterly deadline target', icon: 'FileCheck', color: 'green' },
      { label: 'Firm Revenue (MRR)', value: '$34,500', change: 12.0, sub: 'Recurring advisory contracts', icon: 'DollarSign', color: 'teal' },
      { label: 'Pending Bank Recs', value: '14 accounts', change: -6.0, sub: 'Unmatched statements', icon: 'AlertTriangle', color: 'amber' },
    ],
    quickActions: [
      { label: 'Reconcile Ledger', action: 'accounting', icon: 'CheckSquare' },
      { label: 'File VAT / Tax Return', action: 'finance', icon: 'FileSpreadsheet' },
      { label: 'Run Client Payroll', action: 'hr', icon: 'Users' },
      { label: 'Request Client Documents', action: 'documents', icon: 'FolderInput' },
    ],
    operationalTitle: 'Client Tax & Filing Status Dashboard',
    operationalColumns: ['Client Entity', 'Service Line', 'Lead Accountant', 'Period', 'Filing Deadline', 'Status'],
    mockRecords: [
      { col1: 'BluePeak Technologies Ltd', col2: 'Year-End Financial Audit', col3: 'David Cohen, CPA', col4: 'FY2025', col5: 'Nov 15' },
      { col1: 'Metroline Logistics LLC', col2: 'Quarterly VAT & PAYE', col3: 'Amara Kalu, Senior', col4: 'Q3 2026', col5: 'Oct 31' },
      { col1: 'Saffron Hospitality Group', col2: 'Monthly Bookkeeping & GL', col3: 'Elena Rostova', col4: 'Sep 2026', col5: 'Completed' },
    ],
    suggestedModules: ['accounting', 'finance', 'documents', 'crm', 'projects', 'portals'],
  },

  // ── 6. Construction, Real Estate & Manufacturing ─────────────────────────
  construction: {
    key: 'construction',
    name: 'Construction Companies & Contractors',
    icon: '🏗️',
    category: 'construction',
    categoryName: 'Construction, Real Estate & Manufacturing',
    description: 'Job-site cost tracking, sub-contractors, architectural drawings, material purchase orders and safety compliance.',
    terminology: { contacts: 'Clients & Developers', deals: 'Tenders & Bids', bookings: 'Site Inspections', products: 'Building Materials & Equipment', orders: 'Sub-contracts', invoices: 'Progress Claims', staff: 'Site Engineers & Crew', branches: 'Job Sites' },
    kpis: [
      { label: 'Active Job Sites', value: '8 Sites', change: 2.0, sub: 'Commercial & Residential', icon: 'HardHat', color: 'amber' },
      { label: 'Contract Value', value: '$4.2M', change: 15.4, sub: 'Under active construction', icon: 'DollarSign', color: 'green' },
      { label: 'Safety Days (Incident Free)', value: '184 Days', change: 12.0, sub: 'Zero OSHA recordables', icon: 'ShieldCheck', color: 'blue' },
      { label: 'Pending Material POs', value: '$74,000', change: -5.0, sub: 'Cement, rebar & timber', icon: 'Truck', color: 'violet' },
    ],
    quickActions: [
      { label: 'Log Daily Site Report', action: 'projects', icon: 'ClipboardList' },
      { label: 'Create Material PO', action: 'inventory', icon: 'ShoppingBag' },
      { label: 'Submit Progress Claim', action: 'finance', icon: 'Receipt' },
      { label: 'Upload Architectural Blueprint', action: 'documents', icon: 'Upload' },
    ],
    operationalTitle: 'Active Construction Sites & Milestones',
    operationalColumns: ['Project Name', 'Site Location', 'Project Manager', 'Milestone Phase', 'Completion %', 'Budget Used'],
    mockRecords: [
      { col1: 'The Apex Luxury Residences', col2: 'Plot 4, Victoria Island', col3: 'Engr. T. Balogun', col4: 'Superstructure Slab Floor 7', col5: '64%' },
      { col1: 'St. Jude Community Hospital', col2: 'Sector 9, Greenwood', col3: 'Engr. Rachel Ross', col4: 'MEP Electrical Rough-in', col5: '42%' },
      { col1: 'Metro Industrial Logistics Park', col2: 'Expressway Junction', col3: 'Engr. Carlos Mendez', col4: 'Foundation & Steel Framing', col5: '28%' },
    ],
    suggestedModules: ['projects', 'inventory', 'finance', 'documents', 'hr'],
  },

  real_estate: {
    key: 'real_estate',
    name: 'Real Estate Agencies & Brokerages',
    icon: '🏢',
    category: 'construction',
    categoryName: 'Construction, Real Estate & Manufacturing',
    description: 'Property listings, buyer/seller pipelines, open house viewings, commission splits, lease agreements and escrow payments.',
    terminology: { contacts: 'Buyers & Tenants', deals: 'Property Offers', bookings: 'Property Viewings', products: 'Property Listings', orders: 'Deeds & Leases', invoices: 'Commission Invoices', staff: 'Realtors & Brokers', branches: 'Agency Branches' },
    kpis: [
      { label: 'Active Listings', value: '46 Properties', change: 8.2, sub: 'Total listing value $28.4M', icon: 'Building', color: 'blue' },
      { label: 'Under Contract (Pending)', value: '$4.8M', change: 18.0, sub: '6 homes in closing escrow', icon: 'CheckCircle', color: 'green' },
      { label: 'Scheduled Viewings', value: '32 this week', change: 14.0, sub: 'Open houses & private tours', icon: 'Calendar', color: 'violet' },
      { label: 'Average Days on Market', value: '28 Days', change: -12.0, sub: 'Faster turnaround', icon: 'Clock', color: 'teal' },
    ],
    quickActions: [
      { label: 'Add New Property Listing', action: 'inventory', icon: 'Home' },
      { label: 'Book Viewing Tour', action: 'bookings', icon: 'CalendarPlus' },
      { label: 'Draft Purchase Agreement', action: 'documents', icon: 'FileText' },
      { label: 'Calculate Agent Commission', action: 'finance', icon: 'DollarSign' },
    ],
    operationalTitle: 'Featured Properties & Escrow Closing Board',
    operationalColumns: ['Property Title', 'Type', 'Listing Price', 'Lead Agent', 'Status', 'Days on Market'],
    mockRecords: [
      { col1: '4-Bed Contemporary Penthouse', col2: 'Residential Sale', col3: '$850,000', col4: 'Victoria Sterling', col5: 'Active' },
      { col1: 'Oceancrest Luxury Villa', col2: 'Luxury Waterfront', col3: '$1,450,000', col4: 'Julian Thorne', col5: 'Under Contract' },
      { col1: 'Commercial Plaza Ground Floor', col2: 'Retail Lease', col3: '$6,500 / mo', col4: 'Adebayo Kunle', col5: 'Active' },
    ],
    suggestedModules: ['crm', 'booking', 'documents', 'finance', 'website', 'portals'],
  },

  // ── 7. Transport, Logistics & Automotive ─────────────────────────────────
  logistics: {
    key: 'logistics',
    name: 'Logistics, Freight & Warehousing',
    icon: '🚚',
    category: 'transport',
    categoryName: 'Logistics, Transport & Automotive',
    description: 'Waybills, freight consignments, fleet dispatch, container tracking, warehouse bay storage and driver manifests.',
    terminology: { contacts: 'Shippers & Consignees', deals: 'Freight Contracts', bookings: 'Pickup Dispatches', products: 'Cargo Services & Bays', orders: 'Waybills & Shipments', invoices: 'Freight Invoices', staff: 'Drivers & Dispatchers', branches: 'Hubs & Depots' },
    kpis: [
      { label: 'Active Shipments', value: '184', change: 12.0, sub: 'In transit across corridors', icon: 'Truck', color: 'blue' },
      { label: 'Fleet On-Time Rate', value: '97.2%', change: 1.5, sub: 'SLA delivery benchmark', icon: 'CheckCircle', color: 'green' },
      { label: 'Warehouse Capacity', value: '82%', change: 4.0, sub: 'Pallet slots occupied', icon: 'Boxes', color: 'violet' },
      { label: 'Fuel & Fleet Cost', value: '$18,240', change: -3.8, sub: 'Route optimization saved 4%', icon: 'Fuel', color: 'teal' },
    ],
    quickActions: [
      { label: 'Create Waybill', action: 'sales', icon: 'FilePlus' },
      { label: 'Dispatch Fleet Driver', action: 'projects', icon: 'Truck' },
      { label: 'Scan Inbound Cargo', action: 'inventory', icon: 'Barcode' },
      { label: 'Generate Freight Invoice', action: 'finance', icon: 'Receipt' },
    ],
    operationalTitle: 'Live In-Transit Freight Manifest',
    operationalColumns: ['Waybill #', 'Shipper', 'Origin -> Destination', 'Vehicle / Driver', 'Cargo Weight', 'ETA Status'],
    mockRecords: [
      { col1: 'WB-89021', col2: 'Unilever Distribution', col3: 'Lagos Port -> Ibadan Depot', col4: 'TRK-401 (Ibrahim S.)', col5: '24,000 kg' },
      { col1: 'WB-89022', col2: 'Apex Electronics', col3: 'Mombasa Port -> Nairobi Hub', col4: 'TRK-219 (John Mwangi)', col5: '14,500 kg' },
      { col1: 'WB-89023', col2: 'Global Grain Corp', col3: 'Durban Terminal -> JHB', col4: 'TRK-308 (Peter V.)', col5: '32,000 kg' },
    ],
    suggestedModules: ['inventory', 'sales', 'finance', 'projects', 'documents'],
  },

  repair_maintenance: {
    key: 'repair_maintenance',
    name: 'Auto Repair & Mechanic Shops',
    icon: '🔧',
    category: 'transport',
    categoryName: 'Logistics, Transport & Automotive',
    description: 'Vehicle work orders, VIN decoding, spare parts inventory, mechanic labor hours, customer estimates and repair warranties.',
    terminology: { contacts: 'Vehicle Owners', deals: 'Repair Estimates', bookings: 'Service Appointments', products: 'Spare Parts & Fluids', orders: 'Work Orders', invoices: 'Repair Invoices', staff: 'Mechanics & Technicians', branches: 'Service Bays' },
    kpis: [
      { label: 'Vehicles in Bay', value: '14 Vehicles', change: 7.2, sub: '6 bays running today', icon: 'Car', color: 'blue' },
      { label: 'Daily Service Revenue', value: '$4,850', change: 16.0, sub: 'Parts + labor billings', icon: 'DollarSign', color: 'green' },
      { label: 'Average Turnaround', value: '4.2 hrs', change: -14.0, sub: 'Same-day completion 85%', icon: 'Clock', color: 'teal' },
      { label: 'Low Stock Parts', value: '5 items', change: 0, sub: 'Brake pads, 5W-30 oil', icon: 'AlertTriangle', color: 'amber' },
    ],
    quickActions: [
      { label: 'New Work Order', action: 'sales', icon: 'ClipboardPlus' },
      { label: 'Lookup Spare Part', action: 'inventory', icon: 'Search' },
      { label: 'Send Customer Quote', action: 'sales', icon: 'Send' },
      { label: 'Print Invoice Receipt', action: 'finance', icon: 'Printer' },
    ],
    operationalTitle: 'Active Garage Work Orders & Service Bays',
    operationalColumns: ['Work Order #', 'Vehicle Make & Model', 'Owner', 'Service Required', 'Mechanic', 'Bay Status'],
    mockRecords: [
      { col1: 'WO-4401', col2: '2021 Toyota RAV4 (VIN 8941)', col3: 'Emily Clark', col4: 'Front Brake Pads & Rotor Resurface', col5: 'Bay 1 (Ready)' },
      { col1: 'WO-4402', col2: '2019 Mercedes E350', col3: 'Gabriel Silva', col4: 'Full A-Service Oil & Filter Flush', col5: 'Bay 3 (In Progress)' },
      { col1: 'WO-4403', col2: '2022 Ford F-150', col3: 'Derrick Vance', col4: 'Transmission Diagnostic & Sensor Replace', col5: 'Bay 2 (Waiting Parts)' },
    ],
    suggestedModules: ['sales', 'inventory', 'booking', 'finance', 'crm'],
  },

  // ── 8. Agriculture & Public Interest ─────────────────────────────────────
  agriculture: {
    key: 'agriculture',
    name: 'Farms & Agribusinesses',
    icon: '🌾',
    category: 'public_interest',
    categoryName: 'Agriculture & Public Interest',
    description: 'Field plots, crop cycles, harvest yields, seed & fertilizer inventory, livestock records, wholesale buyers and equipment maintenance.',
    terminology: { contacts: 'Commodity Buyers', deals: 'Harvest Contracts', bookings: 'Field Operations', products: 'Crops & Farm Produce', orders: 'Produce Sales', invoices: 'Harvest Invoices', staff: 'Farm Managers & Agronomists', branches: 'Farms & Plots' },
    kpis: [
      { label: 'Harvest Projected', value: '420 Tons', change: 14.5, sub: 'Maize & Soybeans yield', icon: 'Wheat', color: 'green' },
      { label: 'Commodity Contracts', value: '$184,000', change: 18.2, sub: 'Pre-sold to grain mills', icon: 'DollarSign', color: 'teal' },
      { label: 'Cultivated Acreage', value: '650 Acres', change: 5.0, sub: 'Across 4 field plots', icon: 'Tractor', color: 'amber' },
      { label: 'Fertilizer Stock', value: '18 Tons', change: -8.0, sub: 'NPK 15-15-15 in depot', icon: 'Boxes', color: 'blue' },
    ],
    quickActions: [
      { label: 'Log Harvest Yield', action: 'inventory', icon: 'PlusCircle' },
      { label: 'Schedule Crop Spraying', action: 'projects', icon: 'Calendar' },
      { label: 'Sell Produce Batch', action: 'sales', icon: 'DollarSign' },
      { label: 'Check Soil Moisture', action: 'documents', icon: 'Droplets' },
    ],
    operationalTitle: 'Plot Planting Cycles & Harvest Timetable',
    operationalColumns: ['Plot ID', 'Crop Variety', 'Planting Date', 'Est. Harvest', 'Projected Yield', 'Health Status'],
    mockRecords: [
      { col1: 'Plot Alpha (180 Ac)', col2: 'Yellow Hybrid Corn', col3: 'Aug 10, 2026', col4: 'Nov 20, 2026', col5: '160 Tons' },
      { col1: 'Plot Beta (220 Ac)', col2: 'Soybeans (High Protein)', col3: 'Aug 18, 2026', col4: 'Dec 05, 2026', col5: '190 Tons' },
      { col1: 'Plot Gamma (150 Ac)', col2: 'Cassava Tubers', col3: 'May 04, 2026', col4: 'Jan 15, 2027', col5: '240 Tons' },
    ],
    suggestedModules: ['inventory', 'sales', 'projects', 'finance', 'documents'],
  },

  ngo: {
    key: 'ngo',
    name: 'NGOs, Charities & Non-Profits',
    icon: '🤝',
    category: 'public_interest',
    categoryName: 'Agriculture & Public Interest',
    description: 'Grant management, donor CRM, humanitarian aid tracking, field projects, volunteer rosters and financial transparency reports.',
    terminology: { contacts: 'Donors & Beneficiaries', deals: 'Grant Applications', bookings: 'Field Missions', products: 'Aid Kits & Relief Supplies', orders: 'Disbursement Grants', invoices: 'Donation Receipts', staff: 'Volunteers & Field Officers', branches: 'Field Offices' },
    kpis: [
      { label: 'Donations Raised', value: '$342,000', change: 24.5, sub: 'Annual appeal to date', icon: 'HeartHandshake', color: 'red' },
      { label: 'Beneficiaries Served', value: '18,400', change: 16.0, sub: 'Clean water & school meals', icon: 'Users', color: 'blue' },
      { label: 'Active Field Projects', value: '12 Projects', change: 2.0, sub: 'In 5 target regions', icon: 'Globe', color: 'teal' },
      { label: 'Grant Compliance', value: '100%', change: 0, sub: 'All audited clean', icon: 'ShieldCheck', color: 'green' },
    ],
    quickActions: [
      { label: 'Record Donation', action: 'finance', icon: 'Gift' },
      { label: 'New Field Project', action: 'projects', icon: 'PlusCircle' },
      { label: 'Send Donor Newsletter', action: 'communication', icon: 'Mail' },
      { label: 'Publish Impact Report', action: 'documents', icon: 'FileSpreadsheet' },
    ],
    operationalTitle: 'Active Aid Initiatives & Field Operations',
    operationalColumns: ['Project Initiative', 'Target Region', 'Lead Officer', 'Beneficiary Goal', 'Funds Utilized', 'Status'],
    mockRecords: [
      { col1: 'Borehole Clean Water Initiative', col2: 'Northern District', col3: 'Amina Yusuf', col4: '6,000 Residents', col5: '78% ($42k / $54k)' },
      { col1: 'Primary School Nutrition Program', col2: 'Riverside Community', col3: 'David O\'Connor', col4: '4,200 Children', col5: '92% ($68k / $74k)' },
      { col1: 'Vocational Youth Tech Hub', col2: 'Urban Metro Center', col3: 'Sarah Jenkins', col4: '800 Apprentices', col5: '55% ($38k / $70k)' },
    ],
    suggestedModules: ['crm', 'projects', 'finance', 'documents', 'portals', 'communication'],
  },

  // ── 9. Universal / Other Fallback ─────────────────────────────────────────
  general: {
    key: 'general',
    name: 'General Business & Custom Enterprise',
    icon: '⚡',
    category: 'professional',
    categoryName: 'Universal Business OS',
    description: 'The balanced Universal Business Operating System suitable for any bespoke commercial workflow, service or trade.',
    terminology: { contacts: 'Contacts & Clients', deals: 'Opportunities', bookings: 'Appointments', products: 'Products & Services', orders: 'Orders & Sales', invoices: 'Invoices', staff: 'Team Members', branches: 'Locations' },
    kpis: [
      { label: 'Gross Revenue', value: '$48,250', change: 14.8, sub: 'Across all operations', icon: 'DollarSign', color: 'green' },
      { label: 'Active Clients', value: '184', change: 8.5, sub: 'Repeat & new customers', icon: 'Users', color: 'blue' },
      { label: 'Operational Orders', value: '246', change: 11.2, sub: 'Completed this period', icon: 'Package', color: 'violet' },
      { label: 'Cash Flow Surplus', value: '$18,900', change: 6.0, sub: 'Revenues minus expenses', icon: 'TrendingUp', color: 'teal' },
    ],
    quickActions: [
      { label: 'New Contact', action: 'contacts', icon: 'UserPlus' },
      { label: 'Create Invoice', action: 'finance', icon: 'Receipt' },
      { label: 'Add Product / Service', action: 'inventory', icon: 'Plus' },
      { label: 'Add Custom Feature', action: 'marketplace', icon: 'Store' },
    ],
    operationalTitle: 'Recent Commercial Transactions & Deliverables',
    operationalColumns: ['Reference', 'Entity / Client', 'Category', 'Date', 'Amount', 'Status'],
    mockRecords: [
      { col1: 'TX-9012', col2: 'Apex Innovations Ltd', col3: 'B2B Service Contract', col4: 'Today', col5: '$4,500.00' },
      { col1: 'TX-9013', col2: 'Horizon Logistics Corp', col3: 'Commercial Order', col4: 'Yesterday', col5: '$1,850.00' },
      { col1: 'TX-9014', col2: 'Dr. Kimberly Vance', col3: 'Consulting Retainer', col4: 'Oct 20', col5: '$3,200.00' },
    ],
    suggestedModules: ['dashboard', 'analytics', 'communication', 'roles', 'crm', 'sales', 'finance', 'inventory', 'accounting', 'projects'],
  },
};

/**
 * Returns a niche definition or a tailored fallback for custom niches.
 */
export function getNicheDefinition(key?: string | null, customNicheName?: string): NicheDefinition {
  if (!key) return NICHES_DATA.general;
  const match = NICHES_DATA[key];
  if (match) return match;

  // Custom niche fallback
  const label = customNicheName || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    ...NICHES_DATA.general,
    key,
    name: label,
    icon: '🏢',
    categoryName: 'Custom Business Niche',
    description: `Tailored Business Operating System configured specifically for ${label}.`,
    terminology: {
      contacts: `${label} Clients`,
      deals: `${label} Deals`,
      bookings: `${label} Sessions`,
      products: `${label} Offerings`,
      orders: `${label} Orders`,
      invoices: `${label} Invoices`,
      staff: `${label} Staff`,
      branches: `${label} Branches`,
    },
  };
}
