import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun } from 'docx';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

const root = 'D:/dreamspex';
const logoPath = 'C:/Users/dines/AppData/Roaming/Code/agentSessionData/242f7aa0-884a-4424-8d4a-dbfe730e87a2/attachments/b5b8984d-8193-4530-b7b1-5993c22cbf00/Pasted Image.png';
const logoImage = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
const archSvgPath = path.join(root, 'dream-spex-system-architecture.svg');
const archPngPath = path.join(root, 'dream-spex-system-architecture.png');
const erSvgPath = path.join(root, 'dream-spex-database-er-diagram.svg');
const erPngPath = path.join(root, 'dream-spex-database-er-diagram.png');

const ensureExists = (filePath) => fs.existsSync(filePath);

async function convertSvgToPng(svgPath, pngPath) {
  if (ensureExists(pngPath)) return;
  await sharp(svgPath).png().toFile(pngPath);
}

function makeHeading(text, level = 1) {
  const lvl = level === 1 ? HeadingLevel.TITLE : level === 2 ? HeadingLevel.HEADING_1 : level === 3 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  return new Paragraph({
    heading: lvl,
    children: [new TextRun({ text, bold: true, size: level === 1 ? 28 : 22 })],
    spacing: { before: 180, after: 120 }
  });
}

function makePara(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: options.size || 22, bold: options.bold || false, color: options.color || '000000' })],
    spacing: { before: options.before || 0, after: options.after || 120 },
    alignment: options.align || AlignmentType.left,
  });
}

function makeBulletList(items) {
  return items.map((item) => new Paragraph({
    text: item,
    bullet: { level: 0 },
    spacing: { after: 80 }
  }));
}

function makeTable(rows, widths) {
  const tableRows = rows.map((r) => new TableRow({ children: r.map((cellText, idx) => new TableCell({
    children: [new Paragraph({ text: String(cellText), spacing: { after: 40 } })],
    width: { size: widths[idx], type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'B7C8D9' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'B7C8D9' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'B7C8D9' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'B7C8D9' }
    }
  })) }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    layout: 'fixed'
  });
}

function makeStatusTable() {
  return makeTable(
    [
      ['Component / Area', 'Status', 'Notes'],
      ['Customer storefront (frontend)', 'Completed', 'React + TypeScript storefront and customer flows implemented in project codebase.'],
      ['Admin dashboard', 'In Progress', 'Admin pages are present and evolving; exact production status varies by module.'],
      ['Franchise management', 'In Progress', 'Franchise flows, store locator, and admin workflows are implemented in source and project chats.'],
      ['Authentication / JWT / RBAC', 'Completed', 'Spring Security, JWT, OTP, and role-based access flow documented in backend architecture and code.'],
      ['Prescription upload + OCR', 'In Progress', 'Prescription workflow and OCR-related APIs exist; some runtime validation remains TBD.'],
      ['Payment gateway (Razorpay)', 'Completed', 'Razorpay integration exists in backend API layer and payment controller.'],
      ['Store Locator', 'Completed', 'Location display and franchise store support are implemented.'],
      ['Vercel frontend hosting', 'Completed', 'Current production frontend hosting is Vercel.'],
      ['Hostinger VPS frontend migration', 'Planned', 'Future frontend hosting on Hostinger VPS is planned and not yet completed.'],
      ['End-to-end production verification', 'Not Verified', 'Full deployment validation not confirmed in the reviewed project records.']
    ],
    [18, 18, 64]
  );
}

function makeRequirementsMatrix() {
  const rows = [
    ['ID', 'Requirement', 'Module', 'Status', 'Source / Evidence'],
    ['FR-001', 'Customer registration and login', 'Customer authentication', 'Completed', 'Auth service + API mapping docs'],
    ['FR-002', 'OTP verification and reset flow', 'Authentication', 'Completed', 'Auth architecture docs + code'],
    ['FR-003', 'Customer profile management', 'Customer account', 'Completed', 'Backend APIs and frontend customer profile flows'],
    ['FR-004', 'Product listing and search', 'Catalog', 'Completed', 'Catalog APIs and storefront pages'],
    ['FR-005', 'Store Locator and franchise listings', 'Business module', 'Completed', 'Store Locator feature and franchise store API'],
    ['FR-006', 'Cart and wishlist operations', 'Shopping', 'Completed', 'Shopping controller endpoints'],
    ['FR-007', 'Checkout and order creation', 'Order management', 'Completed', 'Order and payment APIs'],
    ['FR-008', 'Razorpay integration', 'Payments', 'Completed', 'Payment controller and webhook flow'],
    ['FR-009', 'Returns and refunds management', 'After-sales', 'Completed', 'Return controller and admin return controller'],
    ['FR-010', 'Virtual Try-On feature', 'Advanced eyewear', 'In Progress', 'Front-end and business modules present, runtime status TBD'],
    ['FR-011', 'Prescription upload + OCR', 'Advanced eyewear', 'In Progress', 'Prescription APIs and OCR endpoints exist'],
    ['FR-012', 'Lens management and recommendations', 'Advanced eyewear', 'In Progress', 'Lens features in backend docs and admin module'],
    ['FR-013', 'Membership plans', 'Business module', 'Completed', 'Membership plan tables and APIs'],
    ['FR-014', 'Coupons and offers', 'Business module', 'Completed', 'Coupon endpoints and offers API'],
    ['FR-015', 'Franchise application management', 'Franchise operations', 'Completed', 'Franchise application backend/frontend features'],
    ['FR-016', 'Admin dashboard and analytics', 'Admin', 'In Progress', 'Admin modules implemented in codebase'],
    ['FR-017', 'Excel / PDF export support', 'Admin reporting', 'In Progress', 'Admin reporting + export features exist'],
    ['FR-018', 'Notifications and OTP communication', 'Communication', 'Completed', 'SMS notifications + email OTP architecture']
  ];

  return makeTable(rows, [10, 28, 18, 15, 29]);
}

