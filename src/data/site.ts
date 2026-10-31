// Shared business details. Header, footer, call bar and meta tags read from
// here so the phone number and towns live in one place.
export const site = {
  name: 'Hyejeong Kang',
  instruments: 'Piano & Violin',
  title: 'Hyejeong Kang Piano & Violin',
  description:
    'Private piano and violin lessons on Oʻahu, at your home in ʻEwa Beach and Kapolei or at Hyejeong’s home in Mililani.',
  phone: {
    display: '(808) 371-0708',
    href: 'tel:+18083710708',
  },
  towns: ['ʻEwa Beach', 'Kapolei', 'Mililani'],
} as const;
