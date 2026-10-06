/* Copper & Bean: catalog, workshops and shop settings.
   Everything the site shows comes from here, so this is the one file to edit
   for products, prices, workshop times and opening hours. When a real backend
   (Shopify, Stripe, a CMS) is connected, this data would come from it instead. */

window.CB = window.CB || {};

CB.settings = {
  currency: "USD",
  freeShippingOver: 50,
  shipping: {
    standard: { label: "Standard (3 to 5 days)", price: 6 },
    express: { label: "Express (1 to 2 days)", price: 12 },
    pickup: { label: "Pick up at the cafe", price: 0 },
  },
  subscription: {
    pricePerBag: 18, // shop price is $19 to $24, so subscribers save
    bagSize: "340 g",
  },
  // Used for the live clock in the footer. Set to the cafe's IANA time zone.
  timeZone: "America/Chicago",
  city: "Your City",
};

// Unsplash photos. Swap any of these for the cafe's own photography.
CB.photo = (id, w = 1200, h) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=75`;

CB.photos = {
  beans: "photo-1447933601403-0c6688de566e",
  espressoMachine: "photo-1461988366670-48e401bafb0a",
  latteArt: "photo-1509042239860-f550ce710b93",
  latteBeans: "photo-1569851379911-88fd7a408731",
  counter: "photo-1464979681340-bdd28a61699e",
  windowTable: "photo-1745827213105-59dfd024ad2a",
  cupSaucer: "photo-1526385159909-196a9ac0ef64",
  coffeeCup: "photo-1495474472287-4d71bcdd2085",
  twoMugs: "photo-1546863778-5cad4410b247",
  cheers: "photo-1515697061774-2399f90c2b77",
  teacup: "photo-1555118786-e18070997e5d",
  holdingCup: "photo-1543407873-30b91e5003e6",
  roastingSign: "photo-1570053814517-6e1728f0b6a9",
  steam: "photo-1578881748981-ce22565657b1",
  coffeeJar: "photo-1572814392266-1620040c58be",
  mugWood: "photo-1555118370-19d35710f1ac",
  cortados: "photo-1564992982896-cb2a99f64a25",
};

/* Products.
   art.type picks the illustration: bag, mug, camp, glass, dripper, kettle,
   grinder, press, scale, filters. art.color is the label or body color. */
CB.products = [
  {
    id: "house-espresso",
    name: "Copper House Espresso",
    category: "coffee",
    roast: "Medium-dark",
    origin: "Brazil & Ethiopia",
    process: "Natural & washed",
    notes: ["Milk chocolate", "Toffee", "Orange peel"],
    description:
      "Our everyday espresso. Syrupy and sweet on its own, and it cuts through milk without getting lost.",
    sizes: [{ label: "340 g", price: 19 }, { label: "1 kg", price: 52 }],
    badge: "Bestseller",
    featured: true,
    art: { type: "bag", color: "#C7773F", label: "House\nEspresso" },
  },
  {
    id: "ethiopia-guji",
    name: "Ethiopia Guji",
    category: "coffee",
    roast: "Light",
    origin: "Guji, Ethiopia",
    process: "Washed",
    notes: ["Jasmine", "Bergamot", "White peach"],
    description:
      "Floral and tea-like, with a long peach finish. Best as pour-over, and lovely iced.",
    sizes: [{ label: "340 g", price: 22 }, { label: "1 kg", price: 60 }],
    badge: "New",
    featured: true,
    art: { type: "bag", color: "#C9A86A", label: "Ethiopia\nGuji" },
  },
  {
    id: "colombia-huila",
    name: "Colombia Huila",
    category: "coffee",
    roast: "Medium",
    origin: "Huila, Colombia",
    process: "Washed",
    notes: ["Red apple", "Caramel", "Cocoa nib"],
    description:
      "Balanced and juicy. The coffee we hand to people who say they don't like light roasts.",
    sizes: [{ label: "340 g", price: 20 }, { label: "1 kg", price: 55 }],
    featured: true,
    art: { type: "bag", color: "#9B4A3A", label: "Colombia\nHuila" },
  },
  {
    id: "sumatra-gayo",
    name: "Night Shift Sumatra",
    category: "coffee",
    roast: "Dark",
    origin: "Gayo, Sumatra",
    process: "Wet-hulled",
    notes: ["Dark chocolate", "Cedar", "Molasses"],
    description:
      "Heavy, low acidity and built for French press or a big mug with milk.",
    sizes: [{ label: "340 g", price: 19 }, { label: "1 kg", price: 52 }],
    art: { type: "bag", color: "#3E4A3D", label: "Night\nShift" },
  },
  {
    id: "kenya-nyeri",
    name: "Kenya Nyeri AA",
    category: "coffee",
    roast: "Light",
    origin: "Nyeri, Kenya",
    process: "Washed",
    notes: ["Blackcurrant", "Grapefruit", "Raw sugar"],
    description:
      "Bright and bold, with the savory-sweet blackcurrant that great Kenyans are known for.",
    sizes: [{ label: "340 g", price: 24 }, { label: "1 kg", price: 66 }],
    art: { type: "bag", color: "#6E3B52", label: "Kenya\nNyeri" },
  },
  {
    id: "guatemala-huehue",
    name: "Guatemala Huehuetenango",
    category: "coffee",
    roast: "Medium",
    origin: "Huehuetenango, Guatemala",
    process: "Washed",
    notes: ["Brown sugar", "Plum", "Almond"],
    description: "Round and sweet, with stone fruit as it cools. Good in every brewer.",
    sizes: [{ label: "340 g", price: 20 }, { label: "1 kg", price: 55 }],
    art: { type: "bag", color: "#7A6A3A", label: "Guatemala\nHuehue" },
  },
  {
    id: "decaf-colombia",
    name: "Sugarcane Decaf",
    category: "coffee",
    roast: "Medium",
    origin: "Tolima, Colombia",
    process: "Sugarcane decaf",
    notes: ["Panela", "Red grape", "Milk chocolate"],
    description:
      "Decaffeinated naturally with sugarcane, so it still tastes like coffee. Ninety-nine percent caffeine free.",
    sizes: [{ label: "340 g", price: 20 }, { label: "1 kg", price: 55 }],
    art: { type: "bag", color: "#5D6B78", label: "Sugarcane\nDecaf" },
  },
  {
    id: "stoneware-mug",
    name: "Stoneware Mug",
    category: "mugs",
    description:
      "Hand-thrown 12 oz mug in a speckled copper glaze, made for us by a local potter. Each one is slightly different.",
    sizes: [{ label: "12 oz", price: 28 }],
    badge: "Bestseller",
    featured: true,
    art: { type: "mug", color: "#B5653A" },
  },
  {
    id: "camp-mug",
    name: "Enamel Camp Mug",
    category: "mugs",
    description: "Tough, light and printed with our wordmark. For the trail, the van or the desk.",
    sizes: [{ label: "10 oz", price: 22 }],
    art: { type: "camp", color: "#E9E0D2" },
  },
  {
    id: "cortado-glasses",
    name: "Cortado Glasses, Set of 2",
    category: "mugs",
    description: "The 4.5 oz glasses we serve cortados in at the bar. Heat-safe borosilicate.",
    sizes: [{ label: "Set of 2", price: 24 }],
    art: { type: "glass", color: "#C7773F" },
  },
  {
    id: "dripper",
    name: "Ceramic Pour-Over Dripper",
    category: "gear",
    description: "A cone dripper that holds heat well and brews a clean, sweet cup. Fits size 02 filters.",
    sizes: [{ label: "Size 02", price: 32 }],
    art: { type: "dripper", color: "#E9E0D2" },
  },
  {
    id: "kettle",
    name: "Gooseneck Kettle",
    category: "gear",
    description: "Electric, with temperature control to the degree and a hold mode. The spout gives you a steady, slow pour.",
    sizes: [{ label: "0.9 L", price: 89 }],
    art: { type: "kettle", color: "#2B2B2B" },
  },
  {
    id: "grinder",
    name: "Hand Burr Grinder",
    category: "gear",
    description: "Steel conical burrs and 40 click settings, from espresso to French press. The biggest upgrade most home brewers can make.",
    sizes: [{ label: "One size", price: 95 }],
    art: { type: "grinder", color: "#8C8C8C" },
  },
  {
    id: "french-press",
    name: "French Press",
    category: "gear",
    description: "Double-walled steel, so it stays hot through a second cup. 800 ml.",
    sizes: [{ label: "800 ml", price: 45 }],
    art: { type: "press", color: "#B5653A" },
  },
  {
    id: "scale",
    name: "Brew Scale with Timer",
    category: "gear",
    description: "Weighs to 0.1 g with a built-in timer. Brewing by weight is how we get the same cup every time.",
    sizes: [{ label: "One size", price: 48 }],
    art: { type: "scale", color: "#2B2B2B" },
  },
  {
    id: "filters",
    name: "Paper Filters, 100 Pack",
    category: "gear",
    description: "Unbleached size 02 cone filters. Rinse before brewing.",
    sizes: [{ label: "100 pack", price: 9 }],
    art: { type: "filters", color: "#D8C7A8" },
  },
];

CB.categories = [
  { id: "all", label: "Everything" },
  { id: "coffee", label: "Coffee" },
  { id: "mugs", label: "Mugs & glassware" },
  { id: "gear", label: "Brewing gear" },
];

CB.grinds = ["Whole bean", "Espresso", "Pour-over", "French press"];

CB.origins = [
  { country: "Ethiopia", region: "Guji", altitude: "2,000 to 2,300 m", notes: "Jasmine, bergamot", product: "ethiopia-guji" },
  { country: "Colombia", region: "Huila", altitude: "1,600 to 1,900 m", notes: "Red apple, caramel", product: "colombia-huila" },
  { country: "Kenya", region: "Nyeri", altitude: "1,700 to 1,900 m", notes: "Blackcurrant, grapefruit", product: "kenya-nyeri" },
  { country: "Guatemala", region: "Huehuetenango", altitude: "1,500 to 1,800 m", notes: "Brown sugar, plum", product: "guatemala-huehue" },
  { country: "Sumatra", region: "Gayo", altitude: "1,300 to 1,600 m", notes: "Dark chocolate, cedar", product: "sumatra-gayo" },
  { country: "Brazil", region: "Cerrado Mineiro", altitude: "1,000 to 1,200 m", notes: "Milk chocolate, hazelnut", product: "house-espresso" },
];

/* Workshops. days uses 0 = Sunday ... 6 = Saturday. time is 24h. */
CB.workshops = [
  {
    id: "barista-fundamentals",
    name: "Home Barista Fundamentals",
    short: "Dial in espresso and steam silky milk on a home machine.",
    description:
      "Learn how grind, dose and time shape a shot, then practice steaming milk for flat whites and cappuccinos. You'll pull at least ten shots of your own.",
    duration: "2.5 hours",
    price: 65,
    capacity: 8,
    days: [6],
    time: "10:00",
    photo: "espressoMachine",
  },
  {
    id: "latte-art",
    name: "Latte Art Lab",
    short: "Hearts, tulips and rosettas, one pitcher at a time.",
    description:
      "Small group, lots of milk. We start with texture and pour height, then build up to tulips and rosettas. Some espresso experience helps.",
    duration: "2 hours",
    price: 75,
    capacity: 6,
    days: [6],
    time: "14:00",
    photo: "latteArt",
  },
  {
    id: "tasting-flight",
    name: "Origins Tasting Flight",
    short: "Taste four origins side by side and learn what makes them different.",
    description:
      "A guided cupping of this season's coffees. Learn to spot acidity, body and sweetness, and leave knowing what you actually like.",
    duration: "1 hour",
    price: 35,
    capacity: 12,
    days: [0, 6],
    time: "11:30",
    photo: "latteBeans",
  },
  {
    id: "pour-over",
    name: "Pour-Over Masterclass",
    short: "Brew a better cup at home with a dripper, a kettle and a scale.",
    description:
      "Ratios, grind size, bloom and pour technique. Bring your own dripper or use ours, and go home with a recipe card and a bag of beans.",
    duration: "2 hours",
    price: 55,
    capacity: 8,
    days: [0],
    time: "14:00",
    photo: "cupSaucer",
  },
];

/* Opening hours. 0 = Sunday. null = closed. */
CB.hours = [
  { day: 1, label: "Monday", open: "07:00", close: "16:00" },
  { day: 2, label: "Tuesday", open: "07:00", close: "16:00" },
  { day: 3, label: "Wednesday", open: "07:00", close: "16:00" },
  { day: 4, label: "Thursday", open: "07:00", close: "16:00" },
  { day: 5, label: "Friday", open: "07:00", close: "17:00" },
  { day: 6, label: "Saturday", open: "08:00", close: "17:00" },
  { day: 0, label: "Sunday", open: "08:00", close: "15:00" },
];

CB.contact = {
  address: ["210 Foundry Street", "Your City, ST 00000"],
  phone: "(555) 014-2016",
  phoneHref: "+15550142016",
  email: "hello@example.com",
  instagram: "https://instagram.com/",
};