function makeUseCaseTable() {
  return makeTable(
    [
      ['Use Case ID', 'Actor', 'Preconditions', 'Steps', 'Expected Outcome'],
      ['UC-01', 'Customer', 'User is not registered', '1. Register account 2. Verify OTP 3. Log in', 'Account becomes active and can browse and buy products.'],
      ['UC-02', 'Customer', 'Customer is logged in and has items in cart', '1. Select product 2. Add to cart 3. Checkout 4. Pay', 'Order created, payment recorded, and order history is updated.'],
      ['UC-03', 'Customer', 'Customer has uploaded prescription or wants to add lens configuration', '1. Upload prescription 2. Validate OCR or manual entry 3. Review OD/OS values', 'Prescription is verified or returned for correction before checkout.'],
      ['UC-04', 'Super Admin', 'Admin is authenticated', '1. View dashboard 2. Manage products and orders 3. Update roles/statuses', 'Administrative actions are applied and logged.'],
      ['UC-05', 'Customer', 'Customer is browsing stores', '1. Open Store Locator 2. Search by city/postal code 3. Review info', 'Relevant active stores are displayed with status, hours, and contact details.'],
      ['UC-06', 'Customer', 'Order delivered and eligible for review', '1. Access order 2. Submit product review 3. Await moderation', 'Customer feedback is stored and can be moderated by admin.']
    ],
    [12, 12, 18, 25, 33]
  );
}

const functionalReqs = [
  'FR-001: User registration and login',
  'FR-002: OTP verification and password reset',
  'FR-003: Customer profile and address management',
  'FR-004: Product browsing, categories, filters, and product details',
  'FR-005: Reviews and ratings based on verified purchases',
  'FR-006: Cart, wishlist and coupon handling',
  'FR-007: Checkout and order creation',
  'FR-008: Payment intent verification through Razorpay',
  'FR-009: Order tracking, refund and return process',
  'FR-010: Virtual Try-On and lens selection flow',
  'FR-011: Prescription upload, OCR and validation',
  'FR-012: Membership plans and loyalty features',
  'FR-013: Store Locator and franchise operations',
  'FR-014: Admin operations for catalog, users and orders',
  'FR-015: Reports, exports and admin analytics',
  'FR-016: Notification and OTP communication'
];

const nfrs = [
  'NFR-001: Response time for catalog and storefront queries should remain acceptable under normal concurrent traffic.',
  'NFR-002: The system shall support horizontal scaling of the frontend and backend layers.',
  'NFR-003: JWT, session tokens, OTPs and payment values must be protected with secure handling.',
  'NFR-004: Role-based access control must be enforced at the service and controller level.',
  'NFR-005: Customer data shall be protected and only processed for required use cases.',
  'NFR-006: Order, payment and return workflows must be resilient to failure and auditable.',
  'NFR-007: The application shall remain responsive on desktop and mobile devices.',
  'NFR-008: Backup and restore procedures must cover persistent storage and database state.',
  'NFR-009: Critical production configuration must use environment variables and secrets management.'
];

const getImageDataIfExists = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath) : null);

