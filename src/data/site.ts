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
  // Section anchors on the home page, shared by the desktop nav and the
  // mobile menu.
  nav: [
    { label: 'Where & when', href: '#schedule' },
    { label: 'Lessons', href: '#lessons' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
} as const;
