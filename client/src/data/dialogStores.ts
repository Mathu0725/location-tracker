export interface DialogStore {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  hours: string;
  services: string[];
}

export const DIALOG_STORES: DialogStore[] = [
  {
    id: 'store-iconic',
    name: 'The Dialog Iconic',
    address: 'No. 475, Union Place, Colombo 02',
    city: 'Colombo',
    latitude: 6.9186,
    longitude: 79.8569,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sun: 8:30 AM - 7:00 PM',
    services: ['5G Experience Zone', 'eSIM & SIM Swap', 'Fibre Broadband', 'Club Vision Lounge', 'Device Repair'],
  },
  {
    id: 'store-bamba',
    name: 'Dialog Experience Centre - Bambalapitiya',
    address: 'No. 293, Galle Road, Colombo 04',
    city: 'Colombo',
    latitude: 6.8920,
    longitude: 79.8550,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    services: ['5G SIM Swap', 'Bill Payment', 'Home Broadband', 'Device Purchases'],
  },
  {
    id: 'store-nugegoda',
    name: 'Dialog Experience Centre - Nugegoda',
    address: 'No. 120, High Level Road, Nugegoda',
    city: 'Nugegoda',
    latitude: 6.8720,
    longitude: 79.8980,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    services: ['5G SIM Swap', 'Broadband Testing', 'Mobile & DTV Services'],
  },
  {
    id: 'store-kandy',
    name: 'Dialog Experience Centre - Kandy',
    address: 'No. 17, Dalada Veediya, Kandy',
    city: 'Kandy',
    latitude: 7.2936,
    longitude: 80.6370,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 8:30 AM - 5:30 PM',
    services: ['5G Trial Zone', 'Club Vision Priority', 'Broadband & DTV', 'SIM Replacement'],
  },
  {
    id: 'store-galle',
    name: 'Dialog Experience Centre - Galle',
    address: 'No. 42, Main Street, Galle',
    city: 'Galle',
    latitude: 6.0367,
    longitude: 80.2170,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 8:30 AM - 5:30 PM',
    services: ['eSIM Activation', 'Home Broadband', '5G Handset Sales', 'Tourist SIM'],
  },
  {
    id: 'store-negombo',
    name: 'Dialog Experience Centre - Negombo',
    address: 'No. 78, Greens Road, Negombo',
    city: 'Negombo',
    latitude: 7.2084,
    longitude: 79.8358,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    services: ['Airport Express Tourist SIM', '5G Mobile Support', 'Fibre Booking'],
  },
  {
    id: 'store-jaffna',
    name: 'Dialog Experience Centre - Jaffna',
    address: 'No. 55, Hospital Road, Jaffna',
    city: 'Jaffna',
    latitude: 9.6647,
    longitude: 80.0167,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 8:30 AM - 5:30 PM',
    services: ['5G Coverage Demo', 'Home Broadband Setup', 'SIM Replacement', 'Bill Settlement'],
  },
  {
    id: 'store-kurunegala',
    name: 'Dialog Experience Centre - Kurunegala',
    address: 'No. 32, Colombo Road, Kurunegala',
    city: 'Kurunegala',
    latitude: 7.4863,
    longitude: 80.3623,
    phone: '+94 77 767 8678',
    hours: 'Mon - Sat: 9:00 AM - 5:30 PM',
    services: ['Broadband & DTV Express', 'eSIM Setup', 'Handset Financing'],
  },
];

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
