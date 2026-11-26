var guests = 0,
  mealType = "appetizer",
  costTier = "mid";
var shopItems = {},
  generalItems = {},
  boardSelected = {};
var vboardStyle = "oval-board",
  dragItem = null,
  dragOffX = 0,
  dragOffY = 0;
var communityPosts = [],
  activeFilter = "all",
  shareFormOpen = false;
var mealMultipliers = { appetizer: 1, main: 1.8, grazing: 2.5 };
var mealNotes = {
  appetizer: "For a pre-dinner appetizer spread, guests graze lightly. Pair with wine or cocktails.",
  main: "As a main course, guests eat significantly more.",
  grazing: "For all-day events, keep topping up. Start with 60% and replenish.",
};
var tierPrices = {
  budget: { meats: 8, cheeses: 6, crackers: 3, produce: 2, accents: 4, spreads: 3, specialty: 12 },
  mid: { meats: 14, cheeses: 10, crackers: 5, produce: 3, accents: 6, spreads: 5, specialty: 20 },
  premium: { meats: 22, cheeses: 18, crackers: 8, produce: 5, accents: 10, spreads: 8, specialty: 35 },
};
var tierNotes = {
  budget: "Budget: deli salamis, block cheddars, store-brand crackers.",
  mid: "Mid-range: imported prosciutto, specialty cheeses, artisan crackers.",
  premium: "Premium: Jamon Iberico, aged Gruyere, truffle accompaniments.",
  custom: "Type your own prices below.",
};
var boardItemDefs = {
  meats: {
    label: "Cured Meats",
    items: ["Prosciutto", "Serrano Ham", "Speck", "Salami", "Saucisson Sec", "Soppressata", "Coppa", "Bresaola", "Pepperoni", "Chorizo", "Mortadella", "Beef sticks"],
  },
  cheeses: {
    label: "Cheeses",
    items: ["Brie", "Aged Cheddar", "Manchego", "Gouda", "Gorgonzola", "Goat Cheese", "Gruyere", "Parmigiano"],
  },
  produce: {
    label: "Produce & Pickles",
    items: [
      "Grapes",
      "Strawberries",
      "Blackberries",
      "Raspberries",
      "Blueberries",
      "Figs",
      "Mango",
      "Pineapple",
      "Blood Orange",
      "Clementines",
      "Seasonal Melon",
      "Olives",
      "Cornichons",
      "Cherry tomatoes",
      "Apple slices",
      "Pear",
    ],
  },
  crackers: {
    label: "Crackers & Bread",
    items: [
      "Water crackers",
      "Sourdough crisps",
      "Rye crisps",
      "Crostini",
      "Fig crackers",
      "Pita chips",
      "Multigrain crackers",
    ],
  },
  accents: {
    label: "Accents & Sweets",
    items: [
      "Honeycomb",
      "Marcona almonds",
      "Walnuts",
      "Dark chocolate",
      "Dried apricots",
      "Candied pecans",
      "Pistachios",
    ],
  },
  spreads: {
    label: "Spreads & Dips",
    items: [
      "Dijon mustard",
      "Fig jam",
      "Strawberry jam",
      "Apricot jam",
      "Hot honey",
      "Hummus",
      "Pesto",
      "Berry preserve",
      "Grainy mustard",
      "Truffle honey",
    ],
  },
  specialty: {
    label: "Specialty Items",
    items: [
      "Pate",
      "Duck rillettes",
      "Caviar",
      "Smoked salmon",
      "Truffle salami",
      "Foie gras",
      "Jamon Iberico",
      "Nduja",
    ],
  },
};
var foodIcons = {
  meats: { emoji: "&#x1F969;", bg: "#FDEEE8" },
  cheeses: { emoji: "&#x1F9C0;", bg: "#FDF8E8" },
  produce: { emoji: "&#x1F347;", bg: "#EEF5E8" },
  crackers: { emoji: "&#x1FAD3;", bg: "#EEF0F8" },
  accents: { emoji: "&#x1F36F;", bg: "#F5EEF8" },
  spreads: { emoji: "&#x1FAD9;", bg: "#EEFAF8" },
  specialty: { emoji: "&#x2B50;", bg: "#FEF0E8" },
};
var itemEmojis = {
  Prosciutto: "&#x1F969;",
  "Beef sticks": "&#x1F356;",
  Salami: "&#x1F355;",
  Soppressata: "&#x1F336;",
  Chorizo: "&#x1F336;",
  Brie: "&#x1F9C0;",
  "Aged Cheddar": "&#x1F9C0;",
  Manchego: "&#x1F9C0;",
  Grapes: "&#x1F347;",
  Strawberries: "&#x1F353;",
  Blackberries: "&#x1FAD0;",
  Raspberries: "&#x1F353;",
  Blueberries: "&#x1FAD0;",
  Figs: "&#x1F351;",
  Mango: "&#x1F96D;",
  Pineapple: "&#x1F34D;",
  "Blood Orange": "&#x1F34A;",
  Clementines: "&#x1F34A;",
  Olives: "&#x1FAD2;",
  Cornichons: "&#x1F952;",
  "Cherry tomatoes": "&#x1F345;",
  "Apple slices": "&#x1F34E;",
  Pear: "&#x1F350;",
  Honeycomb: "&#x1F36F;",
  "Marcona almonds": "&#x1F330;",
  Walnuts: "&#x1F330;",
  "Dark chocolate": "&#x1F36B;",
  Caviar: "&#x1F41F;",
  "Smoked salmon": "&#x1F41F;",
};
var flavorProfiles = {
  meats: { salty: 4, savory: 5, smoky: 3, sweet: 0, acidic: 1, bitter: 0, creamy: 0, crunchy: 0 },
  cheeses: { salty: 3, savory: 4, smoky: 0, sweet: 1, acidic: 1, bitter: 1, creamy: 5, crunchy: 0 },
  produce: { salty: 0, savory: 1, smoky: 0, sweet: 3, acidic: 3, bitter: 1, creamy: 0, crunchy: 2 },
  crackers: { salty: 2, savory: 2, smoky: 0, sweet: 0, acidic: 0, bitter: 0, creamy: 0, crunchy: 5 },
  accents: { salty: 1, savory: 1, smoky: 0, sweet: 5, acidic: 1, bitter: 2, creamy: 0, crunchy: 3 },
  spreads: { salty: 2, savory: 2, smoky: 0, sweet: 3, acidic: 2, bitter: 1, creamy: 3, crunchy: 0 },
  specialty: { salty: 3, savory: 5, smoky: 1, sweet: 0, acidic: 0, bitter: 1, creamy: 4, crunchy: 0 },
};
var flavorColors = {
  salty: "#C17A3A",
  savory: "#9B4A1F",
  smoky: "#6B5744",
  sweet: "#B84A7A",
  acidic: "#4A7A3A",
  bitter: "#3A4A7A",
  creamy: "#8B6914",
  crunchy: "#4A6741",
};
// Tools tab. Each "q" is an Amazon search; the store's Associates tag is added by amazonLink().
// To point an item at one specific product later, replace "q" with "url": "https://www.amazon.com/dp/...".
var AMAZON_TAG = "882803f-20";
var toolsList = [
  { icon: "&#x1F381;", name: "Starter kit: board + knives", desc: "A board and knife set together, the easiest way to start.", cat: "Starter kit", q: "charcuterie+board+and+knife+set" },
  { icon: "&#x1FAB5;", name: "Wood charcuterie boards", desc: "Acacia, walnut, and maple boards in various sizes.", cat: "Boards", q: "acacia+charcuterie+board+with+handle" },
  { icon: "&#x2B1B;", name: "Slate serving boards", desc: "Elegant dark slate for high-contrast presentation.", cat: "Boards", q: "slate+cheese+board+with+chalk" },
  { icon: "&#x1F52A;", name: "Cheese knives set", desc: "Spreaders, chisels, and slicers for every texture.", cat: "Knives", q: "cheese+knife+set+wood+handle" },
  { icon: "&#x1F37D;", name: "Mini ramekins & bowls", desc: "For olives, jams, honey, and dips.", cat: "Serveware", q: "ceramic+ramekins+dip+bowls+set" },
  { icon: "&#x1F9C5;", name: "Charcuterie picks & forks", desc: "Small picks for easy grabbing.", cat: "Serveware", q: "bamboo+cocktail+picks+knotted" },
  { icon: "&#x1FAD9;", name: "Small glass jars", desc: "Perfect for portioned condiments.", cat: "Serveware", q: "small+glass+jars+with+lids+honey" },
  { icon: "&#x1F4C4;", name: "Parchment & wax paper", desc: "For lining boards and presentation.", cat: "Supplies", q: "parchment+paper+sheets+precut" },
  { icon: "&#x1F33F;", name: "Fresh herb bundles", desc: "Rosemary, thyme, sage. The cheapest visual upgrade: pick them up with your groceries.", cat: "Garnishes" },
  { icon: "&#x1F3F7;", name: "Mini chalk labels", desc: "Label cheeses and meats like a pro.", cat: "Supplies", q: "mini+chalkboard+cheese+markers" },
  { icon: "&#x1F9FA;", name: "Grazing table liners", desc: "Butcher paper rolls for lining a grazing table.", cat: "Supplies", q: "butcher+paper+roll+18+inch" },
];
function amazonLink(tool) {
  if (tool.url) return tool.url + (tool.url.indexOf("?") > -1 ? "&" : "?") + "tag=" + AMAZON_TAG;
  return "https://www.amazon.com/s?k=" + tool.q + "&tag=" + AMAZON_TAG;
}
// Posts from Lynn's Everyday Rituals blog. Each card opens the full post on quinnandcogulfcoast.com.
// To add a post: copy one entry, change the title, link, short summary and photo (photo is optional).
var BLOG_HOME = "https://quinnandcogulfcoast.com/everyday-rituals-a-blog";
var blogPosts = [
  { title: "How to Build a Grazing Table for 40+ Guests", url: "https://quinnandcogulfcoast.com/everyday-rituals-a-blog/f/how-to-build-a-grazing-table-for-40-guests", summary: "How we build grazing tables that become the edible centerpiece of weddings, parties and milestone celebrations.", img: "https://img1.wsimg.com/isteam/ip/b5967de9-1d48-40b3-a7bb-31735b987bec/DSC_8579-2c457e8.jpg", color: "#ff8a3d" },
  { title: "How to Keep Everyone Out of the Kitchen on Thanksgiving Day", url: "https://quinnandcogulfcoast.com/everyday-rituals-a-blog/f/how-to-keep-everyone-out-of-the-kitchen-on-thanksgiving-day", summary: "Give guests somewhere better to gather while you cook.", img: "https://img1.wsimg.com/isteam/ip/b5967de9-1d48-40b3-a7bb-31735b987bec/thanksgiving-grazing-board-bradenton.jpg.JPEG", color: "#d63c74" },
  { title: "DIY vs. Hiring Help: An Honest Guide to Where Your Money Matters", url: "https://quinnandcogulfcoast.com/everyday-rituals-a-blog/f/diy-vs-hiring-help-an-honest-guide-to-where-your-money-matters", summary: "You don't need to hire out everything. Here's where paying for help is worth it.", img: "https://img1.wsimg.com/isteam/stock/G7Kade", color: "#9b8cf2" },
  { title: "A Guide to Hosting Effortless Events on Florida's Gulf Coast", url: "https://quinnandcogulfcoast.com/everyday-rituals-a-blog/f/a-guide-to-hosting-effortless-events-on-floridas-gulf-coast", summary: "Our guide to relaxed, beautiful gatherings on the Gulf Coast.", img: "", color: "#3fc1a5" },
  { title: "Beat the Heat: Charcuterie Tips for Florida's Outdoor Events", url: "https://quinnandcogulfcoast.com/everyday-rituals-a-blog/f/beat-the-heat-charcuterie-tips-for-floridas-outdoor-events", summary: "Keep your board fresh and beautiful at outdoor gatherings in the heat.", img: "https://img1.wsimg.com/isteam/ip/b5967de9-1d48-40b3-a7bb-31735b987bec/IMG_2930.JPEG", color: "#4aa8e0" },
  { title: "Every Host Deserves to Slow Down and Savor the Moment", url: "https://quinnandcogulfcoast.com/everyday-rituals-a-blog/f/every-host-deserves-to-slow-down-and-savor-the-moment", summary: "A reminder to pause and enjoy the party you worked so hard on.", img: "https://img1.wsimg.com/isteam/ip/b5967de9-1d48-40b3-a7bb-31735b987bec/Colorful%20Spread.png", color: "#ffd23f" },
];
var tips = [
  {
    title: "The rule of 3s",
    icon: "&#x1F3A8;",
    bg: "#FDF5EF",
    content: "Build visual balance with at least 3 meats, 3 cheeses, and 3 accompaniments.",
  },
  {
    title: "Temperature matters",
    blog: 4,
    icon: "&#x1F321;",
    bg: "#EEF5E8",
    content: "Pull meats and cheeses from the fridge 30-45 minutes before serving.",
  },
  {
    title: "Board sizing guide",
    blog: 0,
    icon: "&#x1F4D0;",
    bg: "#EEF0F8",
    content:
      '<ul><li><strong>1-4 guests:</strong> 10-12" board</li><li><strong>5-10 guests:</strong> 14-16" board</li><li><strong>11-20 guests:</strong> 18"+ plank</li><li><strong>20+ guests:</strong> Grazing table</li></ul>',
  },
  {
    title: "Classic pairings",
    icon: "&#x1F377;",
    bg: "#F5EEF8",
    content: "",
    pairings: [
      { cheese: "Brie", pair: "Champagne or Pinot Noir" },
      { cheese: "Aged Cheddar", pair: "Cabernet or IPA" },
      { cheese: "Manchego", pair: "Rioja or Tempranillo" },
      { cheese: "Gorgonzola", pair: "Port or dessert wine" },
      { cheese: "Goat Cheese", pair: "Sauvignon Blanc" },
      { cheese: "Gruyere", pair: "White Burgundy" },
    ],
  },
  {
    title: "Filling the board",
    icon: "&#x2736;",
    bg: "#FDF8E8",
    content:
      "Place cheeses first. Add vessels for wet items. Roll or fold meats for height. Fill gaps with produce and nuts.",
  },
  {
    title: "Pro quantity tips",
    icon: "&#x1F4A1;",
    bg: "#FDF5EF",
    content:
      "<ul><li>Always buy more than you think you need</li><li>Whole grapes look better than cut</li><li>Fresh herbs are the cheapest visual upgrade</li></ul>",
  },
];
var seedPosts = [
  {
    id: 1,
    title: "Gulf Coast Holiday Board",
    user: "@coastalchef",
    avatar: "CC",
    avatarColor: "#9B4A1F",
    occasion: "Holiday gathering",
    emoji: "&#127876;",
    bg: "linear-gradient(135deg,#1a4a2e,#2d6b45)",
    likes: 47,
    liked: false,
    items: ["Prosciutto", "Brie", "Grapes", "Honeycomb"],
    desc: "My go-to for the holidays!",
  },
  {
    id: 2,
    title: "Date Night Luxe Board",
    user: "@boardcraft_gal",
    avatar: "BG",
    avatarColor: "#374A8B",
    occasion: "Date night",
    emoji: "&#128329;",
    bg: "linear-gradient(135deg,#2c1a3a,#4a2d6b)",
    likes: 83,
    liked: false,
    items: ["Jamon Iberico", "Aged Cheddar", "Figs", "Caviar"],
    desc: "For when you want to really impress.",
  },
  {
    id: 3,
    title: "Backyard Summer Graze",
    user: "@gulfgrazin",
    avatar: "GG",
    avatarColor: "#4A6741",
    occasion: "Everyday grazing",
    emoji: "&#9728;",
    bg: "linear-gradient(135deg,#4a6b1a,#7aa030)",
    likes: 31,
    liked: false,
    items: ["Salami", "Manchego", "Strawberries", "Blueberries"],
    desc: "Light, fresh, and perfect for the patio.",
  },
  {
    id: 4,
    title: "Wedding Cocktail Hour",
    user: "@quinnandco",
    avatar: "QC",
    avatarColor: "#C17A3A",
    occasion: "Wedding / event",
    emoji: "&#128141;",
    bg: "linear-gradient(135deg,#6b4a1a,#a07030)",
    likes: 126,
    liked: false,
    items: ["Prosciutto", "Brie", "Pate", "Caviar", "Honeycomb"],
    desc: "Our signature wedding board!",
  },
];

