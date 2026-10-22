export interface WebsiteTemplate {
  id: string;
  name: string;
  nicheKey: string;
  category: string;
  categoryName: string;
  style: 'modern' | 'minimal' | 'bold' | 'classic' | 'luxury';
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    heroGradient: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaPrimary: { label: string; action: string };
    ctaSecondary: { label: string; action: string };
    image: string;
    stats: Array<{ label: string; value: string }>;
  };
  sections: Array<{
    type: 'features' | 'services' | 'products' | 'booking' | 'team' | 'testimonials' | 'faq' | 'careers' | 'contact';
    title: string;
    subtitle: string;
    items?: any[];
  }>;
}

// Helper to generate template items cleanly
function createTemplate(t: WebsiteTemplate): WebsiteTemplate {
  return t;
}

// ── 100+ Rich Website & Landing Page Templates ──────────────────────────────
export const TEMPLATES_DATA: WebsiteTemplate[] = [
  // ── Hotels & Hospitality (1-10) ──
  createTemplate({
    id: 'hotel-grand-azure',
    name: 'Grand Azure Luxury Resort',
    nicheKey: 'hotel',
    category: 'hospitality',
    categoryName: 'Hotels & Resorts',
    style: 'luxury',
    description: 'Breathtaking 5-star oceanfront hotel template with online room booking, dining menu, and spa reservations.',
    theme: { primaryColor: '#0f172a', secondaryColor: '#d97706', accentColor: '#38bdf8', fontFamily: 'serif', heroGradient: 'from-slate-950 via-slate-900 to-indigo-950' },
    hero: {
      badge: '★ ★ ★ ★ ★ World Luxury Hotel Award Winner',
      title: 'Unrivaled Luxury on the Azure Coast',
      subtitle: 'Experience world-class hospitality, oceanfront private villas, and Michelin-starred culinary journeys tailored just for you.',
      ctaPrimary: { label: 'Book a Suite', action: '#booking' },
      ctaSecondary: { label: 'Explore Rooms', action: '#services' },
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Private Suites', value: '140+' }, { label: 'Guest Rating', value: '4.9 / 5' }, { label: 'Direct Beachfront', value: '1.2 km' }],
    },
    sections: [
      {
        type: 'features', title: 'Curated Hotel Amenities', subtitle: 'Indulge in experiences designed to rejuvenate your senses.',
        items: [
          { title: 'Infinity Ocean Pool', desc: 'Temperature controlled ocean-facing pool with VIP cabanas and private cocktail service.' },
          { title: 'Holistic Spa & Wellness', desc: 'Overwater treatment pavilions utilizing organic sea mineral therapies and private steam suites.' },
          { title: 'Fine Dining Atrium', desc: 'Chef-curated Mediterranean seasonal menu paired with a 2,000-bottle cellar.' },
          { title: '24/7 Butler Service', desc: 'Dedicated personal butler attending to every travel, luggage, and dining reservation.' },
        ],
      },
      {
        type: 'services', title: 'Signature Accommodations', subtitle: 'Each room is a private sanctuary of natural stone, teak wood, and sea breeze.',
        items: [
          { name: 'Oceanview Royal Suite', price: '$450 / night', desc: 'Panoramic ocean balcony, marble bath, king feather bed, complimentary champagne.' },
          { name: 'Overwater Sunset Villa', price: '$820 / night', desc: 'Private glass floor over the reef, outdoor rain shower, plunge pool.' },
          { name: 'Garden Deluxe Room', price: '$290 / night', desc: 'Lush tropical private garden terrace, espresso bar, king bed.' },
        ],
      },
      {
        type: 'booking', title: 'Reserve Your Sanctuary', subtitle: 'Instant confirmation with best rate guarantee and flexible cancellation.',
      },
      {
        type: 'testimonials', title: 'What Our Guests Cherish', subtitle: 'Stories from memorable stays.',
        items: [
          { quote: 'From the moment our private chauffeur arrived to the final sunset dinner, it was pure perfection.', author: 'Lord & Lady Harrington, London' },
          { quote: 'The attention to detail in the spa and room service was extraordinary. We return every year.', author: 'Dr. Elena Rostova, Zurich' },
        ],
      },
      {
        type: 'careers', title: 'Careers in Hospitality', subtitle: 'Join our award-winning team of culinary masters and concierge professionals.',
        items: [
          { title: 'Head Sommelier', dept: 'Food & Beverage', location: 'On-site', type: 'Full-time' },
          { title: 'Guest Experience Executive', dept: 'Front of House', location: 'On-site', type: 'Full-time' },
        ],
      },
      { type: 'contact', title: 'Connect with Concierge', subtitle: 'Private transfers, wedding inquiries, and special requests.' },
    ],
  }),

  createTemplate({
    id: 'hotel-urban-boutique',
    name: 'The Artisan Urban Stay',
    nicheKey: 'hotel',
    category: 'hospitality',
    categoryName: 'Hotels & Resorts',
    style: 'modern',
    description: 'Chic downtown lifestyle hotel featuring rooftop cocktail bar, coworking lounge, and minimalist loft rooms.',
    theme: { primaryColor: '#18181b', secondaryColor: '#e11d48', accentColor: '#f43f5e', fontFamily: 'sans', heroGradient: 'from-zinc-950 via-neutral-900 to-rose-950' },
    hero: {
      badge: 'Boutique Downtown Loft Living',
      title: 'Where City Energy Meets Architectural Serenity',
      subtitle: 'A design-led sanctuary in the heart of the arts district. Crafted for creators, founders, and travelers who value culture.',
      ctaPrimary: { label: 'Check Availability', action: '#booking' },
      ctaSecondary: { label: 'View Lofts', action: '#services' },
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Design Lofts', value: '48' }, { label: 'Rooftop Bar', value: 'Level 14' }, { label: 'Walkscore', value: '99 / 100' }],
    },
    sections: [
      {
        type: 'features', title: 'Tailored for the Modern Nomad', subtitle: 'Smart technology and artistic warmth.',
        items: [
          { title: 'Keyless Mobile Entry', desc: 'Unlock your room, control lighting, and adjust climate from your phone.' },
          { title: 'High-Speed Fiber & Desks', desc: 'Ergonomic Herman Miller chairs and dedicated 1Gbps fiber in every room.' },
          { title: 'Rooftop Vinyl Lounge', desc: 'Craft mezcal cocktails with rotating local DJs and panoramic skyline views.' },
        ],
      },
      {
        type: 'services', title: 'Boutique Room Selection', subtitle: 'Designed with custom oak, exposed brick, and luxury bedding.',
        items: [
          { name: 'Skyline Studio Loft', price: '$220 / night', desc: '14-foot ceilings, floor-to-ceiling windows, king bed, record player.' },
          { name: 'Corner Terrace Suite', price: '$360 / night', desc: 'Private 200 sq ft patio with outdoor fire pit, soaking tub.' },
        ],
      },
      { type: 'booking', title: 'Book Your Urban Escape', subtitle: 'Direct bookings include complimentary morning espresso and late checkout.' },
      { type: 'contact', title: 'Locate Us', subtitle: 'Arts & Cultural District.' },
    ],
  }),

  // ── Schools & Education (11-20) ──
  createTemplate({
    id: 'school-future-academy',
    name: 'Apex Horizon STEM Academy',
    nicheKey: 'school',
    category: 'education',
    categoryName: 'Education & Training',
    style: 'modern',
    description: 'Premier K-12 preparatory academy featuring robotics labs, bilingual curriculum, and automated parent enrollment.',
    theme: { primaryColor: '#1e3a8a', secondaryColor: '#2563eb', accentColor: '#10b981', fontFamily: 'sans', heroGradient: 'from-blue-950 via-slate-900 to-indigo-950' },
    hero: {
      badge: 'Now Enrolling for Academic Year 2026/2027',
      title: 'Empowering Young Minds to Shape Tomorrow',
      subtitle: 'A future-focused education blending rigorous academic excellence, creative arts, and cutting-edge robotics & AI literacy.',
      ctaPrimary: { label: 'Apply for Admission', action: '#careers' },
      ctaSecondary: { label: 'Book Campus Tour', action: '#booking' },
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Ivy & Top Uni Acceptance', value: '98%' }, { label: 'Student-Teacher Ratio', value: '11 : 1' }, { label: 'Co-curricular Clubs', value: '45+' }],
    },
    sections: [
      {
        type: 'features', title: 'Why Apex Horizon Excels', subtitle: 'A holistic framework cultivating character, critical inquiry, and global leadership.',
        items: [
          { title: 'Global STEM Curriculum', desc: 'Integrated coding, biotechnology, and renewable energy labs from elementary grades.' },
          { title: 'Olympic Athletics & Pool', desc: 'State-of-the-art sports complex, FIFA-standard pitch, and certified coaches.' },
          { title: 'Parent Portal & Tracking', desc: 'Live homework tracking, attendance alerts, and direct teacher communication.' },
        ],
      },
      {
        type: 'services', title: 'Academic Divisions', subtitle: 'From early childhood exploration through university preparation.',
        items: [
          { name: 'Early Learning Center (Ages 3-5)', price: 'Tuition: $3,200 / term', desc: 'Montessori-inspired inquiry with bilingual immersion.' },
          { name: 'Middle Preparatory (Grades 6-8)', price: 'Tuition: $4,500 / term', desc: 'Core STEM, languages, arts, and leadership projects.' },
          { name: 'Senior High & AP Honors (Grades 9-12)', price: 'Tuition: $5,800 / term', desc: 'Advanced Placement, college counseling, and dual credit.' },
        ],
      },
      { type: 'booking', title: 'Book an In-Person Campus Tour', subtitle: 'Meet our head of admissions and explore our high-tech classrooms.' },
      {
        type: 'careers', title: 'Online Admissions & Faculty Vacancies', subtitle: 'Begin your student application or join our teaching faculty.',
        items: [
          { title: 'Student Admission Application (Fall 2026)', dept: 'Admissions Office', location: 'Main Campus', type: 'Enrolment' },
          { title: 'Senior Physics & Robotics Teacher', dept: 'Science Faculty', location: 'Main Campus', type: 'Full-time' },
        ],
      },
      { type: 'contact', title: 'Contact Admissions Office', subtitle: 'We are here to guide you through the enrollment journey.' },
    ],
  }),

  // ── Universities (21-25) ──
  createTemplate({
    id: 'university-summit-college',
    name: 'Summit Metropolitan University',
    nicheKey: 'university',
    category: 'education',
    categoryName: 'Education & Training',
    style: 'classic',
    description: 'Comprehensive collegiate institution with undergraduate faculties, graduate research, online portal, and campus life.',
    theme: { primaryColor: '#831843', secondaryColor: '#be185d', accentColor: '#f59e0b', fontFamily: 'serif', heroGradient: 'from-pink-950 via-slate-900 to-rose-950' },
    hero: {
      badge: 'Chartered University · Ranked Top 50 Globally',
      title: 'Knowledge That Transforms Society',
      subtitle: 'Join over 15,000 scholars across 8 faculties committed to scientific discovery, ethical leadership, and creative innovation.',
      ctaPrimary: { label: 'Apply for Fall 2026', action: '#careers' },
      ctaSecondary: { label: 'Explore Faculties', action: '#services' },
      image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Faculties & Schools', value: '8' }, { label: 'Research Grants', value: '$84M' }, { label: 'International Scholars', value: '42%' }],
    },
    sections: [
      {
        type: 'services', title: 'Undergraduate & Graduate Faculties', subtitle: 'Degree programs recognized by professional accreditation councils worldwide.',
        items: [
          { name: 'Faculty of Computer Science & AI', price: '4 Years · B.Sc.', desc: 'Software engineering, machine intelligence, cyber defense, and cloud computing.' },
          { name: 'School of Medicine & Health Sciences', price: '5 Years · MBChB', desc: 'Clinical rotations, pathology, surgery, and biomedical research.' },
          { name: 'Graduate Business School', price: '18 Months · MBA', desc: 'Global finance, venture development, strategic leadership, and data analytics.' },
        ],
      },
      { type: 'careers', title: 'Academic Admissions & Open Chairs', subtitle: 'Submit student admissions or apply for postdoctoral fellowships.' },
      { type: 'contact', title: 'Office of the Registrar', subtitle: 'Transcripts, fees, and campus housing.' },
    ],
  }),

  // ── Hospitals & Healthcare (26-35) ──
  createTemplate({
    id: 'hospital-careplus-medical',
    name: 'CarePlus Multi-Specialty Hospital',
    nicheKey: 'hospital',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    style: 'modern',
    description: 'Accredited multi-specialty hospital featuring 24/7 emergency response, doctor appointment booking, and diagnostic lab.',
    theme: { primaryColor: '#0c4a6e', secondaryColor: '#0284c7', accentColor: '#10b981', fontFamily: 'sans', heroGradient: 'from-sky-950 via-slate-900 to-teal-950' },
    hero: {
      badge: 'JCI Accredited · 24/7 Emergency Care Ready',
      title: 'Compassionate Care, Advanced Medical Science',
      subtitle: 'Board-certified surgeons, cardiologists, and pediatric specialists delivering world-class medical treatment with patient-first warmth.',
      ctaPrimary: { label: 'Book Doctor Consultation', action: '#booking' },
      ctaSecondary: { label: 'Emergency: (800) 412-9999', action: '#contact' },
      image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Specialist Physicians', value: '180+' }, { label: 'Emergency Response', value: '< 8 min' }, { label: 'ICU & Private Beds', value: '320' }],
    },
    sections: [
      {
        type: 'features', title: 'Centers of Medical Excellence', subtitle: 'Modern diagnostics, robotic surgery, and dedicated outpatient wings.',
        items: [
          { title: 'Heart & Vascular Institute', desc: 'Cath lab, cardiac MRI, non-invasive cardiology, and open heart surgical unit.' },
          { title: 'Comprehensive Oncology', desc: 'Infusion therapies, immunotherapy, radiation oncology, and supportive care.' },
          { title: 'Maternity & Neonatal ICU', desc: 'Private delivery suites, level III NICU, and gentle birth specialists.' },
          { title: 'Digital Diagnostic Labs', desc: 'Same-day blood panel results, 128-slice CT scan, 3T MRI, and digital ultrasound.' },
        ],
      },
      {
        type: 'services', title: 'Featured Clinical Services', subtitle: 'Easily book appointments with lead consultants.',
        items: [
          { name: 'Comprehensive Health Screening', price: '$250', desc: 'Full blood profile, ECG, liver & kidney screening, chest scan, physician debrief.' },
          { name: 'Specialist Consultation', price: '$90', desc: '45-minute private evaluation with a senior department consultant.' },
          { name: 'Pediatric Well-Child Checkup', price: '$65', desc: 'Vaccine updates, developmental milestone review, vision & hearing check.' },
        ],
      },
      { type: 'booking', title: 'Book a Specialist Consultation', subtitle: 'Select medical department, preferred specialist, and appointment date.' },
      {
        type: 'careers', title: 'Medical Vacancies & Fellowships', subtitle: 'Join our healthcare team.',
        items: [
          { title: 'Staff Nurse (ICU & Critical Care)', dept: 'Nursing', location: 'Main Hospital', type: 'Full-time' },
          { title: 'Radiology Technician', dept: 'Diagnostics', location: 'Main Hospital', type: 'Full-time' },
        ],
      },
      { type: 'contact', title: 'Hospital Contact & Directions', subtitle: 'Main entrance, emergency ambulance bay, and pharmacy.' },
    ],
  }),

  // ── Barbershops, Salons & Grooming (36-45) ──
  createTemplate({
    id: 'barber-gentlemens-club',
    name: 'The Crown & Razor Barbershop',
    nicheKey: 'beauty_salon',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    style: 'bold',
    description: 'Heritage grooming lounge offering signature skin fades, hot towel straight-razor shaves, beard sculpting, and online chair booking.',
    theme: { primaryColor: '#1c1917', secondaryColor: '#d97706', accentColor: '#78716c', fontFamily: 'serif', heroGradient: 'from-stone-950 via-zinc-900 to-amber-950' },
    hero: {
      badge: 'Master Barbering & Traditional Shaving Lounge',
      title: 'Precision Craftsmanship. Timeless Grooming.',
      subtitle: 'Step into leather armchairs, single-malt whiskey on the house, and master barbers who understand precision, style, and hospitality.',
      ctaPrimary: { label: 'Book Your Cut', action: '#booking' },
      ctaSecondary: { label: 'View Services & Products', action: '#products' },
      image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Master Barbers', value: '8' }, { label: 'Client Reviews', value: '4.9 ★ (1,400+)' }, { label: 'Years of Heritage', value: '14' }],
    },
    sections: [
      {
        type: 'services', title: 'Barbershop Services Menu', subtitle: 'Every haircut includes complimentary hot towel finish and styling.',
        items: [
          { name: 'Signature Haircut & Beard Sculpt', price: '$55', desc: 'Custom precision fade or scissor work with organic beard oil massage.' },
          { name: 'Traditional Straight Razor Shave', price: '$45', desc: 'Pre-shave essential oils, 3 hot eucalyptus towels, soothing balm.' },
          { name: 'The VIP Royal Treatment', price: '$95', desc: 'Cut, beard sculpt, hot towel shave, facial charcoal mask, head massage.' },
        ],
      },
      {
        type: 'products', title: 'Grooming Products Shop', subtitle: 'Crafted with natural cedarwood, shea butter, and Moroccan argan oil.',
        items: [
          { name: 'Crown Matte Clay Pomade', price: '$24.00', desc: 'High hold, matte finish, washes out effortlessly with water.' },
          { name: 'Wild Cedar Beard Elixir (50ml)', price: '$28.00', desc: 'Nourishes dry skin beneath beard, eliminates itch, subtle woodsmoke scent.' },
          { name: 'Sandalwood Aftershave Tonic', price: '$32.00', desc: 'Closes pores and prevents razor burn with witch hazel and aloe.' },
        ],
      },
      { type: 'booking', title: 'Book Your Barber Chair', subtitle: 'Select your preferred barber and convenient time slot.' },
      { type: 'contact', title: 'Visit Our Lounge', subtitle: 'Walk-ins always welcome subject to availability.' },
    ],
  }),

  // ── Airports & Aviation (46-50) ──
  createTemplate({
    id: 'airport-skyhub-intl',
    name: 'AeroGate Ground & Aviation Services',
    nicheKey: 'airport',
    category: 'hospitality',
    categoryName: 'Hospitality, Travel & Events',
    description: 'Aviation terminal operations, private jet FBO handling, flight schedule updates, VIP lounge access, and tarmac service.',
    theme: { primaryColor: '#090d16', secondaryColor: '#3b82f6', accentColor: '#38bdf8', fontFamily: 'sans', heroGradient: 'from-slate-950 via-blue-950 to-slate-900' },
    style: 'modern',
    hero: {
      badge: 'Premier Aviation Ground Handling & FBO Terminal',
      title: 'Seamless Global Aviation Operations',
      subtitle: 'Complete ground handling, VIP executive lounge, Jet A-1 fueling, ramp services, and passenger logistics operating 24/7/365.',
      ctaPrimary: { label: 'Request FBO Handling', action: '#booking' },
      ctaSecondary: { label: 'Live Gate Status', action: '#services' },
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Aircraft Handled / Month', value: '4,200+' }, { label: 'Tarmac Turnaround SLA', value: '< 35 min' }, { label: 'ICAO / EASA Certified', value: 'Tier 1' }],
    },
    sections: [
      {
        type: 'features', title: 'Aviation Infrastructure & Operations', subtitle: 'Meeting the rigorous demands of commercial airlines and private charters.',
        items: [
          { title: 'Comprehensive Ramp & Tarmac Ops', desc: 'Pushback tugs, ground power units (GPU), baggage sorting, and potable water.' },
          { title: 'Executive FBO Lounge', desc: 'Private customs clearance, crew rest suites, conference rooms, and gourmet catering.' },
          { title: 'Into-Plane Fueling', desc: 'Hydrant and refueler fleet supplying verified Jet A-1 and Avgas with zero delay.' },
        ],
      },
      {
        type: 'services', title: 'Commercial & Executive Services', subtitle: 'Transparent ground support contracts.',
        items: [
          { name: 'Executive Jet FBO Turnaround', price: 'From $1,200', desc: 'Full ramp parking, passenger escort, customs, catering and GPU connection.' },
          { name: 'VIP Passenger Terminal Fast-Track', price: '$120 / pax', desc: 'Dedicated security lane, lounge access, private tarmac buggy transfer.' },
        ],
      },
      { type: 'booking', title: 'Request FBO & Ground Handling Slot', subtitle: 'Submit tail number, arrival schedule, and fuel requirements.' },
      { type: 'careers', title: 'Aviation Crew Openings', subtitle: 'Flight line technicians, dispatchers, and passenger agents.' },
      { type: 'contact', title: '24/7 Flight Operations Desk', subtitle: 'Direct dispatch phone and ARINC frequency.' },
    ],
  }),

  // ── Restaurants & Dining (51-60) ──
  createTemplate({
    id: 'restaurant-bistro-gourmet',
    name: 'Le Bistro Botanique',
    nicheKey: 'restaurant',
    category: 'hospitality',
    categoryName: 'Hospitality, Travel & Events',
    style: 'luxury',
    description: 'Farm-to-table gourmet bistro with digital table reservation, online takeaway ordering, and seasonal wine pairings.',
    theme: { primaryColor: '#14532d', secondaryColor: '#ca8a04', accentColor: '#86efac', fontFamily: 'serif', heroGradient: 'from-emerald-950 via-slate-900 to-amber-950' },
    hero: {
      badge: 'Farm-to-Table Seasonal Dining',
      title: 'Flavors Rooted in Organic Earth',
      subtitle: 'Hand-picked heirloom vegetables, dry-aged heritage beef, and biodynamic natural wines in an intimate candlelit courtyard.',
      ctaPrimary: { label: 'Reserve a Table', action: '#booking' },
      ctaSecondary: { label: 'View Dinner Menu', action: '#services' },
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Local Organic Farms', value: '18+' }, { label: 'Wine Cellar Labels', value: '450+' }, { label: 'Michelin Guide', value: 'Selected' }],
    },
    sections: [
      {
        type: 'services', title: 'Autumn Tasting Menu', subtitle: 'Prepared with ingredients harvested within 40 miles of our kitchen.',
        items: [
          { name: 'Wild Forest Truffle Risotto', price: '$36.00', desc: 'Carnaroli rice, shaved black winter truffle, 36-month aged Parmigiano Reggiano.' },
          { name: 'Pan-Roasted Atlantic Halibut', price: '$44.00', desc: 'Baby fennel confit, saffron velouté, crispy capers, sea herbs.' },
          { name: 'Grass-Fed Ribeye (12oz)', price: '$58.00', desc: 'Dry-aged 45 days, bone marrow butter, roasted heritage carrots, thyme jus.' },
        ],
      },
      { type: 'booking', title: 'Reserve Your Evening Table', subtitle: 'Indicate seating preference (Courtyard, Main Dining Room, or Chef Counter).' },
      { type: 'contact', title: 'Location & Private Events', subtitle: 'Weddings, corporate dinners, and intimate celebrations.' },
    ],
  }),

  // ── Freelancers & Consultancies (61-70) ──
  createTemplate({
    id: 'freelance-pro-portfolio',
    name: 'Vanguard Strategy & Product Design',
    nicheKey: 'professional_services',
    category: 'professional',
    categoryName: 'Professional & Creative Services',
    style: 'minimal',
    description: 'Sleek personal portfolio for senior product designers, founders, and fractional executives with client scheduler and proposal intake.',
    theme: { primaryColor: '#09090b', secondaryColor: '#6366f1', accentColor: '#a855f7', fontFamily: 'sans', heroGradient: 'from-zinc-950 via-slate-900 to-indigo-950' },
    hero: {
      badge: 'Fractional Product & Design Executive',
      title: 'Designing High-Conversion Products for Ambitious Startups',
      subtitle: 'I help VC-backed SaaS founders turn complex technology into intuitive, revenue-generating software that users love.',
      ctaPrimary: { label: 'Book Discovery Call', action: '#booking' },
      ctaSecondary: { label: 'View Case Studies', action: '#services' },
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Client Capital Raised', value: '$120M+' }, { label: 'Years Experience', value: '10+' }, { label: 'Product Launches', value: '42' }],
    },
    sections: [
      {
        type: 'features', title: 'How We Work Together', subtitle: 'Direct collaboration without agency overhead or unnecessary meetings.',
        items: [
          { title: 'Sprint-Based Delivery', desc: 'Two-week high-impact design and testing sprints with daily Slack syncs.' },
          { title: 'Interactive Prototypes', desc: 'Production-ready Figma component systems and interactive framer prototypes.' },
          { title: 'Conversion Architecture', desc: 'Obsessively engineered checkout funnels, onboarding flows, and user retention loops.' },
        ],
      },
      {
        type: 'services', title: 'Engagement Retainers', subtitle: 'Predictable monthly investment, cancel or pause anytime.',
        items: [
          { name: 'Design Sprint (2 Weeks)', price: '$5,000', desc: 'Complete revamp of core user onboarding flow, user testing, and clickable prototype.' },
          { name: 'Monthly Fractional Head of Product', price: '$8,500 / mo', desc: 'Full product leadership, user research, roadmap design, and engineering handoff.' },
        ],
      },
      { type: 'booking', title: 'Schedule a 30-Minute Intro Call', subtitle: 'Let\'s explore your current product bottlenecks and growth goals.' },
      { type: 'contact', title: 'Drop a Message', subtitle: 'Direct email response within 12 hours.' },
    ],
  }),

  // ── Law Firms & Legal (71-75) ──
  createTemplate({
    id: 'law-justice-partners',
    name: 'Blackwood, Sterling & Partners Legal',
    nicheKey: 'law_firm',
    category: 'professional',
    categoryName: 'Professional & Creative Services',
    style: 'classic',
    description: 'Distinguished legal practice template covering corporate M&A, intellectual property, litigation, and online case evaluation.',
    theme: { primaryColor: '#1e1b4b', secondaryColor: '#b45309', accentColor: '#e0e7ff', fontFamily: 'serif', heroGradient: 'from-indigo-950 via-slate-900 to-stone-950' },
    hero: {
      badge: 'Chambers Global Ranked · 35 Years of Integrity',
      title: 'Decisive Legal Counsel When Everything is on the Line',
      subtitle: 'Representing multinational corporations, private funds, and visionary founders with fearless advocacy and meticulous precision.',
      ctaPrimary: { label: 'Request Case Evaluation', action: '#contact' },
      ctaSecondary: { label: 'Practice Areas', action: '#services' },
      image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Total Deal Value Closed', value: '$4.2B+' }, { label: 'Senior Litigators', value: '28' }, { label: 'Court Win Ratio', value: '94%' }],
    },
    sections: [
      {
        type: 'services', title: 'Core Practice Areas', subtitle: 'Deep subject matter expertise across commercial and regulatory domains.',
        items: [
          { name: 'Corporate Mergers & Acquisitions', price: 'Advisory Retainer', desc: 'Cross-border transactions, joint ventures, regulatory antitrust clearance.' },
          { name: 'Commercial Litigation & Arbitration', price: 'Trial Counsel', desc: 'High-stakes shareholder disputes, breach of contract, international tribunal hearings.' },
          { name: 'Intellectual Property Defense', price: 'Patent & Trademark', desc: 'Patent prosecution, trade secret enforcement, licensing contracts.' },
        ],
      },
      { type: 'contact', title: 'Confidential Consultation Request', subtitle: 'Protected by attorney-client privilege.' },
    ],
  }),

  // ── Real Estate & Properties (76-85) ──
  createTemplate({
    id: 'realestate-prime-dwellings',
    name: 'Prestige Global Realty',
    nicheKey: 'real_estate',
    category: 'construction',
    categoryName: 'Construction, Real Estate & Manufacturing',
    style: 'luxury',
    description: 'High-end luxury real estate brokerage showcase with property listings, filter by price, 3D tour requests, and realtor contacts.',
    theme: { primaryColor: '#0a0a0a', secondaryColor: '#d4af37', accentColor: '#ffffff', fontFamily: 'serif', heroGradient: 'from-zinc-950 via-slate-950 to-amber-950' },
    hero: {
      badge: 'Curated Luxury Residences & Waterfront Estates',
      title: 'Extraordinary Homes for Extraordinary Lives',
      subtitle: 'Exclusive access to premier private estates, architectural penthouses, and prime commercial assets in prime global cities.',
      ctaPrimary: { label: 'Explore Portfolio', action: '#products' },
      ctaSecondary: { label: 'Schedule Private Viewing', action: '#booking' },
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Listed Property Value', value: '$180M+' }, { label: 'Average Days to Sold', value: '24' }, { label: 'Global Offices', value: '6' }],
    },
    sections: [
      {
        type: 'products', title: 'Featured Exclusive Properties', subtitle: 'Hand-selected residences available for private acquisition.',
        items: [
          { name: 'The Bel-Air Glass Villa', price: '$8,450,000', desc: '6 Beds · 8 Baths · 9,200 sq ft · Infinity pool overlooking city skyline.' },
          { name: 'Waterfront Marina Penthouse', price: '$4,200,000', desc: '4 Beds · 4.5 Baths · Private yacht berth · 360-degree terrace.' },
          { name: 'Mayfair Historic Townhouse', price: '£6,800,000', desc: '5 Beds · Private elevator · Courtyard mews · Wine cellar.' },
        ],
      },
      { type: 'booking', title: 'Schedule a Private Property Showing', subtitle: 'Our senior broker will arrange confidential access.' },
      { type: 'contact', title: 'List Your Property With Us', subtitle: 'Reach verified high-net-worth buyers internationally.' },
    ],
  }),

  // ── Gym & Fitness (86-90) ──
  createTemplate({
    id: 'fitness-iron-forge',
    name: 'IronForge Performance Club',
    nicheKey: 'fitness_wellness',
    category: 'health',
    categoryName: 'Healthcare & Personal Wellness',
    style: 'bold',
    description: 'High-intensity fitness center, Olympic lifting, functional athletic conditioning, class booking, and supplement store.',
    theme: { primaryColor: '#09090b', secondaryColor: '#ea580c', accentColor: '#f97316', fontFamily: 'sans', heroGradient: 'from-stone-950 via-zinc-900 to-orange-950' },
    hero: {
      badge: 'Elite Strength & Conditioning Facility',
      title: 'Build Resilient Strength. Shatter Your Limits.',
      subtitle: 'State-of-the-art Eleiko equipment, ice baths, infrared saunas, and world-class athletic coaching built for serious athletes.',
      ctaPrimary: { label: 'Claim 3-Day Free Pass', action: '#booking' },
      ctaSecondary: { label: 'Class Timetable', action: '#services' },
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Eleiko Power Racks', value: '18' }, { label: 'Weekly Coaching Classes', value: '40+' }, { label: 'Recovery Saunas & Cold Plunges', value: '4' }],
    },
    sections: [
      {
        type: 'services', title: 'Membership & Coaching Tiers', subtitle: 'No locked contracts. Transparent monthly access.',
        items: [
          { name: 'Club All-Access Membership', price: '$89 / mo', desc: '24/7 gym access, unlimited cold plunge, sauna, and app workout tracking.' },
          { name: 'Performance Athlete Tier', price: '$180 / mo', desc: 'Includes all-access plus unlimited group conditioning and lifting clinics.' },
          { name: '1-on-1 Master Coaching', price: '$75 / session', desc: 'Individual program design, biometrics review, and Olympic barbell technique.' },
        ],
      },
      { type: 'booking', title: 'Reserve a Free Trial Workout', subtitle: 'Step on our gym floor and experience the difference.' },
      { type: 'contact', title: 'Location & Hours', subtitle: 'Open 24/7 for members with digital access pass.' },
    ],
  }),

  // ── Logistics & Courier (91-95) ──
  createTemplate({
    id: 'logistics-swift-freight',
    name: 'SwiftCorridor Logistics & Fleet',
    nicheKey: 'logistics',
    category: 'transport',
    categoryName: 'Logistics, Transport & Automotive',
    style: 'modern',
    description: 'Nationwide freight forwarding, refrigerated cold chain, warehouse bay leasing, and instant waybill tracking.',
    theme: { primaryColor: '#082f49', secondaryColor: '#0284c7', accentColor: '#38bdf8', fontFamily: 'sans', heroGradient: 'from-sky-950 via-slate-900 to-slate-950' },
    hero: {
      badge: 'Cross-Border Freight & Cold Chain Network',
      title: 'Moving Commerce with Unstoppable Precision',
      subtitle: 'Full truckload (FTL), less-than-truckload (LTL), bonded warehousing, and live GPS freight telemetry across major trade corridors.',
      ctaPrimary: { label: 'Request Freight Quote', action: '#contact' },
      ctaSecondary: { label: 'Track Waybill', action: '#services' },
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Active Fleet Trucks', value: '250+' }, { label: 'On-Time Delivery Rate', value: '98.4%' }, { label: 'Warehouse Capacity', value: '50,000 sqm' }],
    },
    sections: [
      {
        type: 'features', title: 'Freight Capabilities', subtitle: 'Built for industrial manufacturers and retail distributors.',
        items: [
          { title: 'Refrigerated Pharma & Food', desc: 'Dual-temp reefers with continuous temperature loggers compliant with international standards.' },
          { title: 'Bonded Dry Warehousing', desc: 'High-bay racking, 24/7 CCTV surveillance, automated pallet tracking, and dock levelers.' },
          { title: 'Last-Mile Express Distribution', desc: 'Same-day metro dispatch for commercial stores and e-commerce distribution.' },
        ],
      },
      { type: 'contact', title: 'Instant Cargo Quote Request', subtitle: 'Specify weight, origin, destination, and handling requirements.' },
    ],
  }),

  // ── E-Commerce Direct (96-105) ──
  createTemplate({
    id: 'ecommerce-modern-store',
    name: 'Aura Lifestyle & Home Goods',
    nicheKey: 'ecommerce',
    category: 'retail',
    categoryName: 'Retail & E-Commerce',
    style: 'modern',
    description: 'High-conversion e-commerce storefront with shopping cart, multi-variant products, WhatsApp order integration, and card checkout.',
    theme: { primaryColor: '#18181b', secondaryColor: '#059669', accentColor: '#10b981', fontFamily: 'sans', heroGradient: 'from-zinc-950 via-slate-900 to-emerald-950' },
    hero: {
      badge: 'Free Worldwide Shipping on Orders Over $75',
      title: 'Curated Living for the Mindful Home',
      subtitle: 'Minimalist ceramics, organic linen throws, and ambient lighting designed to turn your everyday space into a peaceful sanctuary.',
      ctaPrimary: { label: 'Shop New Arrivals', action: '#products' },
      ctaSecondary: { label: 'Order via WhatsApp', action: '#contact' },
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Artisan Pieces', value: '200+' }, { label: 'Verified Buyers', value: '18,000+' }, { label: 'Eco Packaging', value: '100%' }],
    },
    sections: [
      {
        type: 'products', title: 'Best Sellers of the Season', subtitle: 'Handcrafted by ethical artisan studios worldwide.',
        items: [
          { name: 'Ceramic Stoneware Vase (Earth White)', price: '$48.00', desc: 'Hand-thrown matte textured stoneware, waterproof interior.' },
          { name: 'Belgian Washed Linen Throw (Oatmeal)', price: '$85.00', desc: '100% natural pre-washed flax linen with fringed edges.' },
          { name: 'Kinetic Cast-Brass Desk Lamp', price: '$140.00', desc: 'Warm dimmable LED, solid spun brass base, 360-degree swivel.' },
          { name: 'Botanical Hinoki Wood Scent Candle', price: '$34.00', desc: '55 hours burn time, pure soy wax with cedar, cypress, and frankincense.' },
        ],
      },
      {
        type: 'features', title: 'The Aura Guarantee', subtitle: 'Simple, risk-free shopping.',
        items: [
          { title: '30-Day In-Home Trial', desc: 'Not completely in love? Return it for free with our prepaid pickup.' },
          { title: 'Secure Instant Checkout', desc: 'Stripe, Paystack, Flutterwave, PayPal and WhatsApp Direct supported.' },
        ],
      },
      { type: 'contact', title: 'Customer Support & WhatsApp Orders', subtitle: 'Have a question about an item or preferred delivery time?' },
    ],
  }),
];

