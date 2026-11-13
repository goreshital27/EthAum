import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =========================================================================
// 1. PRODUCTION GUARD
// =========================================================================
if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW !== 'true') {
  console.error('[SEED ERROR] Refusing to seed production database without SEED_ALLOW=true set.');
  process.exit(1);
}

const DEMO_PASSWORD = 'Demo@12345';
const BCRYPT_SALT_ROUNDS = 12;

async function main() {
  console.log('----------------------------------------------------');
  console.log('EthAum Seed Execution Starting...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Generating password hash with cost 12...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

  // =========================================================================
  // 2. DESTINATIONS (6 Accredited Medical Hubs)
  // =========================================================================
  console.log('Seeding Destinations...');
  const destinationsData = [
    {
      country: 'India',
      city: 'Mumbai',
      slug: 'india-mumbai',
      overview: 'Premier Asian healthcare hub featuring accredited multi-specialty hospitals, English-fluent surgeons, and world-class cardiology and orthopedics.',
      travelInfo: 'Chhatrapati Shivaji Maharaj International Airport (BOM) provides direct global flights with specialized patient assistance desks.',
      visaInfo: 'Indian e-Medical Visa (Triple Entry) available online within 72 hours with hospital invitation letter.',
    },
    {
      country: 'Thailand',
      city: 'Bangkok',
      slug: 'thailand-bangkok',
      overview: 'World leader in international patient volume, luxurious recovery environments, and advanced surgical care.',
      travelInfo: 'Suvarnabhumi Airport (BKK) connects globally and features dedicated international medical liaison transfer lounges.',
      visaInfo: '60-day visa exemption for many nationalities; 90-day Non-Immigrant MT Medical Visa extendable on-site.',
    },
    {
      country: 'Turkey',
      city: 'Istanbul',
      slug: 'turkey-istanbul',
      overview: 'Cross-continental healthcare destination renowned for world-class cosmetic, hair restoration, dental, and eye surgeries.',
      travelInfo: 'Istanbul Airport (IST) serves as a primary transit hub with nonstop flights to over 300 international cities.',
      visaInfo: 'Online e-Visa issued in minutes for eligible passport holders.',
    },
    {
      country: 'UAE',
      city: 'Dubai',
      slug: 'uae-dubai',
      overview: 'Ultra-modern international healthcare cluster offering premium private surgical suites, robotic surgery, and wellness pavilions.',
      travelInfo: 'Dubai International Airport (DXB) features fast-track concierge arrivals and VIP medical transit.',
      visaInfo: 'Specialized 90-day medical treatment entry permits sponsored directly by authorized hospitals.',
    },
    {
      country: 'Malaysia',
      city: 'Kuala Lumpur',
      slug: 'malaysia-kuala-lumpur',
      overview: 'Award-winning government-facilitated medical hub acclaimed for reproductive endocrinology (IVF), oncology, and transparent pricing.',
      travelInfo: 'Kuala Lumpur International Airport (KUL) provides an MHTC Patient Concierge Lounge and customs fast-track.',
      visaInfo: 'eVisa Medical program available for prospective patients and accompanying companions.',
    },
    {
      country: 'Singapore',
      city: 'Singapore',
      slug: 'singapore-central',
      overview: 'Global gold standard for clinical precision, bio-medical research, complex robotic surgeries, and stringent safety standards.',
      travelInfo: 'Singapore Changi Airport (SIN) delivers peerless transit facilities and world-class connectivity.',
      visaInfo: 'Visa-free entry for up to 90 days for major nationalities; medical extensions granted through hospital sponsorship.',
    },
  ];

  const destinations = {};
  for (const d of destinationsData) {
    const record = await prisma.destination.upsert({
      where: { slug: d.slug },
      update: {
        country: d.country,
        city: d.city,
        overview: d.overview,
        travelInfo: d.travelInfo,
        visaInfo: d.visaInfo,
      },
      create: d,
    });
    destinations[d.country] = record;
  }

  // =========================================================================
  // 3. USERS (Admin, 3 Patients, 9 Hospital Owners)
  // =========================================================================
  console.log('Seeding Users and Profiles...');

  // 1 Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.ethaum.test' },
    update: { isActive: true },
    create: {
      email: 'admin@demo.ethaum.test',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // 3 Patients with Profiles
  const patientsData = [
    {
      email: 'patient1@demo.ethaum.test',
      fullName: 'Elena Rostova',
      country: 'United Kingdom',
      phone: '+44 20 7946 0912',
      language: 'en',
      timezone: 'Europe/London',
    },
    {
      email: 'patient2@demo.ethaum.test',
      fullName: 'Marcus Vance',
      country: 'United States',
      phone: '+1 415 555 2671',
      language: 'en',
      timezone: 'America/New_York',
    },
    {
      email: 'patient3@demo.ethaum.test',
      fullName: 'Amina Al-Mansoor',
      country: 'Kuwait',
      phone: '+965 2221 4455',
      language: 'ar',
      timezone: 'Asia/Kuwait',
    },
  ];

  const patients = [];
  for (const p of patientsData) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { isActive: true },
      create: {
        email: p.email,
        passwordHash,
        role: 'PATIENT',
        isActive: true,
      },
    });

    await prisma.patientProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: p.fullName,
        country: p.country,
        phone: p.phone,
        language: p.language,
        timezone: p.timezone,
      },
      create: {
        userId: user.id,
        fullName: p.fullName,
        country: p.country,
        phone: p.phone,
        language: p.language,
        timezone: p.timezone,
      },
    });

    patients.push(user);
  }

  // 9 Hospital Owner Users
  const hospitalOwners = [];
  for (let i = 1; i <= 9; i++) {
    const email = `hospital${i}@demo.ethaum.test`;
    const owner = await prisma.user.upsert({
      where: { email },
      update: { isActive: true },
      create: {
        email,
        passwordHash,
        role: 'HOSPITAL',
        isActive: true,
      },
    });
    hospitalOwners.push(owner);
  }

  // =========================================================================
  // 4. 9 HOSPITALS (8 Approved, 1 Pending for testing admin flow)
  // =========================================================================
  console.log('Seeding Hospitals...');
  const hospitalsData = [
    {
      ownerId: hospitalOwners[0].id,
      name: 'Lotus Care Super Specialty Hospital',
      slug: 'lotus-care-mumbai',
      description: 'Comprehensive tertiary medical center established with advanced surgical theatres, dedicated robotic orthopedic units, and cardiac catheterization suites.',
      city: 'Mumbai',
      country: 'India',
      accreditations: ['JCI', 'NABH', 'ISO 9001'],
      languages: ['English', 'Hindi', 'Arabic'],
      internationalServices: ['Airport Ambulance', 'Language Interpreter', 'Halal Food', 'Private Suite'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-01-15T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[1].id,
      name: 'Siam Orchid Medical Center',
      slug: 'siam-orchid-bangkok',
      description: 'Acclaimed multi-disciplinary complex recognized for aesthetic surgery, dental transformations, and comprehensive executive wellness checkups.',
      city: 'Bangkok',
      country: 'Thailand',
      accreditations: ['JCI', 'HA Thailand'],
      languages: ['English', 'Thai', 'Japanese', 'Arabic'],
      internationalServices: ['Medical Concierge', 'Suvarnabhumi Airport Desk', 'Recovery Villa'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-02-10T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[2].id,
      name: 'Bosphorus Pearl Health Institute',
      slug: 'bosphorus-pearl-istanbul',
      description: 'Specialized healthcare facility pioneering microscopic hair restoration, functional rhinoplasty, and laser vision correction.',
      city: 'Istanbul',
      country: 'Turkey',
      accreditations: ['JCI', 'TUV Rheinland'],
      languages: ['English', 'Turkish', 'French', 'Russian'],
      internationalServices: ['Hotel Packages', 'VIP Airport Transfer', 'Multi-language Coordinator'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-03-01T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[3].id,
      name: 'Gulf Horizon Surgical Center',
      slug: 'gulf-horizon-dubai',
      description: 'State-of-the-art center located in Dubai Healthcare City delivering premium spine interventions, joint replacements, and metabolic surgery.',
      city: 'Dubai',
      country: 'UAE',
      accreditations: ['JCI', 'ACHS'],
      languages: ['English', 'Arabic', 'Russian', 'German'],
      internationalServices: ['VIP Concierge', 'Chauffeur Service', 'Private Recovery Suite', 'Telehealth'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-03-20T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[4].id,
      name: 'Petronas Metro Wellness Hospital',
      slug: 'petronas-metro-kuala-lumpur',
      description: 'Leading Malaysian quaternary teaching hospital celebrated for high-success IVF cycles, advanced cardiology, and minimally invasive oncology.',
      city: 'Kuala Lumpur',
      country: 'Malaysia',
      accreditations: ['MSQH', 'JCI', 'MHTC Accredited'],
      languages: ['English', 'Malay', 'Mandarin', 'Tamil'],
      internationalServices: ['MHTC Airport Meet & Greet', 'Halal Kitchen', 'Currency Assistance'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-04-05T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[5].id,
      name: 'Marina Apex Specialist Pavilion',
      slug: 'marina-apex-singapore',
      description: 'Renowned academic medical pavilion renowned for robotic-assisted orthopedic surgery, precision oncology, and neurosurgery.',
      city: 'Singapore',
      country: 'Singapore',
      accreditations: ['JCI', 'Singapore Quality Award'],
      languages: ['English', 'Mandarin', 'Bahasa', 'Japanese'],
      internationalServices: ['Direct Insurer Billing', 'Personal Case Manager', 'Remote Tele-followup'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-04-18T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[6].id,
      name: 'Deccan Royal Heart & Ortho Hospital',
      slug: 'deccan-royal-mumbai',
      description: 'High-volume clinical center with specialized robotic joint replacement systems and advanced pediatric and adult cardiac surgery units.',
      city: 'Mumbai',
      country: 'India',
      accreditations: ['JCI', 'NABH'],
      languages: ['English', 'Hindi', 'Gujarati'],
      internationalServices: ['Visa Extension Desk', 'On-call Translators', 'Dedicated Patient Ward'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-05-01T00:00:00Z'),
      offersVirtualConsult: true,
    },
    {
      ownerId: hospitalOwners[7].id,
      name: 'Anatolia Golden Horn Specialty Clinic',
      slug: 'anatolia-golden-horn-istanbul',
      description: 'Boutique surgical facility specializing in bariatric sleeves, aesthetic dentistry, veneers, and body contouring.',
      city: 'Istanbul',
      country: 'Turkey',
      accreditations: ['ISO 9001', 'Turkish Ministry of Health Certified'],
      languages: ['English', 'Turkish', 'Italian', 'Spanish'],
      internationalServices: ['Private Airport Van', 'Post-Op Care Package', 'Personal Nurse Support'],
      verificationStatus: 'APPROVED',
      verifiedAt: new Date('2024-05-15T00:00:00Z'),
      offersVirtualConsult: false,
    },
    {
      ownerId: hospitalOwners[8].id,
      name: 'Emerald Bay International Clinic',
      slug: 'emerald-bay-bangkok',
      description: 'Newly constructed medical facility focused on integrative wellness, outpatient orthopedics, and ophthalmology awaiting accreditation audit.',
      city: 'Bangkok',
      country: 'Thailand',
      accreditations: ['HA Thailand (Candidate)'],
      languages: ['English', 'Thai'],
      internationalServices: ['Airport Pickup', 'Language Assistance'],
      verificationStatus: 'PENDING', // PENDING TO TEST ADMIN APPROVAL FLOW
      verifiedAt: null,
      offersVirtualConsult: true,
    },
  ];

  const hospitals = [];
  for (const h of hospitalsData) {
    const hospital = await prisma.hospital.upsert({
      where: { slug: h.slug },
      update: {
        name: h.name,
        description: h.description,
        city: h.city,
        country: h.country,
        accreditations: h.accreditations,
        languages: h.languages,
        internationalServices: h.internationalServices,
        verificationStatus: h.verificationStatus,
        verifiedAt: h.verifiedAt,
        offersVirtualConsult: h.offersVirtualConsult,
      },
      create: h,
    });
    hospitals.push(hospital);
  }

  // =========================================================================
  // 5. DOCTORS (2 to 3 per hospital, all fictional)
  // =========================================================================
  console.log('Seeding Doctors...');
  const doctorsData = [
    // Lotus Care (Hospital 1)
    {
      hospitalId: hospitals[0].id,
      name: 'Dr. Arjun Mehta',
      specialty: 'Orthopedics & Joint Reconstruction',
      qualifications: 'MBBS, MS (Ortho), Fellowship in Robotic Joint Arthroplasty (UK)',
      yearsExperience: 18,
      languages: ['English', 'Hindi', 'Gujarati'],
      bio: 'Pioneered computer-navigated total knee and hip replacements with over 4,500 successful surgical procedures.',
    },
    {
      hospitalId: hospitals[0].id,
      name: 'Dr. Priya Nambiar',
      specialty: 'Cardiothoracic & Vascular Surgery',
      qualifications: 'MBBS, MCh (CTVS), FACS',
      yearsExperience: 22,
      languages: ['English', 'Hindi', 'Malayalam'],
      bio: 'Senior cardiothoracic surgeon specializing in off-pump CABG bypass surgery and minimally invasive valve repair.',
    },
    {
      hospitalId: hospitals[0].id,
      name: 'Dr. Rajesh Kulkarni',
      specialty: 'Spine Surgery',
      qualifications: 'MBBS, DNB (Orthopedics), Spine Fellowship (Germany)',
      yearsExperience: 15,
      languages: ['English', 'Hindi', 'Marathi'],
      bio: 'Expert in endoscopic spinal decompression and minimally invasive lumbar microdiscectomy.',
    },

    // Siam Orchid (Hospital 2)
    {
      hospitalId: hospitals[1].id,
      name: 'Dr. Somchai Prasert',
      specialty: 'Aesthetic Plastic Surgery',
      qualifications: 'MD, Board Certified Plastic & Reconstructive Surgery (Thailand)',
      yearsExperience: 17,
      languages: ['English', 'Thai'],
      bio: 'Internationally recognized surgeon specializing in rhinoplasty, facial contouring, and reconstructive aesthetics.',
    },
    {
      hospitalId: hospitals[1].id,
      name: 'Dr. Kanya Vichean',
      specialty: 'Comprehensive Ophthalmology',
      qualifications: 'MD, Ophthalmology Fellowship (Singapore & USA)',
      yearsExperience: 14,
      languages: ['English', 'Thai', 'Japanese'],
      bio: 'Specialist in Femto-LASIK and micro-incision cataract surgeries with premium multifocal lens implants.',
    },

    // Bosphorus Pearl (Hospital 3)
    {
      hospitalId: hospitals[2].id,
      name: 'Dr. Emre Demir',
      specialty: 'Trichology & Hair Restoration',
      qualifications: 'MD, ISHRS Member, Fellowship in Follicular Unit Extraction',
      yearsExperience: 12,
      languages: ['English', 'Turkish'],
      bio: 'Has performed over 3,000 Sapphire FUE and DHI hair restoration procedures for international travelers.',
    },
    {
      hospitalId: hospitals[2].id,
      name: 'Dr. Leyla Aydin',
      specialty: 'Prosthodontics & Implantology',
      qualifications: 'DDS, PhD in Implant Prosthetics (Munich)',
      yearsExperience: 16,
      languages: ['English', 'Turkish', 'German'],
      bio: 'Expert in full-mouth All-on-4 dental rehabilitation and computer-guided ceramic veneer placements.',
    },

    // Gulf Horizon (Hospital 4)
    {
      hospitalId: hospitals[3].id,
      name: 'Dr. Tariq Al-Hashimi',
      specialty: 'Orthopedic Spine Surgery',
      qualifications: 'MBChB, FRCS (Tr & Orth), European Spine Board Certified',
      yearsExperience: 20,
      languages: ['English', 'Arabic', 'French'],
      bio: 'Renowned spine consultant with deep focus on disc replacement and motion preservation technologies.',
    },
    {
      hospitalId: hospitals[3].id,
      name: 'Dr. Zoya Volkova',
      specialty: 'Bariatric & Metabolic Surgery',
      qualifications: 'MD, FACS, IFSO Member',
      yearsExperience: 15,
      languages: ['English', 'Russian', 'Arabic'],
      bio: 'Specialized in laparoscopic sleeve gastrectomy and robotic metabolic interventions with rapid recovery protocols.',
    },

    // Petronas Metro (Hospital 5)
    {
      hospitalId: hospitals[4].id,
      name: 'Dr. Tan Seng Hock',
      specialty: 'Reproductive Medicine (IVF)',
      qualifications: 'MBBS (Malaya), MRCOG (UK), Fellowship in Reproductive Endocrinology (Australia)',
      yearsExperience: 19,
      languages: ['English', 'Malay', 'Mandarin'],
      bio: 'Senior IVF specialist with clinical pregnancy success rates exceeding 65% for international fertility patients.',
    },
    {
      hospitalId: hospitals[4].id,
      name: 'Dr. Nurul Huda',
      specialty: 'Interventional Cardiology',
      qualifications: 'MD, FACC, FSCAI',
      yearsExperience: 16,
      languages: ['English', 'Malay'],
      bio: 'Experienced in transcatheter cardiac interventions, complex angioplasty, and preventative cardiology.',
    },

    // Marina Apex (Hospital 6)
    {
      hospitalId: hospitals[5].id,
      name: 'Dr. Marcus Lim',
      specialty: 'Robotic Orthopedics & Joint Replacement',
      qualifications: 'MBBS, FRCS (Edin), MMed (Ortho)',
      yearsExperience: 21,
      languages: ['English', 'Mandarin'],
      bio: 'Lead robotic arthroplasty consultant utilizing Mako robotic-arm assisted surgical systems for precision joint outcomes.',
    },
    {
      hospitalId: hospitals[5].id,
      name: 'Dr. Evelyn Chen',
      specialty: 'Endocrine & Thyroid Surgery',
      qualifications: 'MBBS, FRACS (Surgery), General Surgery Fellow',
      yearsExperience: 13,
      languages: ['English', 'Mandarin', 'Japanese'],
      bio: 'Focuses on scarless transoral endoscopic thyroidectomy and minimally invasive parathyroid interventions.',
    },

    // Deccan Royal (Hospital 7)
    {
      hospitalId: hospitals[6].id,
      name: 'Dr. Vikramaditya Rao',
      specialty: 'Orthopedics & Sports Medicine',
      qualifications: 'MBBS, MS (Ortho), Sports Medicine Fellowship (USA)',
      yearsExperience: 15,
      languages: ['English', 'Hindi', 'Telugu'],
      bio: 'Specializes in keyhole shoulder arthroscopy, rotator cuff reconstructions, and knee ligament reconstructions.',
    },
    {
      hospitalId: hospitals[6].id,
      name: 'Dr. Sunita Deshmukh',
      specialty: 'Adult & Pediatric Cardiology',
      qualifications: 'MBBS, MD, DM (Cardiology)',
      yearsExperience: 17,
      languages: ['English', 'Hindi', 'Marathi'],
      bio: 'Cardiology director focusing on non-invasive diagnostic evaluations, echocardiography, and coronary recovery.',
    },

    // Anatolia Golden Horn (Hospital 8)
    {
      hospitalId: hospitals[7].id,
      name: 'Dr. Caner Yilmaz',
      specialty: 'Aesthetic Dentistry',
      qualifications: 'DDS, MSc in Esthetic Dentistry (Geneva)',
      yearsExperience: 11,
      languages: ['English', 'Turkish'],
      bio: 'Specialized in 3D digital smile design, porcelain laminates, and cosmetic dental restorations.',
    },
    {
      hospitalId: hospitals[7].id,
      name: 'Dr. Baris Ozdemir',
      specialty: 'General & Bariatric Surgery',
      qualifications: 'MD, Turkish Surgical Association Board',
      yearsExperience: 14,
      languages: ['English', 'Turkish'],
      bio: 'Expert in laparoscopic gastric sleeve surgery with over 1,800 procedures performed with zero major complications.',
    },

    // Emerald Bay (Hospital 9 - Pending)
    {
      hospitalId: hospitals[8].id,
      name: 'Dr. Niran Wattana',
      specialty: 'Preventive Medicine & Executive Health',
      qualifications: 'MD, American Board of Preventive Medicine Certification',
      yearsExperience: 10,
      languages: ['English', 'Thai'],
      bio: 'Designs personalized health screenings, bio-marker mapping, and wellness longevity protocols.',
    },
    {
      hospitalId: hospitals[8].id,
      name: 'Dr. Siriporn Chai',
      specialty: 'Dermatology & Laser Aesthetics',
      qualifications: 'MD, Diploma in Dermatology (Cardiff)',
      yearsExperience: 9,
      languages: ['English', 'Thai'],
      bio: 'Specializes in non-invasive skin rejuvenation and advanced dermatological laser procedures.',
    },
  ];

  const doctors = [];
  for (const doc of doctorsData) {
    const existing = await prisma.doctor.findFirst({
      where: { hospitalId: doc.hospitalId, name: doc.name },
    });
    if (existing) {
      const updated = await prisma.doctor.update({
        where: { id: existing.id },
        data: doc,
      });
      doctors.push(updated);
    } else {
      const created = await prisma.doctor.create({
        data: doc,
      });
      doctors.push(created);
    }
  }

  // =========================================================================
  // 6. 15 TREATMENTS
  // =========================================================================
  console.log('Seeding Treatments...');
  const treatmentsData = [
    {
      name: 'Total Knee Replacement (Arthroplasty)',
      slug: 'knee-replacement',
      specialty: 'Orthopedics',
      description: 'Surgical procedure where damaged bone and cartilage from the knee joint are resurfaced with high-grade metal alloys and crosslinked polyethylene implants.',
      recoveryInfo: 'Initial walking with support within 24 hours. Physical therapy continued for 4-6 weeks. Return to desk work in 3-4 weeks.',
      expectedStayDays: 4,
      risks: 'Infection, deep vein thrombosis (DVT), implant stiffness, and mild nerve irritation.',
      questionsToAsk: 'What brand and material of implant do you use? Is robotic navigation used during my procedure?',
    },
    {
      name: 'Coronary Artery Bypass Grafting (CABG)',
      slug: 'cardiac-bypass',
      specialty: 'Cardiology & CTVS',
      description: 'Surgical revascularization to restore blood flow to heart muscle bypassing blocked coronary arteries using harvested arterial or venous grafts.',
      recoveryInfo: 'Hospital stay of 5-7 days including 2 days in ICU. Full recovery and cardiac rehab over 6-8 weeks.',
      expectedStayDays: 7,
      risks: 'Bleeding, cardiac arrhythmia, sternal wound delay, and reaction to anesthesia.',
      questionsToAsk: 'Do you perform beating-heart (off-pump) bypass surgery? What is your surgical volume per year?',
    },
    {
      name: 'In Vitro Fertilization (IVF Cycle with ICSI)',
      slug: 'ivf-cycle',
      specialty: 'Fertility & Reproductive',
      description: 'Advanced reproductive cycle comprising controlled ovarian stimulation, ultrasound-guided egg retrieval, intracytoplasmic sperm injection (ICSI), and blastocyst transfer.',
      recoveryInfo: 'Bed rest on the day of embryo transfer. Normal daily routine resumed within 48 hours.',
      expectedStayDays: 14,
      risks: 'Ovarian hyperstimulation syndrome (OHSS), multiple pregnancy, and mild cramping.',
      questionsToAsk: 'Do you offer PGT-A genetic screening on embryos? What are your live birth rates for my age cohort?',
    },
    {
      name: 'All-on-4 Dental Implant Rehabilitation',
      slug: 'dental-implants',
      specialty: 'Dentistry',
      description: 'Full-arch fixed dental rehabilitation using four strategically positioned titanium implants supporting a permanent high-strength zirconia bridge.',
      recoveryInfo: 'Soft food diet for 2 weeks. Immediate temporary prosthesis fitted on surgical day.',
      expectedStayDays: 5,
      risks: 'Implant failure to osseointegrate, temporary gum bruising, and bite misalignment.',
      questionsToAsk: 'Are the implants authentic Straumann or Nobel Biocare? Does the quote include 3D CBCT scans?',
    },
    {
      name: 'Femto-Laser Cataract Surgery with Multifocal IOL',
      slug: 'cataract-surgery',
      specialty: 'Ophthalmology',
      description: 'Blade-free femtosecond laser extraction of the cloudy natural lens followed by the insertion of a premium multifocal or toric intraocular lens.',
      recoveryInfo: 'Near-instantaneous vision improvement. Eye drops prescribed for 3 weeks. Protective eye shield at sleep.',
      expectedStayDays: 2,
      risks: 'Mild glare or halos around light sources at night, elevated intraocular pressure.',
      questionsToAsk: 'Will this premium lens correct both near and distance vision? What laser system is used?',
    },
    {
      name: 'Sapphire FUE Hair Restoration (3,500 Grafts)',
      slug: 'hair-transplant',
      specialty: 'Aesthetic Surgery',
      description: 'Extraction of individual follicular units from the donor occipital area and micro-implantation using sapphire-tip blades for natural hair density.',
      recoveryInfo: 'Head bandage removed after 48 hours. Scabs shed in 10-12 days. Full transplanted hair growth at 9-12 months.',
      expectedStayDays: 3,
      risks: 'Folliculitis, temporary shock loss, and donor area tightness.',
      questionsToAsk: 'Are the incisions performed by the doctor or technicians? Is PRP therapy included?',
    },
    {
      name: 'Minimally Invasive Lumbar Microdiscectomy',
      slug: 'spine-surgery',
      specialty: 'Spine Surgery',
      description: 'Targeted microsurgical excision of herniated disc fragment compressing the spinal nerve root relieving severe sciatica and lower back pain.',
      recoveryInfo: 'Hospital discharge within 24-48 hours. Avoid heavy lifting and strenuous twisting for 6 weeks.',
      expectedStayDays: 3,
      risks: 'Dural tear, recurrent disc herniation, and localized infection.',
      questionsToAsk: 'Do you use intraoperative neuromonitoring during the decompression?',
    },
    {
      name: 'Comprehensive Executive Health Screening',
      slug: 'health-checkup',
      specialty: 'Preventive Medicine',
      description: 'Full-day diagnostic evaluation including full-body MRI/CT screening, stress echo, cancer tumor markers, carotid doppler, and lifestyle consultations.',
      recoveryInfo: 'Outpatient diagnostic day. Comprehensive multi-disciplinary physician consultation review in 24 hours.',
      expectedStayDays: 1,
      risks: 'Non-invasive procedure with negligible clinical risks.',
      questionsToAsk: 'Does the checkup include a formal radiologist review and post-screening teleconsultation?',
    },
    {
      name: 'Total Hip Replacement (Anterior Approach)',
      slug: 'hip-replacement',
      specialty: 'Orthopedics',
      description: 'Muscle-sparing direct anterior arthroplasty replacing arthritic acetabulum and femoral head with ceramic-on-polyethylene components.',
      recoveryInfo: 'Supported walking within hours. Low hip precaution restrictions. Drive in 3-4 weeks.',
      expectedStayDays: 4,
      risks: 'Dislocation, leg length discrepancy, and localized hematoma.',
      questionsToAsk: 'Does the surgeon use the muscle-sparing anterior approach? What ceramic bearings are used?',
    },
    {
      name: 'Functional & Aesthetic Ultrasonic Rhinoplasty',
      slug: 'rhinoplasty',
      specialty: 'Plastic Surgery',
      description: 'Piezoelectric ultrasonic precision remodeling of the nasal bone and cartilage architecture to refine shape and resolve deviated septum breathing issues.',
      recoveryInfo: 'Nasal splint worn for 7 days. Bruising resolves in 10 days. Final subtle tip definition settles over 12 months.',
      expectedStayDays: 4,
      risks: 'Nasal congestion, temporary numbness, asymmetry, and revision risk.',
      questionsToAsk: 'Do you use internal silicone splints rather than traditional gauze packing?',
    },
    {
      name: 'Laparoscopic Sleeve Gastrectomy',
      slug: 'gastric-sleeve',
      specialty: 'Bariatric Surgery',
      description: 'Keyhole bariatric procedure resecting approximately 75-80% of the stomach along the greater curvature reducing appetite hormone ghrelin.',
      recoveryInfo: 'Clear liquids for 2 weeks followed by pureed diet. Regular gentle walking encouraged on day 1.',
      expectedStayDays: 3,
      risks: 'Staple line leak, stricture, vitamin deficiency, and GERD acid reflux.',
      questionsToAsk: 'What post-operative bariatric nutritionist follow-up is provided for international patients?',
    },
    {
      name: 'Femto-LASIK Dual-Eye Laser Vision Correction',
      slug: 'lasik-eye-surgery',
      specialty: 'Ophthalmology',
      description: 'Sub-micron accurate corneal reshaping utilizing femtosecond laser flap creation followed by wavefront excimer laser ablation.',
      recoveryInfo: 'Functional 20/20 vision typically achieved the following morning. Protective goggles at night for 1 week.',
      expectedStayDays: 2,
      risks: 'Dry eyes for 1-3 months, temporary halos under low lighting.',
      questionsToAsk: 'Are post-procedure enhancement touch-ups included within the first year if needed?',
    },
    {
      name: 'Porcelain Smile Makeover (8-16 Veneers)',
      slug: 'dental-veneers',
      specialty: 'Dentistry',
      description: 'Micro-thin custom-fabricated E-max or feldspathic porcelain laminates bonded to the front teeth to correct shape, alignment, and brightness.',
      recoveryInfo: 'Minimal gum sensitivity for 3-5 days. Normal chewing resumed immediately.',
      expectedStayDays: 5,
      risks: 'Tooth sensitivity, debonding of veneer, and micro-chipping under trauma.',
      questionsToAsk: 'Will I see a diagnostic 3D wax-up or mock-up in my mouth before final fabrication?',
    },
    {
      name: 'Shoulder Arthroscopy & Rotator Cuff Repair',
      slug: 'shoulder-arthroscopy',
      specialty: 'Orthopedics',
      description: 'Minimally invasive keyhole arthroscopic reattachment of torn rotator cuff tendons to the humerus bone using bio-composite suture anchors.',
      recoveryInfo: 'Arm sling worn for 4-6 weeks. Guided physical therapy started at week 2. Full sports recovery at 4-6 months.',
      expectedStayDays: 2,
      risks: 'Shoulder stiffness (frozen shoulder), anchor pullout, and residual weakness.',
      questionsToAsk: 'Are bio-absorbable suture anchors used? How many portals/incisions are planned?',
    },
    {
      name: 'Endoscopic Transoral Thyroidectomy',
      slug: 'thyroidectomy',
      specialty: 'Endocrine Surgery',
      description: 'Scarless surgical excision of thyroid lobe or complete thyroid gland performed through tiny vestibular incisions behind the lower lip.',
      recoveryInfo: 'Soft diet for 3 days. Return to normal activities in 7-10 days with zero visible neck scarring.',
      expectedStayDays: 3,
      risks: 'Temporary voice hoarseness from laryngeal nerve stretching, transient hypocalcemia.',
      questionsToAsk: 'How many transoral scarless thyroid surgeries has your surgical team performed?',
    },
  ];

  const treatments = [];
  for (const t of treatmentsData) {
    const record = await prisma.treatment.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        specialty: t.specialty,
        description: t.description,
        recoveryInfo: t.recoveryInfo,
        expectedStayDays: t.expectedStayDays,
        risks: t.risks,
        questionsToAsk: t.questionsToAsk,
      },
      create: t,
    });
    treatments.push(record);
  }

  // =========================================================================
  // 7. HOSPITAL-TREATMENT LINKS & 20+ PACKAGES
  // =========================================================================
  console.log('Seeding HospitalTreatments and Packages...');

  // Setup pricing matrix (in USD cents)
  const treatmentPricing = {
    'knee-replacement': { min: 450000, max: 850000, pkg: 620000, nights: 4 },
    'cardiac-bypass': { min: 650000, max: 1400000, pkg: 980000, nights: 7 },
    'ivf-cycle': { min: 400000, max: 750000, pkg: 580000, nights: 14 },
    'dental-implants': { min: 350000, max: 700000, pkg: 480000, nights: 5 },
    'cataract-surgery': { min: 120000, max: 280000, pkg: 195000, nights: 2 },
    'hair-transplant': { min: 180000, max: 350000, pkg: 240000, nights: 3 },
    'spine-surgery': { min: 550000, max: 1100000, pkg: 790000, nights: 3 },
    'health-checkup': { min: 45000, max: 120000, pkg: 75000, nights: 1 },
    'hip-replacement': { min: 500000, max: 950000, pkg: 690000, nights: 4 },
    'rhinoplasty': { min: 250000, max: 550000, pkg: 380000, nights: 4 },
    'gastric-sleeve': { min: 420000, max: 850000, pkg: 590000, nights: 3 },
    'lasik-eye-surgery': { min: 110000, max: 240000, pkg: 165000, nights: 2 },
    'dental-veneers': { min: 280000, max: 600000, pkg: 420000, nights: 5 },
    'shoulder-arthroscopy': { min: 380000, max: 720000, pkg: 510000, nights: 2 },
    'thyroidectomy': { min: 350000, max: 680000, pkg: 480000, nights: 3 },
  };

  // Associate treatments with hospitals based on hospital specialty profile
  // Hospital 0 (Lotus Care, Mumbai): knee-replacement, cardiac-bypass, spine-surgery, hip-replacement
  // Hospital 1 (Siam Orchid, Bangkok): rhinoplasty, cataract-surgery, health-checkup, dental-veneers
  // Hospital 2 (Bosphorus Pearl, Istanbul): hair-transplant, dental-implants, dental-veneers, rhinoplasty
  // Hospital 3 (Gulf Horizon, Dubai): spine-surgery, gastric-sleeve, hip-replacement, knee-replacement
  // Hospital 4 (Petronas Metro, KL): ivf-cycle, cardiac-bypass, health-checkup, thyroidectomy
  // Hospital 5 (Marina Apex, Singapore): knee-replacement, thyroidectomy, spine-surgery, shoulder-arthroscopy
  // Hospital 6 (Deccan Royal, Mumbai): cardiac-bypass, knee-replacement, shoulder-arthroscopy, hip-replacement
  // Hospital 7 (Anatolia Golden, Istanbul): dental-implants, gastric-sleeve, hair-transplant, dental-veneers
  // Hospital 8 (Emerald Bay, Bangkok - Pending): health-checkup, lasik-eye-surgery, cataract-surgery

  const hospitalTreatmentMappings = [
    { hospIdx: 0, slugs: ['knee-replacement', 'cardiac-bypass', 'spine-surgery', 'hip-replacement'] },
    { hospIdx: 1, slugs: ['rhinoplasty', 'cataract-surgery', 'health-checkup', 'dental-veneers'] },
    { hospIdx: 2, slugs: ['hair-transplant', 'dental-implants', 'dental-veneers', 'rhinoplasty'] },
    { hospIdx: 3, slugs: ['spine-surgery', 'gastric-sleeve', 'hip-replacement', 'knee-replacement'] },
    { hospIdx: 4, slugs: ['ivf-cycle', 'cardiac-bypass', 'health-checkup', 'thyroidectomy'] },
    { hospIdx: 5, slugs: ['knee-replacement', 'thyroidectomy', 'spine-surgery', 'shoulder-arthroscopy'] },
    { hospIdx: 6, slugs: ['cardiac-bypass', 'knee-replacement', 'shoulder-arthroscopy', 'hip-replacement'] },
    { hospIdx: 7, slugs: ['dental-implants', 'gastric-sleeve', 'hair-transplant', 'dental-veneers'] },
    { hospIdx: 8, slugs: ['health-checkup', 'lasik-eye-surgery', 'cataract-surgery'] },
  ];

  const packages = [];

  for (const mapping of hospitalTreatmentMappings) {
    const hospital = hospitals[mapping.hospIdx];

    for (const slug of mapping.slugs) {
      const treatment = treatments.find((t) => t.slug === slug);
      if (!treatment) continue;

      const pricing = treatmentPricing[slug];

      // Upsert HospitalTreatment link
      await prisma.hospitalTreatment.upsert({
        where: {
          hospitalId_treatmentId: {
            hospitalId: hospital.id,
            treatmentId: treatment.id,
          },
        },
        update: {
          minPriceCents: pricing.min,
          maxPriceCents: pricing.max,
          currency: 'USD',
        },
        create: {
          hospitalId: hospital.id,
          treatmentId: treatment.id,
          minPriceCents: pricing.min,
          maxPriceCents: pricing.max,
          currency: 'USD',
        },
      });

      // Create a Package for this pair
      const title = `${treatment.name} - Complete Care Package`;
      const existingPkg = await prisma.package.findFirst({
        where: {
          hospitalId: hospital.id,
          treatmentId: treatment.id,
          title,
        },
      });

      const pkgData = {
        hospitalId: hospital.id,
        treatmentId: treatment.id,
        title,
        priceCents: pricing.pkg,
        currency: 'USD',
        nights: pricing.nights,
        inclusions: [
          'Pre-operative clinical consultations and pathology labs',
          `Hospital stay for ${pricing.nights} night(s) in private single suite`,
          'Chief surgeon, assistant surgeon, and anesthesiologist professional fees',
          'Surgical theatre, nursing charges, and high-grade surgical consumables',
          'Airport round-trip luxury medical transfers',
          'English-speaking personal medical coordinator',
        ],
        exclusions: [
          'International flight tickets',
          'Treatment for unrelated pre-existing medical comorbidities',
          'Extended post-discharge stay beyond scheduled package',
          'Personal companion hotel accommodation and meals',
        ],
        cancellationTerms: 'Full refund minus 5% processing fee up to 14 days prior to admission. 80% refund if cancelled within 7 days.',
        isActive: hospital.verificationStatus === 'APPROVED',
      };

      if (existingPkg) {
        const updated = await prisma.package.update({
          where: { id: existingPkg.id },
          data: pkgData,
        });
        packages.push(updated);
      } else {
        const created = await prisma.package.create({
          data: pkgData,
        });
        packages.push(created);
      }
    }
  }

  console.log(`Created ${packages.length} Packages.`);

  // =========================================================================
  // 8. SAMPLE CASES & QUOTES (At least 5 cases across different CaseStages)
  // =========================================================================
  console.log('Seeding Sample Cases across CaseStages...');

  // Case 1: NEW (Patient 1, Knee Replacement, Mumbai)
  const case1Identifier = 'Patient 1 - Knee Replacement Inquiry (Stage: NEW)';
  let case1 = await prisma.medicalCase.findFirst({
    where: { patientId: patients[0].id, treatmentNeed: case1Identifier },
  });
  if (!case1) {
    case1 = await prisma.medicalCase.create({
      data: {
        patientId: patients[0].id,
        treatmentId: treatments.find((t) => t.slug === 'knee-replacement').id,
        treatmentNeed: case1Identifier,
        diagnosisSummary: 'Fictional inquiry: Bilateral knee osteoarthritis with progressive joint space narrowing and difficulty climbing stairs.',
        medicalHistory: 'No history of cardiovascular disease. Non-smoker. No known drug allergies.',
        destinationId: destinations['India'].id,
        budgetCents: 700000,
        currency: 'USD',
        travelDateFrom: new Date('2026-12-01T00:00:00Z'),
        travelDateTo: new Date('2026-12-15T00:00:00Z'),
        language: 'en',
        travelPartySize: 2,
        hasInsurance: false,
        stage: 'NEW',
      },
    });
  }

  // Case 2: QUALIFIED (Patient 2, Cardiac Bypass, Bangkok)
  const case2Identifier = 'Patient 2 - Cardiac Revascularization Inquiry (Stage: QUALIFIED)';
  let case2 = await prisma.medicalCase.findFirst({
    where: { patientId: patients[1].id, treatmentNeed: case2Identifier },
  });
  if (!case2) {
    case2 = await prisma.medicalCase.create({
      data: {
        patientId: patients[1].id,
        treatmentId: treatments.find((t) => t.slug === 'cardiac-bypass').id,
        treatmentNeed: case2Identifier,
        diagnosisSummary: 'Fictional case: Two-vessel coronary artery disease with 80% stenosis in proximal LAD. Medical records and reports fully vetted.',
        medicalHistory: 'Controlled hypertension on ACE inhibitors. No prior thoracic surgery.',
        destinationId: destinations['Thailand'].id,
        budgetCents: 1100000,
        currency: 'USD',
        travelDateFrom: new Date('2026-11-20T00:00:00Z'),
        travelDateTo: new Date('2026-12-05T00:00:00Z'),
        language: 'en',
        travelPartySize: 2,
        hasInsurance: true,
        stage: 'QUALIFIED',
      },
    });
  }

  // Case 3: QUOTE_REQUESTED (Patient 3, IVF, KL, with Consent & Enquiry to Hospital 5)
  const case3Identifier = 'Patient 3 - IVF Fertility Consultation (Stage: QUOTE_REQUESTED)';
  let case3 = await prisma.medicalCase.findFirst({
    where: { patientId: patients[2].id, treatmentNeed: case3Identifier },
  });
  if (!case3) {
    case3 = await prisma.medicalCase.create({
      data: {
        patientId: patients[2].id,
        treatmentId: treatments.find((t) => t.slug === 'ivf-cycle').id,
        treatmentNeed: case3Identifier,
        diagnosisSummary: 'Fictional case: Secondary infertility for 3 years seeking advanced ICSI cycle and blastocyst screening.',
        medicalHistory: 'Normal endocrine parameters. Good ovarian reserve.',
        destinationId: destinations['Malaysia'].id,
        budgetCents: 650000,
        currency: 'USD',
        travelDateFrom: new Date('2026-12-10T00:00:00Z'),
        travelDateTo: new Date('2026-12-28T00:00:00Z'),
        language: 'ar',
        travelPartySize: 2,
        hasInsurance: false,
        stage: 'QUOTE_REQUESTED',
      },
    });
  }

  // Add Consent & Enquiry for Case 3 to Hospital 4 (Petronas Metro)
  await prisma.consent.upsert({
    where: {
      caseId_hospitalId: {
        caseId: case3.id,
        hospitalId: hospitals[4].id,
      },
    },
    update: { scope: 'FULL_CASE_FILE' },
    create: {
      caseId: case3.id,
      hospitalId: hospitals[4].id,
      scope: 'FULL_CASE_FILE',
      grantedAt: new Date(),
    },
  });

  await prisma.enquiry.upsert({
    where: {
      caseId_hospitalId: {
        caseId: case3.id,
        hospitalId: hospitals[4].id,
      },
    },
    update: { status: 'VIEWED' },
    create: {
      caseId: case3.id,
      hospitalId: hospitals[4].id,
      status: 'VIEWED',
      urgency: 'NORMAL',
      assignedToName: 'Fertility Coordinator Farah',
      notes: 'Patient requesting comprehensive ICSI package including medication estimates.',
      respondBy: new Date(Date.now() + 86400000 * 3),
    },
  });

  // Case 4: QUOTE_SENT (Patient 1, Hair Restoration, Turkey, Enquiry + Quotation)
  const case4Identifier = 'Patient 1 - Hair Restoration Treatment (Stage: QUOTE_SENT)';
  let case4 = await prisma.medicalCase.findFirst({
    where: { patientId: patients[0].id, treatmentNeed: case4Identifier },
  });
  if (!case4) {
    case4 = await prisma.medicalCase.create({
      data: {
        patientId: patients[0].id,
        treatmentId: treatments.find((t) => t.slug === 'hair-transplant').id,
        treatmentNeed: case4Identifier,
        diagnosisSummary: 'Fictional case: Norwood Stage IV male pattern hair loss seeking 3,500 FUE graft implantation.',
        medicalHistory: 'Good general physical health. Normal blood coagulation profile.',
        destinationId: destinations['Turkey'].id,
        budgetCents: 300000,
        currency: 'USD',
        travelDateFrom: new Date('2026-12-05T00:00:00Z'),
        travelDateTo: new Date('2026-12-10T00:00:00Z'),
        language: 'en',
        travelPartySize: 1,
        hasInsurance: false,
        stage: 'QUOTE_SENT',
      },
    });
  }

  await prisma.consent.upsert({
    where: {
      caseId_hospitalId: {
        caseId: case4.id,
        hospitalId: hospitals[2].id,
      },
    },
    update: { scope: 'FULL_CASE_FILE' },
    create: {
      caseId: case4.id,
      hospitalId: hospitals[2].id,
      scope: 'FULL_CASE_FILE',
      grantedAt: new Date(),
    },
  });

  const enq4 = await prisma.enquiry.upsert({
    where: {
      caseId_hospitalId: {
        caseId: case4.id,
        hospitalId: hospitals[2].id,
      },
    },
    update: { status: 'RESPONDED' },
    create: {
      caseId: case4.id,
      hospitalId: hospitals[2].id,
      status: 'RESPONDED',
      urgency: 'HIGH',
      assignedToName: 'International Desk Istanbul',
      notes: 'Quotation delivered directly to patient inbox with travel options.',
    },
  });

  // Quotation for Case 4
  const existingQuote4 = await prisma.quotation.findFirst({
    where: { enquiryId: enq4.id },
  });
  if (!existingQuote4) {
    await prisma.quotation.create({
      data: {
        enquiryId: enq4.id,
        doctorId: doctors.find((d) => d.name === 'Dr. Emre Demir')?.id,
        status: 'SENT',
        subtotalCents: 240000,
        taxCents: 0,
        totalCents: 240000,
        currency: 'USD',
        validUntil: new Date(Date.now() + 86400000 * 30),
        lineItems: [
          { description: '3,500 Sapphire FUE Hair Transplant', amountCents: 190000 },
          { description: '3 Nights 5-Star Hotel + Breakfast', amountCents: 35000 },
          { description: 'VIP Airport and Clinic Transfers', amountCents: 15000 },
        ],
        paymentSchedule: { depositPercentage: 20, balanceDue: 'Upon Hospital Admission' },
        cancellationTerms: 'Free cancellation up to 72 hours prior to flight departure.',
        notes: 'Includes 1-year supply of post-op care shampoo and serum.',
      },
    });
  }

  // Case 5: CONSULTATION (Patient 2, Spine Surgery, UAE, Enquiry + Quotation + Appointment)
  const case5Identifier = 'Patient 2 - Lumbar Microdiscectomy (Stage: CONSULTATION)';
  let case5 = await prisma.medicalCase.findFirst({
    where: { patientId: patients[1].id, treatmentNeed: case5Identifier },
  });
  if (!case5) {
    case5 = await prisma.medicalCase.create({
      data: {
        patientId: patients[1].id,
        treatmentId: treatments.find((t) => t.slug === 'spine-surgery').id,
        treatmentNeed: case5Identifier,
        diagnosisSummary: 'Fictional case: L4-L5 disc protrusion with radiculopathy causing pain resistant to conservative treatment.',
        medicalHistory: 'No diabetes. Active non-smoker.',
        destinationId: destinations['UAE'].id,
        budgetCents: 900000,
        currency: 'USD',
        travelDateFrom: new Date('2026-11-28T00:00:00Z'),
        travelDateTo: new Date('2026-12-08T00:00:00Z'),
        language: 'en',
        travelPartySize: 2,
        hasInsurance: true,
        stage: 'CONSULTATION',
      },
    });
  }

  await prisma.consent.upsert({
    where: {
      caseId_hospitalId: {
        caseId: case5.id,
        hospitalId: hospitals[3].id,
      },
    },
    update: { scope: 'FULL_CASE_FILE' },
    create: {
      caseId: case5.id,
      hospitalId: hospitals[3].id,
      scope: 'FULL_CASE_FILE',
      grantedAt: new Date(),
    },
  });

  const enq5 = await prisma.enquiry.upsert({
    where: {
      caseId_hospitalId: {
        caseId: case5.id,
        hospitalId: hospitals[3].id,
      },
    },
    update: { status: 'RESPONDED' },
    create: {
      caseId: case5.id,
      hospitalId: hospitals[3].id,
      status: 'RESPONDED',
      assignedToName: 'Dubai Care Coordinator',
      notes: 'Tele-consultation scheduled with Dr. Tariq Al-Hashimi.',
    },
  });

  const existingQuote5 = await prisma.quotation.findFirst({
    where: { enquiryId: enq5.id },
  });
  if (!existingQuote5) {
    await prisma.quotation.create({
      data: {
        enquiryId: enq5.id,
        doctorId: doctors.find((d) => d.name === 'Dr. Tariq Al-Hashimi')?.id,
        status: 'ACCEPTED',
        subtotalCents: 790000,
        taxCents: 0,
        totalCents: 790000,
        currency: 'USD',
        validUntil: new Date(Date.now() + 86400000 * 45),
        lineItems: [
          { description: 'Minimally Invasive Lumbar Microdiscectomy', amountCents: 650000 },
          { description: '3 Nights Luxury Private Recovery Suite', amountCents: 90000 },
          { description: 'Post-op Physical Therapy & Mobility Training', amountCents: 50000 },
        ],
      },
    });
  }

  const existingAppt5 = await prisma.appointment.findFirst({
    where: { caseId: case5.id, hospitalId: hospitals[3].id },
  });
  if (!existingAppt5) {
    await prisma.appointment.create({
      data: {
        caseId: case5.id,
        hospitalId: hospitals[3].id,
        doctorId: doctors.find((d) => d.name === 'Dr. Tariq Al-Hashimi')?.id,
        type: 'EXPLORATORY',
        status: 'CONFIRMED',
        scheduledAt: new Date('2026-11-20T14:00:00Z'),
        timezone: 'Asia/Dubai',
        videoLink: 'https://telehealth.ethaum.demo/room/spine-consult-8921',
      },
    });
  }

  // =========================================================================
  // 9. 20 REVIEWS (with Completed Bookings & Succeeded Payments)
  // =========================================================================
  console.log('Seeding 20 Completed Bookings, Payments, and Reviews...');

  const reviewTemplates = [
    {
      hospIdx: 0, // Lotus Care, Mumbai
      patIdx: 0,
      rating: 5,
      comment: 'From the airport pickup in Mumbai to the robotic surgery care, everything was smooth. The physical therapy team had me walking the next day!',
      reply: 'Thank you for placing your trust in Lotus Care. Wishing you continued joint health and pain-free mobility!',
    },
    {
      hospIdx: 0,
      patIdx: 1,
      rating: 5,
      comment: 'Outstanding cardiac team and compassionate nursing care. Saved me over 60% compared to private treatment costs back home.',
      reply: 'Our cardiac team sends their warmest regards. Keep up with your recommended cardiac rehabilitation!',
    },
    {
      hospIdx: 0,
      patIdx: 2,
      rating: 4,
      comment: 'Very professional doctors and clean private suite. The coordinator handled my visa paperwork seamlessly.',
      reply: 'We are delighted to have served you and your family.',
    },
    {
      hospIdx: 1, // Siam Orchid, Bangkok
      patIdx: 0,
      rating: 5,
      comment: 'The executive health screening in Bangkok was incredibly thorough. Completed CT and full blood panel within one morning.',
      reply: 'Thank you! Preventive health is our greatest priority.',
    },
    {
      hospIdx: 1,
      patIdx: 1,
      rating: 5,
      comment: 'Incredible hospitality and surgical precision. The recovery villa made all the difference.',
      reply: 'Siam Orchid is proud to have been part of your wellness journey.',
    },
    {
      hospIdx: 1,
      patIdx: 2,
      rating: 4,
      comment: 'High medical standards, modern technology, and friendly staff. Highly recommended medical destination.',
      reply: null,
    },
    {
      hospIdx: 2, // Bosphorus Pearl, Istanbul
      patIdx: 0,
      rating: 5,
      comment: 'The Sapphire FUE procedure was painless. The hotel package and transfers took all the stress out of traveling to Istanbul.',
      reply: 'Thank you! We look forward to seeing your full 12-month result photos.',
    },
    {
      hospIdx: 2,
      patIdx: 1,
      rating: 4,
      comment: 'Full mouth dental implants done with digital precision. The final zirconia bridge looks completely natural.',
      reply: 'Keep smiling proudly! Best wishes from our dental team.',
    },
    {
      hospIdx: 2,
      patIdx: 2,
      rating: 5,
      comment: 'World-class aesthetic clinic with genuine care. The translator was with me through every single consultation.',
      reply: null,
    },
    {
      hospIdx: 3, // Gulf Horizon, Dubai
      patIdx: 0,
      rating: 5,
      comment: 'State-of-the-art spine center in Dubai Healthcare City. The private recovery room felt like a 5-star hotel.',
      reply: 'Thank you for your review. We are delighted with your swift recovery.',
    },
    {
      hospIdx: 3,
      patIdx: 1,
      rating: 5,
      comment: 'Bariatric surgery care was second to none. The dietitian support provided post-discharge has been invaluable.',
      reply: 'Your health and long-term nutrition success are our greatest achievements.',
    },
    {
      hospIdx: 4, // Petronas Metro, KL
      patIdx: 2,
      rating: 5,
      comment: 'Our fertility journey succeeded on the first attempt with Dr. Tan. Warm, respectful team and completely transparent costs.',
      reply: 'We could not be happier for you and your growing family! Warmest congratulations from all of us in KL.',
    },
    {
      hospIdx: 4,
      patIdx: 0,
      rating: 4,
      comment: 'The MHTC airport lounge support made arriving in Malaysia effortless. Excellent quaternary medical care.',
      reply: 'Safe travels, and thank you for choosing Malaysia for your medical journey.',
    },
    {
      hospIdx: 4,
      patIdx: 1,
      rating: 5,
      comment: 'Exceptional cardiology team. The nurses were attentive 24/7 and explained every medication thoroughly.',
      reply: null,
    },
    {
      hospIdx: 5, // Marina Apex, Singapore
      patIdx: 0,
      rating: 5,
      comment: 'Unsurpassed clinical precision with robotic hip replacement. Singapore medical infrastructure is truly world standard.',
      reply: 'Thank you. Our robotic surgical team is proud to have facilitated your active recovery.',
    },
    {
      hospIdx: 5,
      patIdx: 1,
      rating: 5,
      comment: 'Clear communication, high safety protocols, and direct insurance billing handled without hassle.',
      reply: null,
    },
    {
      hospIdx: 6, // Deccan Royal, Mumbai
      patIdx: 1,
      rating: 4,
      comment: 'My shoulder arthroscopy went smoothly. The surgeon answered all my pre-op questions patiently.',
      reply: 'Continue with your gentle physical therapy exercises. Best wishes!',
    },
    {
      hospIdx: 6,
      patIdx: 2,
      rating: 5,
      comment: 'Cardiac bypass surgery completed with zero complications. The ICU nursing staff was deeply compassionate.',
      reply: 'Wishing you strong heart health and long vitality.',
    },
    {
      hospIdx: 7, // Anatolia Golden Horn, Istanbul
      patIdx: 0,
      rating: 4,
      comment: 'Smile makeover with 16 veneers completed in just 5 days. Truly artistic craftsmanship.',
      reply: 'Thank you! Enjoy your radiant new smile!',
    },
    {
      hospIdx: 7,
      patIdx: 1,
      rating: 5,
      comment: 'Great bariatric program. Lost 22 kg in 4 months with full medical guidance from the clinic.',
      reply: 'Congratulations on your healthy transformation!',
    },
  ];

  const completedBookings = [];

  for (let i = 0; i < reviewTemplates.length; i++) {
    const item = reviewTemplates[i];
    const hospital = hospitals[item.hospIdx];
    const patient = patients[item.patIdx];
    const caseTitle = `Completed Journey Reference #${1000 + i}`;

    // 1. Create/Find completed MedicalCase
    let completedCase = await prisma.medicalCase.findFirst({
      where: { patientId: patient.id, treatmentNeed: caseTitle },
    });
    if (!completedCase) {
      completedCase = await prisma.medicalCase.create({
        data: {
          patientId: patient.id,
          treatmentNeed: caseTitle,
          diagnosisSummary: 'Fictional completed patient medical case.',
          medicalHistory: 'Patient in satisfactory post-operative health.',
          budgetCents: 500000 + i * 25000,
          currency: 'USD',
          stage: 'CLOSED',
        },
      });
    }

    // 2. Create/Find Enquiry
    const enquiry = await prisma.enquiry.upsert({
      where: {
        caseId_hospitalId: {
          caseId: completedCase.id,
          hospitalId: hospital.id,
        },
      },
      update: { status: 'RESPONDED' },
      create: {
        caseId: completedCase.id,
        hospitalId: hospital.id,
        status: 'RESPONDED',
      },
    });

    // 3. Create/Find Quotation
    let quotation = await prisma.quotation.findFirst({
      where: { enquiryId: enquiry.id },
    });
    if (!quotation) {
      quotation = await prisma.quotation.create({
        data: {
          enquiryId: enquiry.id,
          status: 'ACCEPTED',
          subtotalCents: 500000 + i * 25000,
          totalCents: 500000 + i * 25000,
          currency: 'USD',
          lineItems: [{ description: 'Surgical Package Completed', amountCents: 500000 + i * 25000 }],
        },
      });
    }

    // 4. Create/Find Booking
    const booking = await prisma.booking.upsert({
      where: { quotationId: quotation.id },
      update: { status: 'COMPLETED' },
      create: {
        caseId: completedCase.id,
        quotationId: quotation.id,
        hospitalId: hospital.id,
        status: 'COMPLETED',
        bookingFeeCents: 50000, // $500 upfront deposit
        currency: 'USD',
      },
    });

    completedBookings.push(booking);

    // 5. Create/Find Payment
    const existingPayment = await prisma.payment.findFirst({
      where: { bookingId: booking.id },
    });
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amountCents: 500000 + i * 25000,
          currency: 'USD',
          status: 'SUCCEEDED',
          providerRef: `pi_demo_${booking.id.substring(0, 8)}`,
          paidAt: new Date(Date.now() - 86400000 * (30 + i)),
        },
      });
    }

    // 6. Create/Find Review
    await prisma.review.upsert({
      where: { bookingId: booking.id },
      update: {
        rating: item.rating,
        comment: item.comment,
        hospitalReply: item.reply,
        isVerified: true,
      },
      create: {
        bookingId: booking.id,
        hospitalId: hospital.id,
        patientId: patient.id,
        rating: item.rating,
        comment: item.comment,
        hospitalReply: item.reply,
        isVerified: true,
      },
    });
  }

  console.log(`Created ${reviewTemplates.length} Reviews with completed Bookings and Payments.`);

  // =========================================================================
  // 10. REFERRALS (At least 2 with 5% commission on completed bookings)
  // =========================================================================
  console.log('Seeding Referrals (5% commission)...');

  // Referral 1: Elena referred Marcus for completed booking 0
  const booking1 = completedBookings[0];
  const billedAmount1 = 500000;
  const commission1 = Math.round(billedAmount1 * 0.05); // 5% = $250.00 (25000 cents)

  await prisma.referral.upsert({
    where: { code: 'REF-ELENA-500' },
    update: {
      bookingId: booking1.id,
      commissionCents: commission1,
      status: 'PAID',
    },
    create: {
      code: 'REF-ELENA-500',
      referrerId: patients[0].id,
      referredPatientId: patients[1].id,
      bookingId: booking1.id,
      commissionRateBps: 500, // 5%
      commissionCents: commission1,
      currency: 'USD',
      status: 'PAID',
    },
  });

  // Referral 2: Marcus referred Amina for completed booking 1
  const booking2 = completedBookings[1];
  const billedAmount2 = 525000;
  const commission2 = Math.round(billedAmount2 * 0.05); // 5% = $262.50 (26250 cents)

  await prisma.referral.upsert({
    where: { code: 'REF-MARCUS-500' },
    update: {
      bookingId: booking2.id,
      commissionCents: commission2,
      status: 'QUALIFIED',
    },
    create: {
      code: 'REF-MARCUS-500',
      referrerId: patients[1].id,
      referredPatientId: patients[2].id,
      bookingId: booking2.id,
      commissionRateBps: 500, // 5%
      commissionCents: commission2,
      currency: 'USD',
      status: 'QUALIFIED',
    },
  });

  // =========================================================================
  // 11. TABLE COUNTS & SUMMARY
  // =========================================================================
  const userCount = await prisma.user.count();
  const profileCount = await prisma.patientProfile.count();
  const destinationCount = await prisma.destination.count();
  const hospitalCount = await prisma.hospital.count();
  const doctorCount = await prisma.doctor.count();
  const treatmentCount = await prisma.treatment.count();
  const hospTreatmentCount = await prisma.hospitalTreatment.count();
  const packageCount = await prisma.package.count();
  const caseCount = await prisma.medicalCase.count();
  const consentCount = await prisma.consent.count();
  const enquiryCount = await prisma.enquiry.count();
  const quotationCount = await prisma.quotation.count();
  const appointmentCount = await prisma.appointment.count();
  const bookingCount = await prisma.booking.count();
  const paymentCount = await prisma.payment.count();
  const reviewCount = await prisma.review.count();
  const referralCount = await prisma.referral.count();

  console.log('\n====================================================');
  console.log('ETHAUM SEED EXECUTION SUMMARY: TABLE COUNTS');
  console.log('====================================================');
  console.log(`Users:               ${userCount}`);
  console.log(`PatientProfiles:     ${profileCount}`);
  console.log(`Destinations:        ${destinationCount}`);
  console.log(`Hospitals:           ${hospitalCount}`);
  console.log(`Doctors:             ${doctorCount}`);
  console.log(`Treatments:          ${treatmentCount}`);
  console.log(`HospitalTreatments:  ${hospTreatmentCount}`);
  console.log(`Packages:            ${packageCount}`);
  console.log(`MedicalCases:        ${caseCount}`);
  console.log(`Consents:            ${consentCount}`);
  console.log(`Enquiries:           ${enquiryCount}`);
  console.log(`Quotations:          ${quotationCount}`);
  console.log(`Appointments:        ${appointmentCount}`);
  console.log(`Bookings:            ${bookingCount}`);
  console.log(`Payments:            ${paymentCount}`);
  console.log(`Reviews:             ${reviewCount}`);
  console.log(`Referrals:           ${referralCount}`);

  console.log('\n====================================================');
  console.log('DEMO TEST LOGINS (Password: Demo@12345)');
  console.log('====================================================');
  console.log('ADMIN:');
  console.log('  admin@demo.ethaum.test         (Role: ADMIN)');
  console.log('\nPATIENTS:');
  console.log('  patient1@demo.ethaum.test      (Role: PATIENT - Elena Rostova, UK)');
  console.log('  patient2@demo.ethaum.test      (Role: PATIENT - Marcus Vance, USA)');
  console.log('  patient3@demo.ethaum.test      (Role: PATIENT - Amina Al-Mansoor, Kuwait)');
  console.log('\nHOSPITALS (1 per facility):');
  console.log('  hospital1@demo.ethaum.test     (Lotus Care Hospital, Mumbai - APPROVED)');
  console.log('  hospital2@demo.ethaum.test     (Siam Orchid Center, Bangkok - APPROVED)');
  console.log('  hospital3@demo.ethaum.test     (Bosphorus Pearl, Istanbul - APPROVED)');
  console.log('  hospital4@demo.ethaum.test     (Gulf Horizon Center, Dubai - APPROVED)');
  console.log('  hospital5@demo.ethaum.test     (Petronas Metro Hospital, KL - APPROVED)');
  console.log('  hospital6@demo.ethaum.test     (Marina Apex Pavilion, Singapore - APPROVED)');
  console.log('  hospital7@demo.ethaum.test     (Deccan Royal Heart Hospital, Mumbai - APPROVED)');
  console.log('  hospital8@demo.ethaum.test     (Anatolia Golden Horn Clinic, Istanbul - APPROVED)');
  console.log('  hospital9@demo.ethaum.test     (Emerald Bay Clinic, Bangkok - PENDING)');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('[SEED FAILED]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