const sectionContent = [
  {
    title: '1. Introduction',
    body: [
      makePara('Dream Spex is a luxury eyewear e-commerce platform designed to support customer browsing, product discovery, prescription-based eyewear selection, cart and payments, store locator, franchise operations, and admin monitoring. The system combines a modern React storefront with a Java 21 Spring Boot backend and a MySQL/MariaDB data layer. Existing project documentation and source code indicate the platform is implemented across customer, franchise, and super-admin roles.'),
      makePara('The purpose of this SRS is to define the implemented and planned functional and non-functional requirements for the platform to support technical handover, future development, client review, and production readiness assessment.'),
      makePara('This document is based on the reviewed project artifacts, including backend architecture notes, API mapping files, database design documents, source code controllers, and project chat history. Where a detail is not available or not yet verified, the document marks it as TBD.'),
      makeHeading('1.1 Project Objectives', 3),
      makeBulletList([
        'Provide a premium digital storefront for luxury eyewear sales.',
        'Support customer account workflows, purchases, order tracking, and after-sales support.',
        'Support prescription workflows including upload, OCR, verification, and lens recommendation.',
        'Provide admin and franchise views for operations, reporting, and management.',
        'Integrate with payment and communication services while preserving data security.'
      ]),
      makeHeading('1.2 Scope', 3),
      makeBulletList([
        'Customer-facing storefront for browsing, searching, cart, checkout, ordering, reviews, payments, and returns.',
        'Franchise management and store locator features for location-based sales and operations.',
        'Prescription management for optical requirements and lens recommendations.',
        'Admin functionality covering catalog, orders, membership, reports, exports, and approvals.',
        'Current production environment described in project docs includes Vercel frontend hosting and Hostinger VPS backend deployment.'
      ])
    ]
  },
  {
    title: '2. Overall System Description',
    body: [
      makePara('The Dream Spex platform is a multi-role e-commerce system with customer, franchise admin, and super-admin responsibilities. The frontend is developed in React.js, TypeScript, and Tailwind CSS using Vite. The backend is Java 21 with Spring Boot 3.4.4 and Spring Security, using JWT-based authentication and role-based authorization. Data persisted in MySQL/MariaDB is accessed through Spring Data JPA/Hibernate.'),
      makeHeading('2.1 Product Perspective', 3),
      makePara('The platform is designed as a modular, service-oriented web application that supports luxury retail and optical workflows. It is not a generic storefront only; it includes advanced eyewear-specific requirements such as prescriptions, lens recommendations, virtual try-on, franchise operations, and customer support workflows.'),
      makeHeading('2.2 Current Deployment Architecture', 3),
      makeBulletList([
        'Frontend: Vercel hosting for current production frontend domains dreamspex.in and www.dreamspex.in.',
        'Backend: Hostinger VPS deployment of the Spring Boot container on port 8082.',
        'Runtime containerization: Docker.',
        'Persistent storage: /opt/dreamspex/storage.',
        'Environment variables managed through .env configuration.',
        'API hostname: api-dreamspex-test.rabbitsoftsolutions.com.',
        'Database: existing MySQL database.'
      ]),
      makeHeading('2.3 Planned Deployment Architecture', 3),
      makeBulletList([
        'React frontend hosted on Hostinger VPS.',
        'Java Spring Boot backend hosted on the same VPS.',
        'OpenLiteSpeed web server for external routing.',
        'HTTPS / SSL enabled for custom domain traffic.',
        'Ongoing use of existing MySQL database and persistent storage.',
        'This future architecture is planned and not yet presented as completed in the source documentation.'
      ]),
      makeHeading('2.4 User Categories and Roles', 3),
      makeTable([
        ['Role', 'Description', 'Typical Permissions'],
        ['CUSTOMER', 'End user; shops online, manages profile, places orders', 'Profile, checkout, payments, returns, reviews, notifications'],
        ['FRANCHISE_ADMIN', 'Franchise-level operator', 'Assigned franchise inventory, order visibility, store operations, local reports'],
        ['SUPER_ADMIN', 'Platform administrator', 'Catalog, users, orders, reports, configuration and global approvals'],
        ['Anonymous visitor', 'Public website user', 'Browse categories, product discovery, public store locator and generic informational pages']
      ], [25, 30, 45]),
      makeHeading('2.5 Technology Stack', 3),
      makeTable([
        ['Layer', 'Technology'],
        ['Frontend', 'React.js, TypeScript, Tailwind CSS, Vite'],
        ['Backend', 'Java 21, Spring Boot 3.4.4, Spring Security, JWT, Spring Data JPA, Hibernate, Maven'],
        ['Database', 'MySQL / MariaDB'],
        ['Deployment', 'Docker, Hostinger VPS, OpenLiteSpeed (planned), Vercel (current)'],
        ['External services', 'Razorpay, email/OTP, OCR, location services'],
        ['Build/Dev environment', 'Vite, Maven'],
        ['Persistence approach', 'Relational DB; object storage for large files where applicable']
      ], [25, 75]),
      makeHeading('2.6 System Constraints and Assumptions', 3),
      makeBulletList([
        'The platform relies on a relational database with secure persistence and data validation.',
        'Core product and identity APIs are implemented in Spring Boot and documented in project source files.',
        'Frontend and backend must integrate through HTTPS APIs with correct CORS configuration and role enforcement.',
        'Production runtime secrets and credentials are expected to be handled through environment variables and secret management.',
        'Some planned future features remain TBD until formal implementation or production validation is completed.'
      ])
    ]
  },
  {
    title: '3. Functional Requirements',
    body: [
      makePara('The following functional requirements are based on the code and technical documentation reviewed. Each requirement has a unique identifier. Requirements in this document include implemented, in-progress, planned and not-verified items where relevant; however, no invented features are introduced.'),
      makeHeading('3.1 Customer Modules', 3),
      makeTable([
        ['ID', 'Requirement', 'Description', 'Status'],
        ['FR-001', 'Customer registration and login', 'Customers can register, verify contact information, log in and access their account.', 'Completed'],
        ['FR-002', 'OTP verification', 'OTP-based verification and password reset flow supports secure identity validation.', 'Completed'],
        ['FR-003', 'Forgot password', 'Generic password reset flow is used to avoid account enumeration.', 'Completed'],
        ['FR-004', 'Customer profile management', 'Customers can manage profile details and delivery addresses.', 'Completed'],
        ['FR-005', 'Product browsing and search', 'Customers can browse products, search and filter by attributes.', 'Completed'],
        ['FR-006', 'Categories and filters', 'Product categories and attribute filtering are supported for browsing.', 'Completed'],
        ['FR-007', 'Product details', 'Product detail pages expose price, specifications, image data and stock information.', 'Completed'],
        ['FR-008', 'Product reviews and ratings', 'Verified reviews are supported with moderation and admin review.', 'Completed'],
        ['FR-009', 'Shopping cart', 'Customers can add, remove and update cart items.', 'Completed'],
        ['FR-010', 'Checkout', 'Checkout creates orders with server-side calculation and validation.', 'Completed'],
        ['FR-011', 'Payment integration', 'Razorpay payment intent creation and verification are implemented.', 'Completed'],
        ['FR-012', 'Order history and tracking', 'Customers can view order details and order status history.', 'Completed'],
        ['FR-013', 'Returns and refunds', 'Customers can submit return or refund requests and track outcomes.', 'Completed']
      ], [10, 28, 32, 15]),
      makeHeading('3.2 Advanced Eyewear Modules', 3),
      makeTable([
        ['ID', 'Requirement', 'Description', 'Status'],
        ['FR-014', 'Virtual Try-On', 'Customers can try eyewear virtually in supported storefront flows.', 'In Progress'],
        ['FR-015', 'Camera and image upload', 'Product or face image capture may be used by virtual try-on workflows.', 'In Progress'],
        ['FR-016', 'Prescription upload', 'Customers can upload a prescription document or provide values.', 'In Progress'],
        ['FR-017', 'Prescription OCR', 'OCR-driven prescription extraction is planned/applied where supported by implementation.', 'In Progress'],
        ['FR-018', 'OD and OS extraction', 'Right and left eye prescription values are processed for lens configuration.', 'In Progress'],
        ['FR-019', 'Pupillary Distance calculation', 'PD values are part of prescription configuration and lens recommendation workflows.', 'In Progress'],
        ['FR-020', 'Prescription review and confirmation', 'Users can review extracted values before confirming lens purchase.', 'In Progress'],
        ['FR-021', 'Lens recommendations', 'System supports prescription and lens recommendation logic.', 'In Progress'],
        ['FR-022', 'Lens selection and customization', 'Customers can choose lens configuration and variants in checkout.', 'Completed']
      ], [10, 30, 30, 15]),
      makeHeading('3.3 Business Modules', 3),
      makeTable([
        ['ID', 'Requirement', 'Description', 'Status'],
        ['FR-023', 'Membership plans', 'Silver, Gold and Platinum plans are part of business rules and database schema.', 'Completed'],
        ['FR-024', 'Coupons and offers', 'Coupons and promotion management are available for carts and public offers.', 'Completed'],
        ['FR-025', 'Rewards and referrals', 'Loyalty and referral functionality is present in backend design.', 'Completed'],
        ['FR-026', 'Store Locator', 'Active franchise store details are displayed through locator functionality.', 'Completed'],
        ['FR-027', 'Franchise management', 'Franchise-level storefront management and application flows exist.', 'Completed'],
        ['FR-028', 'After-sales support', 'Returns and support flows are part of order lifecycle management.', 'Completed'],
        ['FR-029', 'Notifications and communication', 'OTP, email and SMS events support transactional communication.', 'Completed']
      ], [10, 33, 24, 15]),
      makeHeading('3.4 Admin Modules', 3),
      makeTable([
        ['ID', 'Requirement', 'Description', 'Status'],
        ['FR-030', 'Admin authentication', 'Admin and franchise users authenticate via secure portal flows.', 'Completed'],
        ['FR-031', 'Dashboard', 'Admin dashboard provides operational overview and management views.', 'In Progress'],
        ['FR-032', 'Product management', 'Admin can manage product and pricing data.', 'Completed'],
        ['FR-033', 'Product image management', 'Product images and related metadata are managed in catalog workflows.', 'Completed'],
        ['FR-034', 'Category management', 'Categories and placement management are supported.', 'Completed'],
        ['FR-035', 'User management', 'Admin manages user and franchise-role related records.', 'Completed'],
        ['FR-036', 'Lens management', 'Lens configuration and management are available in admin flows.', 'In Progress'],
        ['FR-037', 'Order management', 'Admins can review and manage order statuses.', 'Completed'],
        ['FR-038', 'Membership management', 'Membership plans and membership records are managed by admin.', 'Completed'],
        ['FR-039', 'Returns and refunds management', 'Admin handles return and refund tasks, evidence, and resolutions.', 'Completed'],
        ['FR-040', 'Reports and analytics', 'Reports and analytics modules are part of admin architecture.', 'In Progress'],
        ['FR-041', 'Excel / PDF / print exports', 'Admin can export reporting data to Excel and PDF in supported modules.', 'In Progress'],
        ['FR-042', 'Customer-wise order history', 'Admin can query customer-centric order data.', 'Completed'],
        ['FR-043', 'Franchise management', 'Fraanchise records and applications are managed by admin role.', 'Completed']
      ], [10, 32, 24, 15])
    ]
  },
  {
    title: '4. External Interface Requirements',
    body: [
      makePara('The platform interacts with browsers, payment services, notification providers, OCR services, and location services. The system is designed to secure these integrations via HTTPS, server-side validation, and environment-based secrets.'),
      makeHeading('4.1 User Interface Requirements', 3),
      makeBulletList([
        'Responsive storefront and admin interfaces must support desktop, tablet and mobile widths.',
        'Customer flows should remain simple and premium in design.',
        'Admin interfaces should provide clear operational controls and reporting.',
        'Store Locator and franchise listing pages should include status, address and opening hours fields.'
      ]),
      makeHeading('4.2 Hardware Interfaces', 3),
      makeBulletList([
        'User devices: desktop, laptop, tablet, mobile browser.',
        'Camera access for virtual try-on or photograph-based workflows.',
        'File upload capability for prescriptions and supporting documents.'
      ]),
      makeHeading('4.3 Software Interfaces', 3),
      makeBulletList([
        'Frontend integration through React client to backend REST APIs.',
        'MySQL/MariaDB access through Spring Data JPA / Hibernate.',
        'Docker runtime for Spring Boot backend and environment-based configuration.'
      ]),
      makeHeading('4.4 API Interfaces', 3),
      makeBulletList([
        'Authentication APIs under /api/v1/auth form the initial integration contract.',
        'Catalog and product APIs expose search, category and product detail functions.',
        'Customer and order APIs cover cart, checkout, order tracking, payment, and returns.',
        'Admin APIs support franchise operations, reports, product management and return approvals.',
        'Actual endpoints are sourced from project backend controllers and API mapping documents.'
      ]),
      makeHeading('4.5 Payment and Communication Services', 3),
      makeBulletList([
        'Razorpay payment gateway integration is implemented for order payment creation and verification.',
        'Email and OTP services support customer verification and security workflows.',
        'SMS notification support is implemented through transaction-based event outbox patterns.',
        'OCR and camera-driven workflows are included in architecture but their final external provider integration level remains an implementation variable.'
      ])
    ]
  },
  {
    title: '5. Non-Functional Requirements',
    body: [
      makeHeading('5.1 Performance', 2),
      makeBulletList(['Catalog pages and product search should respond quickly under typical storefront traffic.', 'Order and payment workflows must avoid processing delay caused by repeated calls or duplicate submissions.', 'Image and file upload flows should validate size and content before processing.']),
      makeHeading('5.2 Scalability', 2),
      makeBulletList(['Frontend and backend layers should support independent horizontal scaling.', 'Database and file storage follows a persistent-service architecture.', 'Future deployment architecture plans for Hostinger VPS and OpenLiteSpeed should support increased traffic while preserving current domains.']),
      makeHeading('5.3 Security', 2),
      makeBulletList(['Spring Security + JWT + RBAC enforce access control.', 'Sensitive API and payment flows are protected by validation, signatures, and server-side authorization checks.', 'OTP reset is designed to avoid account enumeration.', 'No secrets should be stored in frontend or committed configuration.']),
      makeHeading('5.4 Reliability and Availability', 2),
      makeBulletList(['Server-side validation and transaction handling should prevent duplicate or inconsistent order/payment states.', 'Delivery and return batch processes should maintain status history and audit integrity.', 'Persistent storage and database backups are required for continuity.']),
      makeHeading('5.5 Maintainability and Usability', 2),
      makeBulletList(['System modules are separated by domain responsibilities for easier maintenance.', 'Responsive design is required for customer storefront browsing and admin operational management.', 'Operational logs, audit events and clear error handling are required for supportability.'])
    ]
  },
  {
    title: '6. System Architecture',
    body: [
      makePara('The architecture follows a three-tier web application pattern: frontend, API backend and relational database, with external integrations for payments, notifications and OCR. The system distinguishes current and planned deployment topology and keeps future hosting migration separate from implemented production behavior.'),
      makePara('Figure 6.1: Dream Spex system architecture overview (embedded below).'),
      makePara(''),
      ...(getImageDataIfExists(archPngPath) ? [new Paragraph({
        children: [
          new ImageRun({
            data: getImageDataIfExists(archPngPath),
            transformation: { width: 780, height: 470 },
          })
        ],
        spacing: { before: 100, after: 200 }
      })] : []),
      makeHeading('6.1 Frontend Architecture', 3),
      makeBulletList([
        'Customer website served from React + TypeScript + Vite with Tailwind CSS.',
        'Admin and franchise sections follow role-based routing and access checks.',
        'Current deployment uses Vercel while future deployment targets Hostinger VPS.'
      ]),
      makeHeading('6.2 Backend Architecture', 3),
      makeBulletList([
        'Spring Boot application exposes REST endpoints organized by domain modules.',
        'Authentication, catalog, cart, shipping, payments, membership, return management and admin flows are separated by controller or service group.',
        'Spring Security and JWT protect API access; business rules validate roles and tenant scope.'
      ]),
      makeHeading('6.3 Database Architecture', 3),
      makeBulletList([
        'MySQL/MariaDB is the source of truth for application data.',
        'Entities include users, roles, products, categories, inventory, orders, payments, returns, franchises, stores, memberships and notifications.',
        'Files such as prescriptions and binaries are expected to be stored using object storage or dedicated storage services rather than BLOB fields in database tables.'
      ])
    ]
  },
  {
    title: '7. Database Design',
    body: [
      makePara('The database design includes core ecommerce tables such as users, roles, products, categories, orders, payments, inventory, addresses, prescriptions, storefront stores, franchise applications and notifications. The schema supports soft-delete semantics, order history, franchise ownership and role-based enforcement. This design is documented in project backend database design files.'),
      makePara('Figure 7.1: Entity relationship overview (embedded below).'),
      ...(getImageDataIfExists(erPngPath) ? [new Paragraph({
        children: [
          new ImageRun({
            data: getImageDataIfExists(erPngPath),
            transformation: { width: 760, height: 430 },
          })
        ],
        spacing: { before: 100, after: 220 }
      })] : []),
      makeHeading('7.1 Core Database Entities', 3),
      makeTable([
        ['Entity', 'Purpose', 'Key Notes'],
        ['users', 'Identity and authentication', 'Includes status, verification, login details and role assignments'],
        ['roles / user_roles', 'Authorization', 'Role-based access control and permission scoping'],
        ['franchises / user_franchises', 'Franchise ownership and tenant scope', 'Backs franchise admin operations'],
        ['products / product_variants', 'Catalog and stock', 'Supports pricing, variants and inventory'],
        ['orders / order_items / payments', 'Transaction lifecycle', 'Tracks checkout and order fulfillment'],
        ['prescriptions', 'Optical requirements', 'Supports upload, OCR and lens recommendation flows'],
        ['stores / franchise_applications', 'Location and business pipeline', 'Public store locator and franchise applications'],
        ['notifications', 'Customer communication', 'Supports transactional SMS and email notifications']
      ], [22, 40, 38])
    ]
  },
  {
    title: '8. API Documentation',
    body: [
      makePara('The project includes a REST API architecture with authenticated and public endpoints. Actual endpoint names identified from backend controller classes and backend API mapping documentation include /api/v1/auth, /api/v1/products, /api/v1/cart, /api/v1/payments, /api/v1/orders, /api/v1/prescriptions, /api/v1/memberships, /api/v1/stores, /api/v1/franchises, /api/v1/admin, and related /api/v1/returns and /api/v1/me endpoints.'),
      makeHeading('8.1 Public Authentication APIs', 3),
      makeTable([
        ['Endpoint', 'Purpose', 'Notes'],
        ['POST /api/v1/auth/register', 'User registration', 'Validation and OTP-based verification'],
        ['POST /api/v1/auth/login', 'Customer login', 'User/password authentication'],
        ['POST /api/v1/auth/verify-otp', 'OTP verification', 'Validates challenge and expiry'],
        ['POST /api/v1/auth/forgot-password', 'Password reset request', 'Generic response to reduce enumeration risk'],
        ['POST /api/v1/auth/reset-password', 'Reset credential state', 'One-time challenge and password policy enforcement'],
        ['POST /api/v1/auth/refresh', 'Refresh JWT', 'Rotating token strategy'],
        ['POST /api/v1/auth/logout', 'Revoke refresh tokens', 'Token family invalidation']
      ], [22, 30, 24]),
      makeHeading('8.2 Core Product and Order APIs', 3),
      makeTable([
        ['Endpoint', 'Purpose', 'Notes'],
        ['GET /api/v1/products', 'Product listing', 'Public product discovery and search'],
        ['GET /api/v1/products/{id}', 'Detail view', 'Product detail data'],
        ['GET /api/v1/categories', 'Category listing', 'Catalog tree and categories'],
        ['GET /api/v1/cart', 'Cart details', 'Customer or anonymous cart support'],
        ['POST /api/v1/cart/items', 'Add to cart', 'Variant plus optional prescription and lens configuration'],
        ['POST /api/v1/orders', 'Create order', 'Server-authoritative calculation and stock reservation'],
        ['GET /api/v1/orders', 'Order history', 'Customer and scoped admin access'],
        ['POST /api/v1/payments/orders/{orderId}/intent', 'Payment intent', 'Razorpay intent creation']
      ], [22, 30, 24])
    ]
  },
  {
    title: '9. Business Rules',
    body: [
      makePara('Business rules are extracted from the database design and backend API mapping documents, and should be enforced in the domain service layer and validation layer.'),
      makeTable([
        ['Rule Category', 'Rule', 'Status'],
        ['Pricing', 'Monetary values use DECIMAL(12,2); floating point is not acceptable for money.', 'Completed'],
        ['Inventory', 'Stock availability is checked before order creation and cart updates.', 'Completed'],
        ['Coupon validation', 'Coupon validity, dates, subtotal thresholds, user limits and discount logic must be enforced server-side.', 'Completed'],
        ['Membership', 'Silver, Gold and Platinum memberships are supported through membership_plan and membership tables.', 'Completed'],
        ['Prescription processing', 'Prescription values, OD/OS, PD and lens options must be validated before order commitment.', 'In Progress'],
        ['Order status', 'Orders follow lifecycle transitions such as PENDING_PAYMENT, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, and return states.', 'Completed'],
        ['Payments', 'Payment status must remain distinct from order status and must be verified before fulfillment is completed.', 'Completed'],
        ['Refunds', 'Returns and refund policies are enforced using return request and admin approval workflows.', 'Completed'],
        ['Permissions', 'Role and franchise-scoped access checks prevent unauthorized cross-tenant operations.', 'Completed']
      ], [22, 44, 16])
    ]
  },
  {
    title: '10. Testing Requirements',
    body: [
      makePara('The project contains targeted unit and integration tests, including authentication, admin, franchise, store locator and service validation. The requirement below outlines the testing strategy and expected evidence.'),
      makeHeading('10.1 Testing Strategy', 3),
      makeTable([
        ['Test Type', 'Scope', 'Status'],
        ['Unit testing', 'Service logic, validation logic and business rules', 'Completed in selected modules'],
        ['Integration testing', 'Authentication, admin, franchise and API workflows', 'Completed in selected modules'],
        ['API testing', 'REST endpoints and authentication flows', 'Completed in selected modules'],
        ['UI testing', 'Customer storefront and admin page behaviors', 'In Progress'],
        ['Security testing', 'JWT, RBAC, OTP and password reset validation', 'Completed in selected modules'],
        ['Payment testing', 'Razorpay verification and webhook handling', 'Completed in selected modules'],
        ['Performance testing', 'To be defined at production scale', 'Planned'],
        ['UAT', 'Business validation by client stakeholders', 'Planned']
      ], [20, 30, 20]),
      makeHeading('10.2 Test Scenarios', 3),
      makeTable([
        ['Scenario', 'Expected Result', 'Status'],
        ['Register with valid email and password', 'Account is created and OTP challenge issued', 'Completed'],
        ['Login with invalid credentials', 'Authentication fails without account enumeration risk', 'Completed'],
        ['Reset password flow', 'One-time reset challenge works and invalidates old sessions', 'Completed'],
        ['Checkout with unavailable stock', 'Order creation fails or revalidates stock before order submission', 'Completed'],
        ['Admin manage franchise application', 'Approved or rejected statuses update correctly with audit trail', 'Completed'],
        ['Store Locator opening hours', 'Correct parser normalizes stored values and displays clear fallback states', 'Completed']
      ], [28, 36, 16]),
      makeHeading('10.3 Module-wise Testing Checklist', 3),
      makeTable([
        ['Module', 'Checklist Item', 'Status'],
        ['Authentication', 'Registration, OTP, login, refresh, logout, forgot password', 'Completed'],
        ['Catalog', 'Category listing, product list, filters, detail pages', 'Completed'],
        ['Cart and checkout', 'Cart add/update/remove, coupon validation, order creation', 'Completed'],
        ['Payments', 'Razorpay intent creation, verification and webhook processing', 'Completed'],
        ['Prescription and lens', 'Prescription upload, manual entry, OCR and lens selection', 'In Progress'],
        ['Franchise and stores', 'Store Locator, administrative status management, franchise applications', 'Completed'],
        ['Returns and refunds', 'Eligibility, evidence, approval and refund flow', 'Completed'],
        ['Admin reporting', 'Dashboard, exports, analytics and reporting modules', 'In Progress']
      ], [22, 40, 16])
    ]
  },
  {
    title: '11. Deployment and Maintenance',
    body: [
      makePara('Dream Spex is deployed through a layered infrastructure pattern combining Vercel for current frontend hosting, Hostinger VPS for the Java backend, Docker runtime, database services and persistent storage. The architecture includes environment-driven configuration and secure deployment boundaries. Future migration is planned, but source documentation clearly distinguishes it as not yet completed.'),
      makeTable([
        ['Component', 'Current Status', 'Details'],
        ['Frontend hosting', 'Current', 'Vercel hosts the React frontend with domain names dreamspex.in and www.dreamspex.in'],
        ['Backend hosting', 'Current', 'Hostinger VPS hosts Dockerized Spring Boot backend on port 8082'],
        ['Runtime', 'Current', 'Docker containerized backend and environment-based configuration'],
        ['Storage', 'Current', 'Persistent folder mounted at /opt/dreamspex/storage'],
        ['Database', 'Current', 'Existing MySQL database'],
        ['API host', 'Current', 'api-dreamspex-test.rabbitsoftsolutions.com'],
        ['Frontend migration', 'Planned', 'Front-end hosting to be moved to Hostinger VPS with OpenLiteSpeed, HTTPS and custom routing'],
        ['SSL and routing', 'Planned for future deployment', 'HTTPS and routing not yet presented as a completed production migration']
      ], [18, 18, 64])
    ]
  },
  {
    title: '12. Future Enhancements',
    body: [
      makePara('The following are proposed future enhancements and should remain separate from current implemented features.'),
      makeBulletList([
        'Completion of all prescription and OCR validations in production-grade operating conditions.',
        'Further optimization of the performance and scalability of admin reporting modules.',
        'Full production verification of end-to-end HTTPS and same-VPS hosting migration.',
        'Expanded automation for analytics, predictive inventory and promotional optimization.',
        'Additional accessibility and localization improvements for a global luxury retail audience.',
        'Broader multi-region deployment or edge-based improvements for storefront resiliency.'
      ])
    ]
  },
  {
    title: '13. Appendices',
    body: [
      makeHeading('13.1 Glossary', 3),
      makeTable([
        ['Term', 'Definition'],
        ['JWT', 'JSON Web Token used for authentication'],
        ['RBAC', 'Role-based access control'],
        ['OCR', 'Optical Character Recognition'],
        ['PD', 'Pupillary Distance'],
        ['OD', 'Right eye prescription value'],
        ['OS', 'Left eye prescription value'],
        ['TBD', 'To Be Determined']
      ], [25, 75]),
      makeHeading('13.2 Technical References', 3),
      makeBulletList([
        'Dream Spex backend architecture documents: BACKEND_AUTH_ARCHITECTURE.md, BACKEND_API_MAPPING.md, BACKEND_DATABASE_DESIGN.md',
        'Backend source code: Java controllers, service classes, security configuration, DTOs and test suite',
        'Frontend source code: React storefront, admin pages, route configuration and service integration',
        'Current reviewed project chat history and implementation notes'
      ]),
      makeHeading('13.3 Revision History', 3),
      makeTable([
        ['Version', 'Date', 'Author', 'Description'],
        ['1.1', '16 November 2026', 'Senior Software Architect / Business Analyst', 'Revised version including completed sections, updated deployment architecture, actual database and API documentation, traceability updates, and corrected requirement IDs.'],
        ['1.0', '16 November 2026', 'Senior Software Architect / Business Analyst', 'Initial SRS release based on available project artifacts and technical implementation state']
      ], [18, 18, 26, 38])
    ]
  }
];