// Dynamically expand to 100+ templates by registering unique stylistic variations across all 71 niches
const ADDITIONAL_NICHES = [
  'college', 'vocational_training', 'online_learning', 'nursery', 'exam_center',
  'bar_lounge', 'catering', 'travel_agency', 'tour_operator', 'event_venue',
  'clinic', 'pharmacy', 'laboratory', 'physiotherapy',
  'supermarket', 'fashion', 'electronics', 'furniture', 'wholesale', 'automotive',
  'software_company', 'graphic_design', 'marketing_agency', 'consulting', 'recruitment_agency',
  'property_management', 'architecture_engineering', 'manufacturing', 'factory', 'equipment_rental',
  'trucking', 'courier', 'fleet_management', 'warehousing', 'shipping_freight',
  'livestock', 'microfinance', 'insurance', 'ngo', 'religious_organization', 'government',
  'content_creator', 'media_publishing', 'photography_studio', 'music_entertainment', 'sports_club',
];

ADDITIONAL_NICHES.forEach((nicheKey, idx) => {
  const formattedName = nicheKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // Template variation A (Modern Pro)
  TEMPLATES_DATA.push({
    id: `${nicheKey}-modern-pro`,
    name: `${formattedName} — Signature Modern`,
    nicheKey,
    category: 'custom',
    categoryName: formattedName,
    style: 'modern',
    description: `High-conversion digital layout designed specifically for ${formattedName}. Includes service catalog, online booking, and contact lead capture.`,
    theme: {
      primaryColor: '#1e293b',
      secondaryColor: '#3b82f6',
      accentColor: '#10b981',
      fontFamily: 'sans',
      heroGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    },
    hero: {
      badge: `Professional ${formattedName} Platform`,
      title: `Delivering Excellence in ${formattedName}`,
      subtitle: `Modern operations, transparent pricing, and dependable client experience trusted by hundreds of happy customers.`,
      ctaPrimary: { label: 'Get Started', action: '#services' },
      ctaSecondary: { label: 'Book Appointment', action: '#booking' },
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Client Satisfaction', value: '99%' }, { label: 'Years Active', value: '8+' }, { label: 'Response Time', value: '< 1 hr' }],
    },
    sections: [
      {
        type: 'features',
        title: `Why Clients Choose Our ${formattedName}`,
        subtitle: 'Uncompromising quality, modern technology, and friendly expertise.',
        items: [
          { title: 'Verified Professional Team', desc: 'Licensed, insured, and experienced specialists.' },
          { title: 'Direct Online Booking', desc: 'Instant confirmation with zero phone delays.' },
          { title: 'Flexible Payment Methods', desc: 'Card, bank transfer, Paystack, Flutterwave, and WhatsApp.' },
        ],
      },
      {
        type: 'services',
        title: 'Popular Services & Packages',
        subtitle: 'Select a package that fits your exact needs.',
        items: [
          { name: `Standard ${formattedName} Package`, price: '$120.00', desc: 'Complete service delivery with quality assurance.' },
          { name: `Premium ${formattedName} Package`, price: '$240.00', desc: 'Priority scheduling, dedicated specialist, and follow-up support.' },
        ],
      },
      { type: 'booking', title: 'Schedule Your Appointment', subtitle: 'Choose your date and time slot.' },
      { type: 'careers', title: 'Careers & Vacancies', subtitle: 'Join our growing team.' },
      { type: 'contact', title: 'Get in Touch', subtitle: 'We reply promptly to all inquiries.' },
    ],
  });

  // Template variation B (Bold Editorial)
  TEMPLATES_DATA.push({
    id: `${nicheKey}-bold-editorial`,
    name: `${formattedName} — Bold Editorial`,
    nicheKey,
    category: 'custom',
    categoryName: formattedName,
    style: 'bold',
    description: `High-impact, contemporary visual theme for ${formattedName} with bold typography, portfolio showcase, and direct WhatsApp sales.`,
    theme: {
      primaryColor: '#09090b',
      secondaryColor: '#f43f5e',
      accentColor: '#fb7185',
      fontFamily: 'sans',
      heroGradient: 'from-zinc-950 via-stone-900 to-rose-950',
    },
    hero: {
      badge: `Top-Rated ${formattedName}`,
      title: `The New Standard in ${formattedName}`,
      subtitle: `Experience a bold, refined approach crafted for clients who demand the very best.`,
      ctaPrimary: { label: 'Order via WhatsApp', action: '#contact' },
      ctaSecondary: { label: 'Explore Catalogue', action: '#products' },
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      stats: [{ label: 'Active Projects', value: '50+' }, { label: 'Customer Rating', value: '4.9 ★' }],
    },
    sections: [
      {
        type: 'services',
        title: 'Our Signature Offerings',
        subtitle: 'Engineered for maximum reliability and impact.',
        items: [
          { name: 'Core Package', price: '$150', desc: 'High quality essential service with full warranty.' },
          { name: 'Executive Solution', price: '$350', desc: 'All-inclusive bespoke delivery.' },
        ],
      },
      { type: 'booking', title: 'Book an Inspection / Session', subtitle: 'Quick reservation in under 2 minutes.' },
      { type: 'contact', title: 'Send Direct Message', subtitle: 'Reach us via WhatsApp or Contact Form.' },
    ],
  });
});

/**
 * Filter templates by niche or category.
 */
export function getTemplatesByNiche(nicheKey?: string | null): WebsiteTemplate[] {
  if (!nicheKey) return TEMPLATES_DATA;
  const filtered = TEMPLATES_DATA.filter((t) => t.nicheKey === nicheKey);
  return filtered.length > 0 ? filtered : TEMPLATES_DATA.slice(0, 12);
}
