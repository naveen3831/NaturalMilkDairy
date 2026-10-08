/**
 * Central Cloudinary Media Assets
 * Uploaded directly to Cloudinary Account: ddgjubbbx / natural-milk-dairy
 */
export const CLOUDINARY_MEDIA = {
  cowMilk: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454805/natural-milk-dairy/product-cow-milk.jpg',
  buffaloMilk: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454806/natural-milk-dairy/product-buffalo-milk.jpg',
  curd: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454807/natural-milk-dairy/product-curd.jpg',
  ghee: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454808/natural-milk-dairy/product-ghee.jpg',
  paneer: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454809/natural-milk-dairy/product-paneer.jpg',
  cowsPasture: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454809/natural-milk-dairy/cows-pasture.jpg',
  glassBottles: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454810/natural-milk-dairy/glass-bottles.jpg',
  milkPour: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454811/natural-milk-dairy/milk-pour.jpg',
  organicFarm: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454812/natural-milk-dairy/organic-farm.jpg',
  heroDairy: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454813/natural-milk-dairy/hero-dairy.jpg',
  logo: 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791454814/natural-milk-dairy/logo.jpg',
};

export const PRESET_GALLERY = [
  { label: 'Fresh Cow Milk', url: CLOUDINARY_MEDIA.cowMilk },
  { label: 'Pure Buffalo Milk', url: CLOUDINARY_MEDIA.buffaloMilk },
  { label: 'Traditional Curd', url: CLOUDINARY_MEDIA.curd },
  { label: 'A2 Desi Ghee', url: CLOUDINARY_MEDIA.ghee },
  { label: 'Malai Paneer', url: CLOUDINARY_MEDIA.paneer },
  { label: 'Morning Milk Pour', url: CLOUDINARY_MEDIA.milkPour },
  { label: 'Glass Bottles', url: CLOUDINARY_MEDIA.glassBottles },
  { label: 'Organic Farm', url: CLOUDINARY_MEDIA.organicFarm },
  { label: 'Cows Pasture', url: CLOUDINARY_MEDIA.cowsPasture },
];

export const getDefaultProductImage = (name = '', category = '') => {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (n.includes('buffalo')) return CLOUDINARY_MEDIA.buffaloMilk;
  if (n.includes('cow') || c === 'milk') return CLOUDINARY_MEDIA.cowMilk;
  if (c === 'curd' || n.includes('curd') || n.includes('dahi')) return CLOUDINARY_MEDIA.curd;
  if (c === 'ghee' || n.includes('ghee')) return CLOUDINARY_MEDIA.ghee;
  if (c === 'paneer' || n.includes('paneer')) return CLOUDINARY_MEDIA.paneer;
  return CLOUDINARY_MEDIA.cowMilk;
};