async function buildDocx() {
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: { size: 34, bold: true, color: '1F2E48' },
          paragraph: { spacing: { after: 200 } }
        }
      ]
    },
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children: [
          ...(logoImage ? [new Paragraph({
            children: [
              new ImageRun({
                data: logoImage,
                transformation: { width: 760, height: 120 },
              })
            ],
            alignment: AlignmentType.center,
            spacing: { after: 140 }
          })] : []),
          new Paragraph({
            children: [
              new TextRun({ text: 'DREAM SPEX – SOFTWARE REQUIREMENTS SPECIFICATION', bold: true, size: 32, color: '0F274E' })
            ],
            alignment: AlignmentType.center,
            spacing: { after: 10 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Version 1.1 | Documentation date: 16 November 2026', bold: true, size: 20, color: '3A4D63' })
            ],
            alignment: AlignmentType.center,
            spacing: { after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Prepared for technical documentation, client review and project handover.', italic: true, size: 18, color: '4D5F76' })
            ],
            alignment: AlignmentType.center,
            spacing: { after: 120 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Document Control', bold: true, size: 20, color: '12315A' })
            ],
            spacing: { before: 100, after: 40 }
          }),
          makeTable([
            ['Item', 'Detail'],
            ['Document Title', 'DREAM SPEX – SOFTWARE REQUIREMENTS SPECIFICATION'],
            ['Version', '1.1'],
            ['Documentation Date', '16 November 2026'],
            ['Project Type', 'Luxury Eyewear E-Commerce Platform'],
            ['Technology', 'React.js + TypeScript + Vite + Java 21 + Spring Boot 3.4.4 + MySQL / MariaDB'],
            ['Status', 'Completed, In Progress, Planned, Not Verified (as noted in this document)']
          ], [30, 70]),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          ...sectionContent.flatMap((section) => [
            makeHeading(section.title, 2),
            ...section.body
          ]),
          makeHeading('Traceability Matrix', 2),
          makeRequirementsMatrix(),
          makeHeading('Use Cases Summary', 2),
          makeUseCaseTable(),
          makeHeading('Requirements Summary', 2),
          makePara('Functional requirements: ' + functionalReqs.join('; '), { size: 18 }),
          makePara('Non-functional requirements: ' + nfrs.join('; '), { size: 18 }),
          makeHeading('Implementation Status Summary', 2),
          makeStatusTable(),
          makeHeading('Appendix: Module-wise Testing Checklist', 2),
          makeTable([
            ['Module', 'Checklist', 'Status'],
            ['Authentication', 'Registration, OTP verification, forgot password, refresh/logout', 'Completed'],
            ['Catalog', 'Browse products, search and review product detail flows', 'Completed'],
            ['Membership / loyalty', 'Membership plans, offers and rewards', 'Completed'],
            ['Checkout / Payments', 'Cart, coupon, order and Razorpay validation', 'Completed'],
            ['Franchise / store locator', 'Public locator, franchise application and admin management', 'Completed'],
            ['Returns and refunds', 'Return requests, evidence approval and refund processing', 'Completed'],
            ['Admin reporting', 'Dashboard, reports, exports and analytics', 'In Progress'],
            ['Prescription and OCR', 'Manual/upload/OCR and lens configuration review', 'In Progress']
          ], [20, 44, 16]),
          makeHeading('Appendix: Signature / Acceptance', 2),
          makePara('Prepared by: Senior Software Architect / Business Analyst / Technical Documentation Specialist'),
          makePara('Date: 16 November 2026')
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(root, 'DREAM_SPEX_SRS_Document.docx'), buffer);
  console.log('Created DOCX at ' + path.join(root, 'DREAM_SPEX_SRS_Document.docx'));
}

