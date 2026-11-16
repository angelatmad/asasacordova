import rosesImage from "@/assets/images/roses.jpg";
import soleaImage from "@/assets/images/solea.jpg";
import bantayanImage from "@/assets/images/bantayan-beach.jpg";
import reefImage from "@/assets/images/cordova-reef.jpg";
import agilaImage from "@/assets/images/agila.jpg";
import villaAselaImage from "@/assets/images/villaasela.jpg";
import altaHotelImage from "@/assets/images/altahotel.jpg";
import lantawImage from "@/assets/images/lantawrestaurant.jpg";
import parolaImage from "@/assets/images/parolarestaurant.jpg";
import sungkaImage from "@/assets/images/sungkanative.jpg";
import bakasihanImage from "@/assets/images/bakasihan.jpg";
import bricImage from "@/assets/images/bricfoodpark.jpg";
import roroImage from "@/assets/images/rorofoodpark.jpg";
import gilutonganImage from "@/assets/images/gilutongan.jpg";
import cclexImage from "@/assets/images/cclex.jpeg";

export type RouteStep = {
  stepNumber: number;
  instruction: string;
  landmark: string;
  image?: string;
};

export type Destination = {
  slug: string;
  name: string;
  category: string;
  image?: string;
  description: string;
  overview: string;
  highlights: string[];
  address: string;
  openingHours: string;
  closingHours: string;
  operatingDays: string;
  entranceFee: string;
  contactNumber: string;
  facilities: string[];
  latitude?: number;
  longitude?: number;
  locationNote?: string;
  routeSteps?: RouteStep[];
};

const pending = "To be verified";
const unavailable = "Not yet available";

