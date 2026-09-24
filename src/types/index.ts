export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  rating: number;
  reviews: number;
  stock: 'In Stock' | 'Limited' | 'Out of Stock';
  description: string;
  colors: string[];
  sizes: string[];
  material: string;
  brand: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string;
  description: string;
}

export interface MembershipPlan {
  id: number;
  name: string;
  price: number;
  description: string;
  perks: string[];
  featured?: boolean;
}

export interface Review {
  id: number;
  name: string;
  title: string;
  content: string;
  rating: number;
}

export interface Coupon {
  id: number;
  title: string;
  code: string;
  description: string;
  discount: string;
}

export interface NavItem {
  label: string;
  path: string;
}

export interface PrescriptionEye {
  sph: string;
  cyl: string;
  axis: string;
  add: string;
  pd?: string;
  prism?: string;
  base?: string;
}

export interface Prescription {
  rightEye: PrescriptionEye;
  leftEye: PrescriptionEye;
  pd: string;
  rightPd?: string;
  leftPd?: string;
  patientName?: string;
  prescriptionDate?: string;
}

export interface LensSelection {
  type: string;
  material: string;
  coatings: string[];
  additionalPrice: number;
}

export interface Franchise {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstNumber: string;
  businessType: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  adminEmail: string;
  adminName: string;
  openingHours: string;
  services: string[];
  products?: number;
  orders?: number;
  sales?: number;
  locationLabel?: string;
}

export interface FranchiseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Franchise Admin' | 'Franchise Manager' | 'Staff';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  franchise: string;
}

export interface FranchiseLocation {
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface FranchiseProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  discount: number;
  sku: string;
  stock: number;
  frameType: string;
  frameShape: string;
  lensType: string;
  status: 'Active' | 'Low Stock';
  image: string;
  franchiseName: string;
  city: string;
  location: string;
}

export interface FranchiseOrder {
  id: string;
  customer: string;
  product: string;
  amount: number;
  orderDate: string;
  payment: string;
  delivery: string;
  status: 'Delivered' | 'Processing' | 'Pending' | 'Shipped';
  franchiseId: string;
  franchise: string;
  location: string;
}

export interface FranchiseStats {
  products: number;
  orders: number;
  customers: number;
  revenue: number;
  inventory: number;
  activeProducts: number;
  pendingOrders: number;
  sales: number;
}