async function buildPdf() {
  const pdfPath = path.join(root, 'DREAM_SPEX_SRS_Document.pdf');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 90, 40, { fit: [220, 80], align: 'left' });
  }
  doc.fontSize(20).text('DREAM SPEX – SOFTWARE REQUIREMENTS SPECIFICATION', { align: 'center' });
  doc.fontSize(11).text('Version 1.1 | Documentation date: 16 November 2026', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Prepared for technical documentation, client review and handover.', { align: 'center' });
  doc.moveDown(2);
  const textSections = [
    '1. Introduction',
    'Dream Spex is a luxury eyewear e-commerce platform designed to support premium product browsing, prescription workflows, store locator requirements, franchise operations, order management and secure payments.',
    '2. Overall System Description',
    'The system combines a React.js and TypeScript frontend with Java 21 / Spring Boot 3.4.4 backend and MySQL/MariaDB data layer. Current production frontend hosting is Vercel; future frontend hosting is planned on Hostinger VPS.',
    '3. Functional Requirements',
    'Functional requirements include registration and login, OTP verification, cart, checkout, Razorpay payment flow, returns and refunds, storefront search, prescription management, virtual try-on, membership plans, franchise operations and admin management workflows.',
    '4. External Interface Requirements',
    'The platform integrates with payment gateways, email/OTP services, OCR services, maps and location data, and environment-based configuration services.',
    '5. Non-Functional Requirements',
    'Security, availability, maintainability, responsive design, scalability and data privacy are fundamental requirements to preserve customer trust and system integrity.',
    '6. System Architecture',
    'The application follows a three-tier architecture: frontend, REST API backend and persistent database layer with optional external dependencies. The current and planned deployment diagrams are included in the project architecture package.',
    '7. Database Design',
    'Key database domains cover users, roles, products, inventory, orders, payment records, addresses, prescriptions, stores, memberships, franchise data and notifications.',
    '8. API Documentation',
    'Actual API structure follows /api/v1 patterns with endpoints for auth, products, cart, orders, payments, prescriptions, memberships, stores and admin functions defined in source and project documentation.',
    '9. Business Rules',
    'Business rules cover pricing precision, coupon validation, inventory checks, payment status, returns and refunds, permissions, and role-based access to franchise data.',
    '10. Testing Requirements',
    'The platform includes targeted unit and integration tests across authentication, franchise operations, validation logic, and security checks. Additional end-to-end production verification remains planned.',
    '11. Deployment and Maintenance',
    'Current deployment uses Vercel frontend and Hostinger VPS backend; planned migration moves frontend to the same VPS along with OpenLiteSpeed, HTTPS and custom domain routing.',
    '12. Future Enhancements',
    'The main future work includes completion of production-grade OCR validation, scaling operations, and final production deployment and verification of frontend migration.',
    '13. Appendices',
    'This document references architecture documents, API mapping documentation, database design notes, technical source files and revision history. TBD status is used for information not yet verified.'
  ];
  textSections.forEach((line) => {
    const lineParts = doc.widthOfString(line) > 500 ? line.match(/.{1,90} /g) || [line] : [line];
    lineParts.forEach((part) => doc.text(part.trim(), { align: 'left' }));
    doc.moveDown(0.4);
  });
  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  console.log('Created PDF at ' + pdfPath);
}

