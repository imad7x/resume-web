/* Made-up people whose resumes fill the design gallery and can be a starting
 * point. Each template names the one that shows it best (example: "…"). */
(function () {
  "use strict";
  const ref = (name, position, phone, email) => ({ name, position, phone, email });

  const marketing = {
    basics: {
      name: "Mariana Anderson", label: "Marketing Manager", email: "mariana@example.com", phone: "+1 555 010 2233",
      url: "marianaanderson.example", image: "data/examples/p1.svg",
      summary: "Marketing manager with 8 years in B2B software. Builds demand programmes that sales teams trust, and has grown qualified pipeline at three companies while keeping cost per lead flat.",
      location: { city: "Chicago", region: "IL", countryCode: "US" }, profiles: [{ network: "LinkedIn", url: "linkedin.com/in/mariana-anderson-example" }],
    },
    work: [
      { position: "Marketing Manager", name: "Ginyard International", location: "Chicago, IL", startDate: "2022-04", endDate: "",
        highlights: ["Grew qualified pipeline **42%** in a year by rebuilding lifecycle email and paid search around three buyer segments",
          "Launched a customer story series that sales now uses in 60% of late-stage deals",
          "Manages a team of five and an annual budget of $1.8M"] },
      { position: "Senior Marketing Specialist", name: "Borcelle Software", location: "Chicago, IL", startDate: "2020-01", endDate: "2022-03",
        highlights: ["Ran webinars and field events that sourced **$4.1M** in new pipeline",
          "Cut cost per lead 23% by moving spend from display to partner newsletters"] },
      { position: "Inside Sales Representative", name: "Wardiere Inc.", location: "Milwaukee, WI", startDate: "2018-06", endDate: "2019-12",
        highlights: ["Exceeded quota in 5 of 6 quarters; moved to marketing to run the outbound email programme"] },
    ],
    education: [
      { studyType: "MBA", area: "Marketing", institution: "Borcelle University", startDate: "2016", endDate: "2018" },
      { studyType: "Bachelor of Business Management", area: "", institution: "Borcelle University", startDate: "2012", endDate: "2016" },
    ],
    skills: [{ name: "", keywords: ["Demand generation", "Lifecycle email", "Paid search", "Marketing analytics", "Event marketing", "Team leadership"] }],
    languages: [{ language: "English", fluency: "Native" }, { language: "Spanish", fluency: "Fluent" }],
    references: [ref("Harumi Kobayashi", "CEO, Wardiere Inc.", "+1 555 010 7788", "harumi@example.com"),
      ref("Bailey Dupont", "VP Sales, Borcelle Software", "+1 555 010 4455", "bailey@example.com")],
  };

  const creative = {
    basics: {
      name: "Michael Andrew", label: "Creative Director", email: "michael@example.com", phone: "+33 1 55 01 02 03",
      url: "michaelandrew.example", image: "data/examples/p2.svg",
      summary: "Creative director with 12 years across brand identity, campaign and digital product work. Leads multidisciplinary teams from first sketch to launch, and keeps the idea intact through production.",
      location: { city: "Paris", countryCode: "France" }, profiles: [],
    },
    work: [
      { position: "Creative Director", name: "LEO Company", location: "Paris", startDate: "2019-01", endDate: "",
        summary: "Heads a studio of 14 designers, writers and motion artists serving retail and hospitality clients.",
        highlights: ["Won 9 of 12 competitive pitches in three years, adding €6M in annual fees",
          "Rebrand for a 200-store grocer lifted unaided brand recall from 31% to 48%"] },
      { position: "Senior Art Director", name: "Atelier Nord", location: "Lyon", startDate: "2015-02", endDate: "2018-12",
        highlights: ["Directed the launch campaign for a regional airline across film, outdoor and social",
          "Set up the studio’s first design system practice, cutting production time by a third"] },
      { position: "Designer", name: "Studio Fauget", location: "Lyon", startDate: "2012-09", endDate: "2015-01",
        highlights: ["Packaging and identity for food and drink brands sold in 11 countries"] },
    ],
    education: [
      { studyType: "Master’s", area: "Visual Communication", institution: "University of New York", startDate: "2010", endDate: "2012" },
      { studyType: "Bachelor’s", area: "Graphic Design", institution: "University of Washington", startDate: "2006", endDate: "2010" },
    ],
    skills: [{ name: "", keywords: ["Brand strategy", "Art direction", "Campaign concepts", "Team leadership", "Client presentations", "Motion and film", "Design systems", "Budgeting"] }],
    languages: [{ language: "English", fluency: "Native" }, { language: "French", fluency: "Professional" }],
    references: [ref("James Collenwie", "Chief Engineer, MIN Technologies", "+1 555 010 6901", "james@example.com")],
  };

  const content = {
    basics: {
      name: "Estelle Darcy", label: "Content Creator", email: "hello@estelledarcy.example", phone: "+44 20 5550 0123",
      url: "", image: "data/examples/p3.svg",
      summary: "Creative and detail-oriented content creator with 3+ years producing engaging content for online platforms. Skilled in writing, editing and content strategy.",
      location: { city: "London", countryCode: "UK" }, profiles: [],
    },
    work: [
      { position: "Content Creator", name: "Ginyard International Co.", startDate: "2021-03", endDate: "",
        highlights: ["Produced written and visual content for the website, social channels and email campaigns",
          "Worked with the marketing team on content strategies that raised engagement **38%** year on year",
          "Uses analytics to track performance and adjust the content plan every month"] },
      { position: "Junior Copywriter", name: "Rimberio Media", startDate: "2019-07", endDate: "2021-02",
        highlights: ["Wrote product pages and newsletters for 20 small-business clients",
          "Edited a weekly newsletter that grew from 4,000 to 15,000 readers"] },
    ],
    education: [{ studyType: "BA", area: "Communication", institution: "Rimberio University", endDate: "2018-05" }],
    certificates: [{ name: "Content Marketing Certification", issuer: "Arowwai Industries", date: "2019-06" }],
    skills: [{ name: "", keywords: ["Content writing", "Editing", "SEO", "Social media management", "Video production", "Graphic design"] }],
    projects: [{ name: "Portfolio", url: "estelledarcy.example", description: "Blog posts, articles, videos and other work, with the results each piece achieved." }],
    languages: [{ language: "English", fluency: "Native" }, { language: "Spanish", fluency: "Intermediate" }],
  };

  const designer = {
    basics: {
      name: "Linda Brown", label: "Web & Graphic Designer", email: "linda@example.com", phone: "+61 2 5550 1234",
      url: "lindabrown.example", image: "data/examples/p4.svg",
      summary: "Designer who moves easily between brand and interface work. Seven years of shipping websites, identities and campaigns for studios and in-house teams.",
      location: { city: "Sydney", countryCode: "Australia" }, profiles: [],
    },
    work: [
      { position: "Senior Designer", name: "Larana Studio", startDate: "2021-02", endDate: "",
        summary: "Leads design on web projects for retail and cultural clients.",
        highlights: ["Redesigned an online store that lifted conversion from 1.9% to 2.7%", "Built a component library now shared by four product teams"] },
      { position: "Web Designer", name: "Salford & Co.", startDate: "2018-03", endDate: "2021-01",
        summary: "Designed and built marketing sites with a team of three developers.",
        highlights: ["Delivered 30+ sites, most within four weeks of kickoff", "Introduced accessibility reviews before every launch"] },
      { position: "Junior Designer", name: "Timmerman Print", startDate: "2016-01", endDate: "2018-02",
        highlights: ["Brochures, signage and packaging for local businesses"] },
    ],
    education: [
      { studyType: "Master of Design", institution: "Sydney Design School", startDate: "2014", endDate: "2015" },
      { studyType: "Bachelor of Commerce", institution: "Fauget University", startDate: "2010", endDate: "2013" },
    ],
    skills: [{ name: "HTML & CSS", level: "5" }, { name: "JavaScript", level: "3" }, { name: "Figma", level: "5" },
      { name: "WordPress", level: "4" }, { name: "Photoshop", level: "4" }, { name: "Illustrator", level: "4" }, { name: "Lightroom", level: "3" }],
    languages: [{ language: "English", fluency: "Native" }, { language: "German", fluency: "Conversational" }],
    interests: [{ name: "Photography" }, { name: "Travelling" }, { name: "Reading" }, { name: "Football" }, { name: "Ceramics" }],
  };

  const engineer = {
    basics: {
      name: "Elena Marsh", label: "Senior Site Reliability Engineer", email: "elena.marsh@example.com", phone: "+1 555 014 2387",
      url: "elenamarsh.example",
      summary: "Site reliability engineer with **9 years** of experience keeping high-traffic platforms fast and available. Builds self-service infrastructure, cuts cloud spend, and turns noisy alerts into clear, actionable signals.",
      location: { city: "Austin", region: "TX", countryCode: "US" },
      profiles: [{ network: "LinkedIn", url: "linkedin.com/in/elena-marsh-example" }, { network: "GitHub", url: "github.com/elena-marsh-example" }],
    },
    work: [
      { position: "Senior Site Reliability Engineer", name: "Northwind Cloud", location: "Austin, TX", startDate: "2022-03", endDate: "",
        highlights: ["Led the move of **140 services** to Kubernetes, cutting deploy time from 40 minutes to 6",
          "Introduced SLOs and error budgets for 12 product teams; paging volume fell **63%** in two quarters",
          "Built a Terraform module library now used for every new AWS account in the company",
          "Saved **$1.2M a year** by right-sizing clusters and moving batch jobs to spot capacity"] },
      { position: "Site Reliability Engineer", name: "Fabrikam Payments", location: "Remote", startDate: "2018-06", endDate: "2022-02",
        highlights: ["Ran the on-call rotation for a payments API handling 3,000 requests per second",
          "Cut mean time to recovery from 48 to 11 minutes with runbooks and automated rollbacks",
          "Moved metrics from a hosted vendor to Prometheus and Grafana, saving $300K a year"] },
      { position: "Systems Engineer", name: "Contoso Hosting", location: "Dallas, TX", startDate: "2015-07", endDate: "2018-05",
        highlights: ["Automated server builds with Ansible, replacing a two-day manual process", "Maintained 99.98% uptime across 600 customer servers"] },
    ],
    education: [{ studyType: "BS", area: "Computer Science", institution: "University of Texas at Austin", startDate: "2011", endDate: "2015" }],
    certificates: [{ name: "Certified Kubernetes Administrator", issuer: "CNCF", date: "2023-05" }, { name: "AWS Solutions Architect – Professional", issuer: "Amazon Web Services", date: "2021-11" }],
    skills: [{ name: "Platforms", keywords: ["Kubernetes", "AWS", "GCP", "Linux"] }, { name: "Automation", keywords: ["Terraform", "Ansible", "Python", "Go", "GitHub Actions"] },
      { name: "Observability", keywords: ["Prometheus", "Grafana", "OpenTelemetry", "Loki"] }],
    projects: [{ name: "kubecost-lite", url: "github.com/elena-marsh-example/kubecost-lite", description: "Open-source tool that reports cost per namespace from cluster metrics; 1,400 stars.", highlights: [] }],
    languages: [{ language: "English", fluency: "Native" }, { language: "Spanish", fluency: "Conversational" }],
  };

  const fresher = {
    basics: {
      name: "Rohan Verma", label: "B.Tech Computer Science, 2026", email: "rohan.verma@example.com", phone: "+91 98765 01234", url: "",
      summary: "Final-year computer science student with internship experience in backend development. Looking for a software engineer role where I can build reliable services and keep learning.",
      location: { city: "Pune", countryCode: "India" },
      profiles: [{ network: "LinkedIn", url: "linkedin.com/in/rohan-verma-example" }, { network: "GitHub", url: "github.com/rohan-verma-example" }],
      personal: [{ label: "Date of birth", value: "14 March 2004" }, { label: "Languages", value: "English, Hindi, Marathi" },
        { label: "Address", value: "Kothrud, Pune 411038" }, { label: "Nationality", value: "Indian" }],
    },
    education: [
      { studyType: "B.Tech", area: "Computer Science", institution: "Pune Institute of Technology", startDate: "2022", endDate: "2026", score: "8.7 CGPA" },
      { studyType: "Class XII (CBSE)", area: "", institution: "Kendriya Vidyalaya, Pune", startDate: "", endDate: "2022", score: "92.4%" },
      { studyType: "Class X (CBSE)", area: "", institution: "Kendriya Vidyalaya, Pune", startDate: "", endDate: "2020", score: "95.0%" },
    ],
    work: [{ position: "Backend Intern", name: "Zentrix Software", location: "Pune", startDate: "2025-05", endDate: "2025-07",
      highlights: ["Built a REST service in Java Spring Boot that serves order history to the mobile app", "Wrote 60 unit tests, raising coverage of the module from 48% to 81%", "Cut one slow query from 2.1 s to 180 ms by adding an index"] }],
    projects: [
      { name: "Campus Ride Share", startDate: "2025-01", endDate: "2025-04", description: "Android app that matches students travelling the same route.", keywords: ["Kotlin", "Firebase", "Maps API"],
        highlights: ["Used by 300 students in its first month", "Team of four; I built matching and notifications"] },
      { name: "Attendance by Face Recognition", startDate: "2024-08", endDate: "2024-11", description: "Marks attendance from a classroom photo.", keywords: ["Python", "OpenCV", "Flask"],
        highlights: ["93% accuracy on a class of 60"] },
    ],
    skills: [{ name: "Languages", keywords: ["Java", "Python", "C++", "SQL"] }, { name: "Frameworks", keywords: ["Spring Boot", "React", "Flask"] }, { name: "Tools", keywords: ["Git", "Docker", "Linux", "MySQL"] }],
    awards: [{ title: "Winner, Smart India Hackathon (college round)", awarder: "Pune Institute of Technology", date: "2024-09" }, { title: "Top 5%, NPTEL Data Structures", awarder: "NPTEL", date: "2023-12" }],
    declaration: { text: "I hereby declare that the information given above is true and correct to the best of my knowledge.", place: "Pune", date: "" },
  };

  const academic = {
    basics: {
      name: "Dr. Helen Ward", label: "Associate Professor of Environmental Science", email: "h.ward@example.edu", phone: "+44 131 555 0199", url: "helenward.example",
      summary: "Researches how urban wetlands store carbon and reduce flood risk. Principal investigator on £2.3M of funded projects; teaches hydrology and field methods.",
      location: { city: "Edinburgh", countryCode: "UK" }, profiles: [{ network: "ORCID", url: "orcid.org/0000-0000-0000-0000" }],
    },
    work: [
      { position: "Associate Professor", name: "University of Edinburgh, School of GeoSciences", startDate: "2019-09", endDate: "",
        highlights: ["Leads a group of 4 PhD students and 2 postdoctoral researchers", "Programme director, MSc Environmental Sustainability (2021–2024)"] },
      { position: "Lecturer", name: "University of Leeds", startDate: "2014-09", endDate: "2019-08", highlights: ["Designed the second-year field course in catchment hydrology"] },
      { position: "Postdoctoral Research Fellow", name: "ETH Zürich", startDate: "2011-10", endDate: "2014-08", highlights: [] },
    ],
    education: [
      { studyType: "PhD", area: "Hydrology", institution: "University of Cambridge", startDate: "2007", endDate: "2011" },
      { studyType: "MSc", area: "Environmental Science", institution: "University of Manchester", startDate: "2006", endDate: "2007" },
      { studyType: "BSc", area: "Geography", institution: "University of Durham", startDate: "2003", endDate: "2006", score: "First class" },
    ],
    publications: [
      { name: "Carbon burial rates in restored urban wetlands", publisher: "Nature Geoscience 17, 211–219", releaseDate: "2024", summary: "Ward H., Osei K., Lindqvist M." },
      { name: "Small ponds, large stores: a national inventory of pond carbon", publisher: "Global Change Biology 29, 4410–4425", releaseDate: "2023", summary: "Ward H., Petrov A." },
      { name: "Flood attenuation by constructed wetlands in clay catchments", publisher: "Water Resources Research 57", releaseDate: "2021", summary: "Chen L., Ward H." },
      { name: "A field method for rapid sediment carbon estimates", publisher: "Hydrological Processes 33, 1820–1833", releaseDate: "2019", summary: "Ward H." },
    ],
    awards: [{ title: "NERC Standard Grant, £1.4M (PI): Urban wetlands as carbon stores", awarder: "Natural Environment Research Council", date: "2022" },
      { title: "Chancellor’s Award for Teaching", awarder: "University of Edinburgh", date: "2021" },
      { title: "Leverhulme Research Fellowship, £48,000", awarder: "Leverhulme Trust", date: "2017" }],
    skills: [{ name: "Methods", keywords: ["Sediment coring", "Eddy covariance", "Isotope analysis", "R", "Python", "GIS"] }],
    languages: [{ language: "English", fluency: "Native" }, { language: "German", fluency: "Professional" }],
    custom: [{ id: "teach", title: "Teaching", kind: "list", lines: ["Catchment Hydrology (BSc, 80 students), course organiser since 2019", "Field Methods in Environmental Science (MSc)", "Supervised 6 PhD students to completion"] }],
    references: [ref("Prof. Marcus Hale", "Head of School, University of Edinburgh", "", "m.hale@example.edu")],
  };

  const nurse = {
    basics: {
      name: "Anjali Nair", label: "Registered Nurse, Critical Care", email: "anjali.nair@example.com", phone: "+91 98450 01122", url: "",
      summary: "Critical care nurse with seven years in adult ICUs at tertiary hospitals. Calm in emergencies, careful with documentation, and a preceptor for new graduates.",
      location: { city: "Kochi", countryCode: "India" },
      profiles: [{ network: "LinkedIn", url: "linkedin.com/in/anjali-nair-example" }],
    },
    certificates: [
      { name: "Registered Nurse and Midwife", issuer: "Kerala Nurses and Midwives Council", date: "2017-08" },
      { name: "Advanced Cardiac Life Support (ACLS)", issuer: "American Heart Association", date: "2025-02" },
      { name: "Basic Life Support (BLS)", issuer: "American Heart Association", date: "2025-02" },
      { name: "Critical Care Nursing Certificate", issuer: "Indian Society of Critical Care Medicine", date: "2021-06" },
    ],
    work: [
      { position: "Senior Staff Nurse, Medical ICU", name: "Lakeshore Hospital", location: "Kochi", startDate: "2021-04", endDate: "",
        highlights: ["Care for 2 ventilated patients a shift in a 24-bed medical ICU", "Precepted 14 newly qualified nurses through their first 3 months",
          "Led the ward's switch to a sepsis bundle checklist; time to antibiotics fell from 95 to 52 minutes"] },
      { position: "Staff Nurse, Cardiac ICU", name: "Amrita Institute of Medical Sciences", location: "Kochi", startDate: "2017-09", endDate: "2021-03",
        highlights: ["Cared for post-operative cardiac surgery patients, including those on balloon pumps", "Audited 300 medication charts a year for the pharmacy committee"] },
    ],
    education: [{ studyType: "B.Sc.", area: "Nursing", institution: "Government College of Nursing, Thiruvananthapuram", startDate: "2013", endDate: "2017", score: "First class" }],
    skills: [{ name: "Clinical", keywords: ["Ventilator care", "Arterial lines", "CRRT", "Sepsis bundles", "IV therapy"] },
      { name: "Systems", keywords: ["Epic", "eMAR", "Infection control audits"] }],
    languages: [{ language: "Malayalam", fluency: "Native" }, { language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Conversational" }],
    awards: [{ title: "Nurse of the Year, Critical Care", awarder: "Lakeshore Hospital", date: "2023-05" }],
  };

  const lawyer = {
    basics: {
      name: "Kabir Mehta", label: "Associate, Corporate and M&A", email: "kabir.mehta@example.com", phone: "+91 98200 03344", url: "",
      summary: "Corporate lawyer with five years advising on acquisitions, joint ventures and private equity investments in India.",
      location: { city: "Mumbai", countryCode: "India" },
      profiles: [{ network: "LinkedIn", url: "linkedin.com/in/kabir-mehta-example" }],
    },
    certificates: [{ name: "Enrolled as an Advocate", issuer: "Bar Council of Maharashtra and Goa", date: "2020-07" }],
    education: [
      { studyType: "LL.M.", area: "Corporate Law", institution: "National Law School of India University, Bengaluru", startDate: "2019", endDate: "2020", score: "" },
      { studyType: "B.A. LL.B. (Hons.)", area: "", institution: "Gujarat National Law University", startDate: "2014", endDate: "2019", score: "Gold medal, Company Law" },
    ],
    work: [
      { position: "Associate", name: "Shah and Rao Advocates", location: "Mumbai", startDate: "2020-08", endDate: "",
        highlights: ["Advised on 11 acquisitions with deal values from ₹40 crore to ₹2,100 crore", "Ran due diligence teams of up to 6 lawyers",
          "Drafted shareholder and investment agreements for 3 private equity funds"] },
      { position: "Law Clerk", name: "Chambers of a Judge, Bombay High Court", location: "Mumbai", startDate: "2019-06", endDate: "2020-06",
        highlights: ["Researched and drafted bench notes in 120 commercial matters"] },
    ],
    publications: [{ name: "Minority protections in Indian joint ventures", publisher: "Indian Journal of Corporate Law", releaseDate: "2022-03", summary: "" }],
    awards: [{ title: "Winner, National Corporate Law Moot", awarder: "GNLU", date: "2018-02" }],
    languages: [{ language: "English", fluency: "Fluent" }, { language: "Hindi", fluency: "Fluent" }, { language: "Gujarati", fluency: "Native" }],
  };

  const federal = {
    basics: {
      name: "Marcus Hill", label: "Management and Program Analyst, GS-0343-12", email: "marcus.hill@example.com", phone: "+1 202 555 0164", url: "",
      summary: "Program analyst with nine years in federal service and four in the U.S. Army. Plans and tracks budgets for multi-million dollar programs, writes the reports leadership acts on, and leads process improvement across offices.",
      location: { city: "Arlington", region: "VA", countryCode: "USA" },
      profiles: [],
      personal: [{ label: "Citizenship", value: "U.S. citizen" }, { label: "Veterans' preference", value: "5-point (honorably discharged, U.S. Army, 2013)" },
        { label: "Security clearance", value: "Secret, active" }, { label: "Federal status", value: "Current employee, GS-0343-12, step 4" }],
    },
    work: [
      { position: "Management and Program Analyst", name: "U.S. Department of Veterans Affairs", location: "Washington, DC", startDate: "2019-06", endDate: "",
        summary: "40 hours per week · GS-0343-12 · Supervisor: Dana Lee, (202) 555-0147, may contact",
        highlights: ["Track a $48M program budget each fiscal year; built the monthly variance report leadership uses to move funds",
          "Led a review of 3 claims offices that cut average processing time from 41 to 29 days", "Wrote 12 decision memos and briefed the Deputy Assistant Secretary on 5 of them",
          "Trained 30 staff on the new performance dashboard in Power BI"] },
      { position: "Program Support Specialist", name: "U.S. General Services Administration", location: "Washington, DC", startDate: "2015-03", endDate: "2019-05",
        summary: "40 hours per week · GS-0301-9/11 · Supervisor: Alan Ruiz, (202) 555-0133, may contact",
        highlights: ["Managed 60+ acquisition files a year from requirement to award, with no audit findings", "Built the office's first contract tracking database (Access, SharePoint)"] },
      { position: "Logistics Specialist (Sergeant)", name: "U.S. Army", location: "Fort Bragg, NC", startDate: "2009-07", endDate: "2013-07",
        summary: "40+ hours per week · E-5", highlights: ["Accounted for $6M of unit equipment with 100% inventory accuracy over 2 inspections", "Supervised 6 soldiers"] },
    ],
    education: [{ studyType: "Master of Public Administration", area: "", institution: "George Mason University", location: "Fairfax, VA", startDate: "2014", endDate: "2016" },
      { studyType: "B.A.", area: "Political Science", institution: "University of Maryland", startDate: "2005", endDate: "2009" }],
    certificates: [{ name: "Federal Acquisition Certification in Contracting (FAC-C), Level I", issuer: "Federal Acquisition Institute", date: "2017-02" },
      { name: "Lean Six Sigma Green Belt", issuer: "VA Learning University", date: "2021-09" }],
    skills: [{ name: "Analysis", keywords: ["Budget formulation", "Performance measures", "Program evaluation", "Process improvement"] },
      { name: "Tools", keywords: ["Excel", "Power BI", "SharePoint", "Access"] }],
    awards: [{ title: "Secretary's Award for Excellence", awarder: "U.S. Department of Veterans Affairs", date: "2023-11" }],
  };

  const list = { marketing, creative, content, designer, engineer, fresher, academic, nurse, lawyer, federal };
  const names = { marketing: "Marketing manager", creative: "Creative director", content: "Content creator", designer: "Designer",
    engineer: "Software engineer", fresher: "Student or fresher", academic: "Researcher", nurse: "Nurse", lawyer: "Lawyer", federal: "US federal employee" };
  window.Examples = { list, names, get: (id) => JSON.parse(JSON.stringify(list[id] || engineer)) };
})();
