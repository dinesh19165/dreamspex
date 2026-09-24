export type DemoRole = 'CUSTOMER' | 'FRANCHISE_ADMIN' | 'SUPER_ADMIN';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  franchiseId?: string;
  franchiseName?: string;
  city?: string;
  state?: string;
};

export const mockCustomerUser: DemoUser = {
  id: 'customer-001',
  name: 'Dream Spex Customer',
  email: 'customer@dreamspex.com',
  role: 'CUSTOMER',
};

export const mockFranchiseUsers: DemoUser[] = [
  {
    id: 'franchise-admin-001',
    name: 'Hyderabad Franchise Admin',
    email: 'hyderabad@dreamspex.com',
    role: 'FRANCHISE_ADMIN',
    franchiseId: 'DS-HYD-001',
    franchiseName: 'Dream Spex Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
  },
  {
    id: 'franchise-admin-002',
    name: 'Vijayawada Franchise Admin',
    email: 'vijayawada@dreamspex.com',
    role: 'FRANCHISE_ADMIN',
    franchiseId: 'DS-VJA-002',
    franchiseName: 'Dream Spex Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
  },
  {
    id: 'franchise-admin-003',
    name: 'Bangalore Franchise Admin',
    email: 'bangalore@dreamspex.com',
    role: 'FRANCHISE_ADMIN',
    franchiseId: 'DS-BLR-003',
    franchiseName: 'Dream Spex Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
  },
  {
    id: 'franchise-admin-004',
    name: 'Chennai Franchise Admin',
    email: 'chennai@dreamspex.com',
    role: 'FRANCHISE_ADMIN',
    franchiseId: 'DS-CHN-004',
    franchiseName: 'Dream Spex Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
  },
];

export const mockSuperAdminUser: DemoUser = {
  id: 'super-admin-001',
  name: 'Dream Spex Super Admin',
  email: 'admin@dreamspex.com',
  role: 'SUPER_ADMIN',
};

export const mockDemoCredentials = {
  customer: { email: 'customer@dreamspex.com', password: 'customer123' },
  franchise: { email: 'hyderabad@dreamspex.com', password: 'franchise123' },
  admin: { email: 'admin@dreamspex.com', password: 'admin123' },
};

export function getMockFranchiseUserByEmail(email: string) {
  return mockFranchiseUsers.find((user) => user.email.toLowerCase() === email.toLowerCase());
}