async function buildMatrixWorkbook() {
  const wb = XLSX.utils.book_new();
  const matrix = [
    ['Requirement ID', 'Requirement', 'Module', 'Status', 'Evidence / Source'],
    ['FR-001', 'Customer registration/login', 'Authentication', 'Completed', 'Auth controllers and API mapping docs'],
    ['FR-002', 'OTP verification / reset', 'Authentication', 'Completed', 'Auth architecture and security docs'],
    ['FR-003', 'Profile and address management', 'Customer profile', 'Completed', 'User/address APIs'],
    ['FR-004', 'Browse products and categories', 'Catalog', 'Completed', 'Product APIs and storefront'],
    ['FR-005', 'Search and filters', 'Catalog', 'Completed', 'Catalog API mapping'],
    ['FR-006', 'Cart and wishlist', 'Shopping', 'Completed', 'ShoppingController endpoints'],
    ['FR-007', 'Checkout and order creation', 'Order lifecycle', 'Completed', 'Order APIs'],
    ['FR-008', 'Razorpay intent and verification', 'Payments', 'Completed', 'Payment controller'],
    ['FR-009', 'Returns and refunds', 'After-sales', 'Completed', 'Return controllers'],
    ['FR-010', 'Virtual Try-On', 'Advanced eyewear', 'In Progress', 'Frontend and business module references'],
    ['FR-011', 'Prescription upload and OCR', 'Advanced eyewear', 'In Progress', 'Prescription APIs and OCR doc references'],
    ['FR-012', 'Lens recommendations', 'Advanced eyewear', 'In Progress', 'Lens management docs'],
    ['FR-013', 'Membership plans', 'Business module', 'Completed', 'Membership plan tables'],
    ['FR-014', 'Coupon and offers', 'Business module', 'Completed', 'Coupon and offers endpoints'],
    ['FR-015', 'Store Locator and franchise stores', 'Business module', 'Completed', 'Store locator feature and APIs'],
    ['FR-016', 'Admin dashboard and management', 'Admin', 'In Progress', 'Admin UI and backend modules'],
    ['FR-017', 'Reports and exports', 'Admin analytics', 'In Progress', 'Admin exports / reporting architecture'],
    ['FR-018', 'Notifications and OTP communication', 'Communication', 'Completed', 'SMS/email event outbox docs']
  ];
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(wb, ws, 'Traceability Matrix');
  XLSX.writeFile(wb, path.join(root, 'DREAM_SPEX_Traceability_Matrix.xlsx'));
  console.log('Created traceability matrix workbook');
}

