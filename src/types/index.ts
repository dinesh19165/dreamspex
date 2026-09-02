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