export const destinations: Destination[] = [
  {
    slug: "10000-roses",
    name: "10,000 Roses",
    category: "Attraction",
    image: rosesImage,
    description:
      "Discover one of Cordova's recognizable attractions and enjoy its scenic surroundings.",
    overview:
      "10,000 Roses is a tourist attraction in Cordova, Cebu, known for its artificial LED roses and seaside setting. Visitors can explore the attraction, take photographs, and enjoy the surrounding coastal scenery.",
    highlights: [
      "LED rose installation",
      "Seaside views",
      "Photography spot",
      "Evening scenery",
    ],
    address: "Day-as Barangay Road, Cordova, Cebu",
    openingHours: "10:00 AM",
    closingHours: "10:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "₱20 per person",
    contactNumber: unavailable,
    facilities: ["Seaside walkway", "Cafe", "Parking area"],
    latitude: 10.25648,
    longitude: 123.9328,
    routeSteps: [],
  },
  {
    slug: "solea",
    name: "Solea Mactan Resort",
    category: "Resort",
    image: soleaImage,
    description:
      "Explore Solea Mactan Resort and discover a resort destination in Cordova.",
    overview:
      "Solea Mactan Resort is a resort destination in Cordova, Cebu. It is known for its swimming pools and seaside setting. Guests can check the resort's access arrangements, facilities, and available activities before visiting.",
    highlights: [
      "Swimming pools",
      "Seaside setting",
      "Resort facilities",
      "Recreational activities",
    ],
    address: "Victor Wahing Street, Barangay Alegria, Cordova, Cebu",
    openingHours: "8:00 AM",
    closingHours: "10:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "Contact resort for day-use rates",
    contactNumber: "+63 32 517 8889",
    facilities: ["Multiple swimming pools", "Restaurant", "Water park", "Event spaces"],
    latitude: 10.25528,
    longitude: 123.95929,
    routeSteps: [],
  },
  {
    slug: "cordova-bantayan-beach",
    name: "Bantayan Beach",
    category: "Beach",
    image: bantayanImage,
    description:
      "Discover a coastal destination in Cordova and enjoy the seaside scenery.",
    overview:
      "Bantayan Beach is included in the Asa sa Cordova destination directory for visitors interested in exploring coastal areas. Check the exact access point and available visitor information before planning a trip.",
    highlights: [
      "Coastal scenery",
      "Beach surroundings",
      "Photography opportunities",
    ],
    address: "Bantayan, Cordova, Cebu",
    openingHours: "Open daily",
    closingHours: "Open daily",
    operatingDays: "Monday - Sunday",
    entranceFee: "Free access",
    contactNumber: unavailable,
    facilities: ["Public beach access", "Local coastal views"],
    latitude: 10.24883,
    longitude: 123.95236,
    locationNote:
      "Approximate neighborhood pin. The exact beach entrance still needs verification.",
    routeSteps: [],
  },
  {
    slug: "cordova-reef",
    name: "Cordova Reef Village Resort",
    category: "Resort",
    image: reefImage,
    description:
      "Explore Cordova Reef Village Resort and discover a coastal resort destination.",
    overview:
      "Cordova Reef Village Resort is listed in the Asa sa Cordova directory as a resort destination. Visitors should check the resort's location, facilities, access arrangements, and available services before planning a visit.",
    highlights: [
      "Resort accommodation",
      "Coastal surroundings",
      "Recreational facilities",
      "Visitor destination",
    ],
    address: "Bantayan, Cordova, Cebu",
    openingHours: "8:00 AM",
    closingHours: "9:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "Contact resort for rates",
    contactNumber: "+63 32 496 5030",
    facilities: ["Swimming pool", "Beachfront cottages", "Restaurant", "Spa services"],
    latitude: 10.2549,
    longitude: 123.9569,
    routeSteps: [],
  },
  {
    slug: "agila-resort",
    name: "Agila Resort",
    category: "Resort",
    image: agilaImage,
    description: "Explore Agila Resort in the Cordova destination directory.",
    overview:
      "Agila Resort is included in the Asa sa Cordova directory. Details about its facilities, visitor access, rates, and services will be added after verification.",
    highlights: [
      "Resort destination",
      "Visitor information",
      "Facilities to be verified",
    ],
    address: "Cordova, Cebu",
    openingHours: pending,
    closingHours: pending,
    operatingDays: pending,
    entranceFee: pending,
    contactNumber: unavailable,
    facilities: ["Facilities to be verified."],
    latitude: 10.2521,
    longitude: 123.9482,
    locationNote: "Approximate location pin in Cordova.",
    routeSteps: [],
  },
  {
    slug: "villa-asela-resort",
    name: "Villa Asela Resort",
    category: "Resort",
    image: villaAselaImage,
    description:
      "Discover Villa Asela Resort and check its visitor information before planning a visit.",
    overview:
      "Villa Asela Resort is included in the Asa sa Cordova directory. Its location, facilities, rates, and visitor arrangements will be updated once verified.",
    highlights: [
      "Resort destination",
      "Visitor information",
      "Facilities to be verified",
    ],
    address: "Cordova, Cebu",
    openingHours: pending,
    closingHours: pending,
    operatingDays: pending,
    entranceFee: pending,
    contactNumber: unavailable,
    facilities: ["Facilities to be verified."],
    latitude: 10.2593,
    longitude: 123.9441,
    locationNote: "Approximate location pin in Cordova.",
    routeSteps: [],
  },
  {
    slug: "alta-hotel",
    name: "Alta Hotel",
    category: "Hotel",
    image: altaHotelImage,
    description:
      "Find visitor information about Alta Hotel in the Cordova directory.",
    overview:
      "Alta Hotel is included in the Asa sa Cordova directory. Accommodation details, location, contact information, and available services will be added after verification.",
    highlights: [
      "Hotel accommodation",
      "Visitor information",
      "Services to be verified",
    ],
    address: "Poblacion, Cordova, Cebu",
    openingHours: "24 Hours",
    closingHours: "24 Hours",
    operatingDays: "Monday - Sunday",
    entranceFee: "Contact the hotel for rates",
    contactNumber: unavailable,
    facilities: ["Hotel rooms", "Lobby", "Parking"],
    latitude: 10.2612,
    longitude: 123.9458,
    routeSteps: [],
  },
  {
    slug: "lantaw-restaurant",
    name: "Lantaw Restaurant",
    category: "Restaurant",
    image: lantawImage,
    description:
      "Discover Lantaw Restaurant and check its dining information before visiting.",
    overview:
      "Lantaw Restaurant is included in the Asa sa Cordova directory. Its exact location, menu information, operating schedule, and contact details will be updated after verification.",
    highlights: [
      "Restaurant destination",
      "Dining information",
      "Menu details to be verified",
    ],
    address: "Day-as, Cordova, Cebu",
    openingHours: "10:00 AM",
    closingHours: "11:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "No entrance fee",
    contactNumber: unavailable,
    facilities: ["Floating dining area", "Seafood menu", "Seaside views"],
    latitude: 10.2571,
    longitude: 123.9335,
    routeSteps: [],
  },
  {
    slug: "parola-restaurant",
    name: "Parola Restaurant",
    category: "Restaurant",
    image: parolaImage,
    description:
      "Find dining information about Parola Restaurant in the Cordova directory.",
    overview:
      "Parola Restaurant is included in the Asa sa Cordova directory. Its location, menu, operating schedule, and visitor information will be updated after verification.",
    highlights: [
      "Restaurant destination",
      "Dining information",
      "Menu details to be verified",
    ],
    address: "Cordova Coastal Road, Cebu",
    openingHours: "11:00 AM",
    closingHours: "10:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "No entrance fee",
    contactNumber: unavailable,
    facilities: ["Dining tables", "Seafood dishes"],
    latitude: 10.2534,
    longitude: 123.9392,
    routeSteps: [],
  },
  {
    slug: "sungka-native-restaurant",
    name: "Sungka Native Restaurant",
    category: "Restaurant",
    image: sungkaImage,
    description:
      "Explore Sungka Native Restaurant and find its dining information.",
    overview:
      "Sungka Native Restaurant is included in the Asa sa Cordova directory. Its location, menu details, operating schedule, and contact information will be updated after verification.",
    highlights: [
      "Restaurant destination",
      "Dining information",
      "Menu details to be verified",
    ],
    address: "Cordova, Cebu",
    openingHours: "10:00 AM",
    closingHours: "9:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "No entrance fee",
    contactNumber: unavailable,
    facilities: ["Native dishes", "Dining area"],
    latitude: 10.2505,
    longitude: 123.9467,
    routeSteps: [],
  },
  {
    slug: "bakasihan",
    name: "Bakasihan",
    category: "Restaurant",
    image: bakasihanImage,
    description:
      "Find visitor and dining information about Bakasihan.",
    overview:
      "Bakasihan is included in the Asa sa Cordova directory. Its exact location, food offerings, operating schedule, and visitor information will be updated after verification.",
    highlights: [
      "Dining destination",
      "Food information to be verified",
      "Visitor information",
    ],
    address: "Poblacion, Cordova, Cebu",
    openingHours: "9:00 AM",
    closingHours: "9:00 PM",
    operatingDays: "Monday - Sunday",
    entranceFee: "No entrance fee",
    contactNumber: unavailable,
    facilities: ["Specialty eel soup stalls", "Casual dining"],
    latitude: 10.2601,
    longitude: 123.9485,
    routeSteps: [],
  },
  {
    slug: "bric-food-park",
    name: "Bric Food Park",
    category: "Food Park",
    image: bricImage,
    description:
      "Explore Bric Food Park and discover its food and visitor information.",
    overview:
      "Bric Food Park is included in the Asa sa Cordova directory. Stall information, food options, location, and operating schedule will be added after verification.",
    highlights: [
      "Food park destination",
      "Food stalls to be listed",
      "Visitor information",
    ],
    address: "Cordova Poblacion, Cebu",
    openingHours: "4:00 PM",
    closingHours: "12:00 AM",
    operatingDays: "Monday - Sunday",
    entranceFee: "No entrance fee",
    contactNumber: unavailable,
    facilities: ["Multiple food stalls", "Open-air seating"],
    latitude: 10.2585,
    longitude: 123.9493,
    routeSteps: [],
  },
  {
    slug: "roro-port-food-park",
    name: "Roro Port Food Park",
    category: "Food Park",
    image: roroImage,
    description:
      "Find food and visitor information about Roro Port Food Park.",
    overview:
      "Roro Port Food Park is included in the Asa sa Cordova directory. Its exact location, food stalls, operating schedule, and visitor information will be updated after verification.",
    highlights: [
      "Food park destination",
      "Food stalls to be listed",
      "Visitor information",
    ],
    address: "Roro Port Area, Cordova, Cebu",
    openingHours: "4:00 PM",
    closingHours: "12:00 AM",
    operatingDays: "Monday - Sunday",
    entranceFee: "No entrance fee",
    contactNumber: unavailable,
    facilities: ["Seaside food park", "Stalls and dining tables"],
    latitude: 10.2462,
    longitude: 123.9531,
    routeSteps: [],
  },
  {
    slug: "gilutongan-island",
    name: "Gilutongan Island",
    category: "Island",
    image: gilutonganImage,
    description:
      "Discover Gilutongan Island and find useful visitor information before your trip.",
    overview:
      "Gilutongan Island is included in the Asa sa Cordova directory as an island destination. Visitors should verify boat arrangements, access points, fees, and local guidelines before travelling.",
    highlights: [
      "Island destination",
      "Coastal scenery",
      "Visitor information",
    ],
    address: "Gilutongan Island, Cordova, Cebu",
    openingHours: "Daytime boat trips recommended",
    closingHours: "Daytime boat trips recommended",
    operatingDays: "Monday - Sunday",
    entranceFee: "Environmental/island fees apply",
    contactNumber: unavailable,
    facilities: ["Marine sanctuary", "Snorkeling spots", "Boat docking"],
    latitude: 10.2075,
    longitude: 124.0321,
    locationNote: "Requires boat transfer from Cordova ports. Road routing cannot reach the island directly.",
    routeSteps: [],
  },
  {
    slug: "ccl-expressway",
    name: "Cebu-Cordova Link Expressway (CCLEX)",
    category: "Landmark",
    image: cclexImage,
    description:
      "Learn about the Cebu-Cordova Link Expressway and its connection to Cordova.",
    overview:
      "The Cebu-Cordova Link Expressway, also known as CCLEX, is a major infrastructure landmark connecting Cebu City and Cordova. This page will provide visitor information relevant to viewing areas and access where applicable.",
    highlights: [
      "Major infrastructure landmark",
      "Connection between Cebu City and Cordova",
      "Scenic views from permitted viewing areas",
    ],
    address: "CCLEX Cordova Toll Plaza",
    openingHours: "24 Hours (Subject to toll regulations)",
    closingHours: "24 Hours (Subject to toll regulations)",
    operatingDays: "Monday - Sunday",
    entranceFee: "Toll fees apply",
    contactNumber: unavailable,
    facilities: ["Expressway connection", "Toll plaza"],
    latitude: 10.2642,
    longitude: 123.9185,
    locationNote: "Expressway landmark connecting Cebu City and Cordova.",
    routeSteps: [],
  },
];