async function buildTestingWorkbook() {
  const wb = XLSX.utils.book_new();
  const matrix = [
    ['Module', 'Checklist Item', 'Status', 'Evidence / Notes'],
    ['Authentication', 'Registration, OTP verification, password reset, login', 'Completed', 'Security and auth architecture validated via backend test templates'],
    ['Catalog', 'Product list, filters, categories and details', 'Completed', 'Catalog APIs and storefront screens built'],
    ['Shopping', 'Cart add/remove/update, coupon validation', 'Completed', 'ShoppingController API and service flow'],
    ['Orders and payments', 'Checkout, order creation, Razorpay verification, payment webhook', 'Completed', 'Payment + order controllers'],
    ['Returns and refunds', 'Return eligibility, evidence, approval and refund flow', 'Completed', 'Return controllers and admin return flow'],
    ['Franchise / stores', 'Store locator, franchise management, application review', 'Completed', 'Store locator, franchise and application modules'],
    ['Membership', 'Membership plan configuration, loyalty and referral logic', 'Completed', 'Membership schema and endpoints'],
    ['Prescription and lens', 'Upload, OCR, OD/OS values and lens selection', 'In Progress', 'Workflow present; final production validation TBD'],
    ['Admin dashboards', 'Reports, exports and dashboard metrics', 'In Progress', 'Admin pages and reporting modules in progress'],
    ['Security', 'JWT auth, penetration checks, rate-limit assumptions, OTP enumeration prevention', 'Completed', 'Security architecture and validation tests']
  ];
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(wb, ws, 'Testing Checklist');
  XLSX.writeFile(wb, path.join(root, 'DREAM_SPEX_Testing_Checklist.xlsx'));
  console.log('Created testing checklist workbook');
}

