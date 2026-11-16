export type CultureItem = {
  id: string;
  title: string;
  category: "culture" | "festival" | "event";
  dateOrSchedule: string;
  venueOrLocation: string;
  description: string;
  details: string[];
  image?: string;
};

export const cultureAndEventsData: CultureItem[] = [
  {
    id: "sidlakan-festival",
    title: "Sidlakan Festival",
    category: "festival",
    dateOrSchedule: "January (Annual Fiesta celebration)",
    venueOrLocation: "Cordova Municipal Town Plaza, Cordova, Cebu",
    description:
      "The Sidlakan Festival is Cordova's premier annual cultural celebration, highlighting the municipality's vibrant heritage, coastal identity, and religious devotion.",
    details: [
      "Showcases traditional street dancing and colourful theatrical presentations",
      "Celebrates Cordova's fishing and maritime traditions",
      "Features local handicrafts, food stalls, and community gatherings",
      "Attracts visitors and pilgrims from across Cebu province",
    ],
  },
  {
    id: "municipal-fiesta",
    title: "San Roque Parish Fiesta",
    category: "festival",
    dateOrSchedule: "August 16 (Annual Feast Day)",
    venueOrLocation: "San Roque Parish Church, Cordova, Cebu",
    description:
      "The religious feast day in honor of San Roque, the patron saint of Cordova, marked by traditional novenas, solemn processions, and community festivities.",
    details: [
      "Traditional religious novenas and feast day masses",
      "Flotilla and coastal procession celebrating local maritime devotion",
      "Community food sharing and family gatherings",
      "Cultural presentations and barangay activities",
    ],
  },
  {
    id: "local-delicacies-bakasihan",
    title: "Cordova Bakasihan & Seafood Heritage",
    category: "culture",
    dateOrSchedule: "Year-round in local eateries and seaside restaurants",
    venueOrLocation: "Cordova Coastal Dining Areas",
    description:
      "Cordova is widely celebrated across Cebu as the culinary capital for 'bakas' (freshwater/estuary eel), famously prepared in various spiced soups known locally as Bakasihan.",
    details: [
      "Bakasihan: A flavorful, spicy ginger-infused soup featuring fresh local eel",
      "Fresh seafood harvesting from Cordova's rich coastal waters",
      "Traditional coastal cooking methods passed down through generations",
      "Local dining spots along the shore offering authentic seaside culinary experiences",
    ],
  },
  {
    id: "weaving-traditions",
    title: "Local Handweaving & Artisanal Crafts",
    category: "culture",
    dateOrSchedule: "Ongoing community craftsmanship",
    venueOrLocation: "Cordova Barangays",
    description:
      "Traditional cottage industries including shellcraft, basketry, and local weaving reflect the resourceful artistry of Cordova's residents.",
    details: [
      "Intricate shell craft decorations and accessories",
      "Traditional fishing net making and boat repair crafts",
      "Handmade local home goods and souvenir items",
      "Community artisan cooperatives supporting local livelihoods",
    ],
  },
  {
    id: "cordova-tourism-summit",
    title: "Cordova Tourism & Cultural Forum",
    category: "event",
    dateOrSchedule: "Details to be updated by Municipal Tourism Office",
    venueOrLocation: "Cordova Multi-Purpose Convention Center",
    description:
      "An upcoming municipal gathering bringing together local business owners, resort operators, and tourism stakeholders to promote sustainable coastal tourism.",
    details: [
      "Discussions on coastal preservation and eco-tourism initiatives",
      "Workshops for local homestay and hospitality providers",
      "Exhibits highlighting Cordova's heritage and local arts",
      "Open to municipal officials, tourism partners, and community members",
    ],
  },
  {
    id: "coastal-cleanup-community",
    title: "Cordova Coastal Clean-Up & Mangrove Protection",
    category: "event",
    dateOrSchedule: "Quarterly community initiative (Check local schedules)",
    venueOrLocation: "Cordova Coastal Zones and Mangrove Sanctuaries",
    description:
      "A community-driven environmental conservation effort engaging volunteers, fisherfolk, and local youth to protect Cordova's rich marine ecosystem and mangrove forests.",
    details: [
      "Mangrove planting and coastal rehabilitation activities",
      "Beach clean-up drives along Cordova shores",
      "Environmental awareness talks for volunteers and students",
      "Supported by local barangay councils and community groups",
    ],
  },
];
