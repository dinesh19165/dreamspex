import type { Category, Coupon, MembershipPlan, Product, Review } from '../types';

export const categories: Category[] = [
  { id: 1, name: 'Frames', slug: 'frames', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80', description: 'Timeless silhouettes for every moment.' },
  { id: 2, name: 'Sunglasses', slug: 'sunglasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80', description: 'Luxury tint and sculpted comfort.' },
  { id: 3, name: 'UV Glasses', slug: 'uv-glasses', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80', description: 'High clarity for daily protection.' },
  { id: 4, name: 'Contact Lenses', slug: 'contact-lenses', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80', description: 'Precision lenses with all-day comfort.' },
  { id: 5, name: 'Kids Collection', slug: 'kids-collection', image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80', description: 'Playful yet polished eyewear.' },
  { id: 6, name: 'Computer Glasses', slug: 'computer-glasses', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80', description: 'Blue light protection with style.' },
];

export const products: Product[] = [
  {
    id: 1,
    name: 'Aurelia Rimless',
    category: 'Frames',
    price: 189,
    oldPrice: 240,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80',
    badge: 'New',
    rating: 4.8,
    reviews: 124,
    stock: 'In Stock',
    description: 'A refined rimless frame designed with lightweight titanium and a sculptural profile.',
    colors: ['Midnight', 'Titanium'],
    sizes: ['48', '50', '52'],
    material: 'Titanium',
    brand: 'VisionEye',
  },
  {
    id: 2,
    name: 'Nocturne Shield',
    category: 'Sunglasses',
    price: 289,
    oldPrice: 340,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80',
    badge: 'Bestseller',
    rating: 4.9,
    reviews: 312,
    stock: 'In Stock',
    description: 'Bold shield styling with premium polarization and UV400 protection.',
    colors: ['Black', 'Golden'],
    sizes: ['52', '54'],
    material: 'Acetate',
    brand: 'VisionEye',
  },
  {
    id: 3,
    name: 'Lumen Blue Light',
    category: 'Computer Glasses',
    price: 159,
    oldPrice: 199,
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    badge: '20% Off',
    rating: 4.7,
    reviews: 88,
    stock: 'Limited',
    description: 'Exceptionally clear optics for hybrid workdays and screen-heavy routines.',
    colors: ['Slate', 'Blue'],
    sizes: ['48', '50'],
    material: 'TR90',
    brand: 'VisionEye',
  },
  {
    id: 4,
    name: 'Solstice Luxe',
    category: 'Luxury Collection',
    price: 349,
    oldPrice: 420,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80',
    badge: 'Limited',
    rating: 5,
    reviews: 56,
    stock: 'In Stock',
    description: 'Signature luxury craftsmanship with hand-finished acetate detailing.',
    colors: ['Ivory', 'Onyx'],
    sizes: ['50', '52', '54'],
    material: 'Acetate',
    brand: 'VisionEye',
  },
];

export const membershipPlans: MembershipPlan[] = [
  { id: 1, name: 'Silver', price: 49, description: 'Perfect for daily essentials and priority support.', perks: ['Free eye test', '10% off lenses', 'Priority support'] },
  { id: 2, name: 'Gold', price: 99, description: 'A premium membership with deeper savings and concierge care.', perks: ['Free adjustments', '20% off premium frames', 'Express delivery'], featured: true },
  { id: 3, name: 'Platinum', price: 199, description: 'Elite benefits tailored to collectors and frequent buyers.', perks: ['VIP consultations', '30% off luxury collection', 'Custom fittings'] },
];

export const reviews: Review[] = [
  { id: 1, name: 'Amara K.', title: 'Elegant and comfortable', content: 'The fit and finish feel luxury-grade from the first try-on.', rating: 5 },
  { id: 2, name: 'Dylan M.', title: 'Outstanding service', content: 'The virtual try-on and home eye test made the whole process effortless.', rating: 5 },
  { id: 3, name: 'Nora L.', title: 'Beautiful collection', content: 'I found a frame that feels modern, minimal, and timeless.', rating: 4 },
];

export const coupons: Coupon[] = [
  { id: 1, title: 'Summer Luxe', code: 'LUXE20', description: 'Enjoy 20% off premium frames.', discount: '20% OFF' },
  { id: 2, title: 'Festival Glow', code: 'GLOW15', description: 'Limited time savings on new arrivals.', discount: '15% OFF' },
  { id: 3, title: 'Bank Offer', code: 'BANK10', description: 'Additional savings with select bank cards.', discount: '10% OFF' },
];