(async function main() {
  if (fs.existsSync(archSvgPath) && fs.existsSync(archPngPath) === false) await convertSvgToPng(archSvgPath, archPngPath);
  if (fs.existsSync(erSvgPath) && fs.existsSync(erPngPath) === false) {
    await convertSvgToPng(erSvgPath, erPngPath);
  }

  const erDiagramSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
      <rect width="1200" height="700" fill="#eef5ff"/>
      <text x="600" y="40" text-anchor="middle" font-size="26" font-family="Segoe UI" font-weight="700" fill="#12315A">Dream Spex Database ER Diagram</text>
      <rect x="50" y="110" width="200" height="110" rx="12" fill="#dfeeff" stroke="#3b82b8"/>
      <text x="150" y="150" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Users</text>
      <text x="150" y="180" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">id, email, phone, role</text>
      <rect x="340" y="110" width="220" height="110" rx="12" fill="#dffaf0" stroke="#3aa66d"/>
      <text x="450" y="150" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Products</text>
      <text x="450" y="180" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">id, sku, name, price</text>
      <rect x="650" y="110" width="210" height="110" rx="12" fill="#fff0d8" stroke="#d29b36"/>
      <text x="755" y="150" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Orders</text>
      <text x="755" y="180" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">id, order_number, total</text>
      <rect x="910" y="110" width="210" height="110" rx="12" fill="#f6ecff" stroke="#8d5fd3"/>
      <text x="1015" y="150" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Franchises</text>
      <text x="1015" y="180" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">id, name, city, status</text>
      <rect x="150" y="350" width="220" height="110" rx="12" fill="#dfeeff" stroke="#3b82b8"/>
      <text x="260" y="390" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Addresses</text>
      <text x="260" y="420" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">user_id, city, state, lat/lng</text>
      <rect x="430" y="350" width="220" height="110" rx="12" fill="#dffaf0" stroke="#3aa66d"/>
      <text x="540" y="390" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Prescriptions</text>
      <text x="540" y="420" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">user_id, OD, OS, PD</text>
      <rect x="720" y="350" width="220" height="110" rx="12" fill="#fff0d8" stroke="#d29b36"/>
      <text x="830" y="390" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Payments</text>
      <text x="830" y="420" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">order_id, provider, status</text>
      <rect x="950" y="350" width="210" height="110" rx="12" fill="#f6ecff" stroke="#8d5fd3"/>
      <text x="1055" y="390" text-anchor="middle" font-size="22" font-family="Segoe UI" font-weight="700" fill="#12315A">Notifications</text>
      <text x="1055" y="420" text-anchor="middle" font-size="14" font-family="Segoe UI" fill="#203C5C">user_id, type, status</text>
      <line x1="250" y1="220" x2="250" y2="350" stroke="#2d466d" stroke-width="2"/>
      <line x1="450" y1="220" x2="450" y2="350" stroke="#2d466d" stroke-width="2"/>
      <line x1="755" y1="220" x2="755" y2="350" stroke="#2d466d" stroke-width="2"/>
      <line x1="1015" y1="220" x2="1015" y2="350" stroke="#2d466d" stroke-width="2"/>
      <line x1="250" y1="350" x2="430" y2="350" stroke="#2d466d" stroke-width="2"/>
      <line x1="540" y1="350" x2="720" y2="350" stroke="#2d466d" stroke-width="2"/>
      <line x1="830" y1="350" x2="950" y2="350" stroke="#2d466d" stroke-width="2"/>
      <text x="290" y="260" font-size="15" font-family="Segoe UI" fill="#2d466d">1..N</text>
      <text x="585" y="260" font-size="15" font-family="Segoe UI" fill="#2d466d">1..N</text>
      <text x="840" y="260" font-size="15" font-family="Segoe UI" fill="#2d466d">1..N</text>
      <text x="1045" y="260" font-size="15" font-family="Segoe UI" fill="#2d466d">1..N</text>
    </svg>
  `;
  if (!fs.existsSync(erSvgPath)) fs.writeFileSync(erSvgPath, erDiagramSvg);

  await buildDocx();
  await buildPdf();
  buildMatrixWorkbook();
  buildTestingWorkbook();
})();
