const STORAGE_KEY = "ms_translations";

// Full hardcoded translation map
const BUILT_IN_MAP = {
  // Food
  nasta: "Food",
  khabar: "Food",
  khana: "Food",
  vaat: "Food",
  food: "Food",
  porota: "Food",
  paratha: "Food",
  puri: "Food",
  roast: "Food",
  biryani: "Food",
  "morog polao": "Food",
  iftar: "Food",
  grill: "Food",
  pitha: "Food",
  biscuit: "Food",
  biscuits: "Food",
  wafers: "Food",
  wafer: "Food",
  chanachur: "Food",
  nimki: "Food",
  chocolate: "Food",
  "ice cream": "Food",
  "ice-cream": "Food",
  "ice-creams": "Food",
  jilapi: "Food",
  mishti: "Food",
  doi: "Food",
  velpuri: "Food",
  piyaju: "Food",
  coffee: "Food",
  coke: "Food",
  juice: "Food",
  tang: "Food",
  snacks: "Food",
  bread: "Food",

  // Groceries → Food
  torkari: "Food",
  egg: "Food",
  dim: "Food",
  chatni: "Food",
  shutki: "Food",
  gom: "Food",
  ata: "Food",
  alu: "Food",
  daal: "Food",
  dal: "Food",
  murgi: "Food",
  apple: "Food",
  kola: "Food",
  peyara: "Food",
  lebu: "Food",
  tormuz: "Food",
  boroi: "Food",
  khejur: "Food",
  fruits: "Food",
  fruit: "Food",
  shak: "Food",
  shobji: "Food",
  dherosh: "Food",
  chal: "Food",
  peyaj: "Food",
  piyaj: "Food",
  beshon: "Food",
  chola: "Food",
  mach: "Food",
  rui: "Food",
  pangash: "Food",
  koi: "Food",
  goru: "Food",
  holud: "Food",
  morich: "Food",
  chira: "Food",
  muri: "Food",
  chini: "Food",
  jeera: "Food",
  roshun: "Food",
  badam: "Food",
  dhoniya: "Food",
  guri: "Food",
  "chira muri": "Food",

  // Transport
  vara: "Transport",
  uber: "Transport",
  indrive: "Transport",
  rickshaw: "Transport",
  transport: "Transport",
  bus: "Transport",
  cng: "Transport",
  auto: "Transport",
  "bike ride": "Transport",
  fare: "Transport",

  // Utilities
  "gas bill": "Utilities",
  "electric bill": "Utilities",
  "electricity bill": "Utilities",
  light: "Utilities",
  lights: "Utilities",
  "net bill": "Utilities",
  "mobile recharge": "Utilities",
  recharge: "Utilities",
  "water bill": "Utilities",
  internet: "Utilities",
  wifi: "Utilities",

  // Healthcare
  medicine: "Healthcare",
  hexixol: "Healthcare",
  fexo: "Healthcare",
  isobgul: "Healthcare",
  doctor: "Healthcare",
  mri: "Healthcare",
  "golar kata": "Healthcare",
  hospital: "Healthcare",
  pharmacy: "Healthcare",
  "eye drop": "Healthcare",
  tablet: "Healthcare",
  injection: "Healthcare",

  // Personal Care
  toothpaste: "Personal Care",
  barbar: "Personal Care",
  napit: "Personal Care",
  haircut: "Personal Care",
  shampoo: "Personal Care",
  soap: "Personal Care",
  "face wash": "Personal Care",
  cream: "Personal Care",

  // Household
  "guard bill": "Household",
  "guard fee": "Household",
  guard: "Household",
  match: "Household",
  "washing powder": "Household",
  mortein: "Household",
  coil: "Household",
  wardrobe: "Household",
  wadrobe: "Household",
  "shoe cabinet": "Household",
  shelf: "Household",
  bedsheet: "Household",
  balish: "Household",
  floormat: "Household",
  "floor-mat": "Household",
  regulator: "Household",
  cover: "Household",
  mop: "Household",
  plumber: "Household",
  electrician: "Household",
  labor: "Household",
  mistri: "Household",
  tailor: "Household",
  gach: "Household",
  "home maintenance": "Household",
  cleaning: "Household",

  // Shopping
  "shoe bag": "Shopping",
  bag: "Shopping",
  daraz: "Shopping",
  "eid shopping": "Shopping",
  jama: "Shopping",
  shari: "Shopping",
  cap: "Shopping",
  shoes: "Shopping",
  clothes: "Shopping",
  dress: "Shopping",

  // Charity
  masjid: "Charity",
  daan: "Charity",
  charity: "Charity",
  tarabi: "Charity",
  hujur: "Charity",
  donation: "Charity",
  sadaqah: "Charity",

  // Family
  abbu: "Family",
  amma: "Family",
  family: "Family",
  baba: "Family",

  // Entertainment
  movie: "Entertainment",
  cinema: "Entertainment",
  netflix: "Entertainment",
  games: "Entertainment",
  concert: "Entertainment",

  // Education
  "online course": "Education",
  "form fee": "Education",
  school: "Education",
  college: "Education",
  books: "Education",
  stationery: "Education",
  tuition: "Education",

  // Work
  office: "Work",
  "office expense": "Work",

  // Childcare
  stroller: "Childcare",
  "baby food": "Childcare",
  diapers: "Childcare",
  "baby clothes": "Childcare",

  // Debt
  baki: "Debt",
  loan: "Debt",
  "due payment": "Debt",

  // Electronics
  ips: "Electronics",
  phone: "Electronics",
  charger: "Electronics",
  laptop: "Electronics",
  headphone: "Electronics",

  // Pets
  "cat food": "Pets",
  "dog food": "Pets",
  vet: "Pets",

  // Other
  fine: "Other",
  extras: "Other",
  misc: "Other",
  miscellaneous: "Other",
};

// Load user-learned mappings from localStorage
function getSavedMappings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMappings(mappings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

// Translate a single item name
export function translateItem(name) {
  const key = name.toLowerCase().trim();
  const saved = getSavedMappings();
  return saved[key] || BUILT_IN_MAP[key] || null;
}

// Get all unknown items that need AI translation
export function getUnknownItems(items) {
  const saved = getSavedMappings();
  return items.filter((item) => {
    const key = item.toLowerCase().trim();
    return !BUILT_IN_MAP[key] && !saved[key];
  });
}

// Ask Claude to translate unknown items only
export async function translateUnknownItems(unknownItems) {
  if (unknownItems.length === 0) return;

  const prompt = `You are a bilingual Bengali-English expense categorizer.
Translate and categorize these expense items into one of these exact categories:
Food, Transport, Utilities, Healthcare, Personal Care, Household, Shopping, Charity, Family, Entertainment, Education, Work, Childcare, Debt, Electronics, Pets, Other

Items: ${unknownItems.join(", ")}

Rules:
- Items may be Bengali written in English letters (Banglish)
- Return ONLY valid JSON, no markdown, no explanation
- Every item must map to one of the 17 categories above exactly
- Example: {"new item": "Food", "another": "Transport"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Save newly learned mappings
    const saved = getSavedMappings();
    saveMappings({ ...saved, ...parsed });
  } catch (e) {
    console.warn("AI translation failed:", e);
  }
}

// Parse a raw expense string like "nasta=60, vara=40, gas bill=1100"
// Returns array of { name, amount } grouped by category
export function parseRawExpenses(raw) {
  const saved = getSavedMappings();
  const categoryTotals = {};

  raw.split(",").forEach((part) => {
    const eqIndex = part.lastIndexOf("=");
    if (eqIndex === -1) return;

    const name = part.slice(0, eqIndex).trim().toLowerCase();
    const amount = parseFloat(part.slice(eqIndex + 1).trim()) || 0;
    if (!name || !amount) return;

    const category = saved[name] || BUILT_IN_MAP[name] || "Other";

    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  });

  return Object.entries(categoryTotals).map(([name, amount]) => ({
    name,
    amount: amount.toFixed(2),
  }));
}

// Extract all unique item names from an array of raw expense strings
export function extractUniqueItems(rawStrings) {
  const items = new Set();
  rawStrings.forEach((raw) => {
    raw.split(",").forEach((part) => {
      const eqIndex = part.lastIndexOf("=");
      if (eqIndex === -1) return;
      const name = part.slice(0, eqIndex).trim().toLowerCase();
      if (name) items.add(name);
    });
  });
  return [...items];
}

// View or edit the learned mappings (for a settings UI later)
export function getAllMappings() {
  const saved = getSavedMappings();
  return { ...BUILT_IN_MAP, ...saved };
}

export function addCustomMapping(item, category) {
  const saved = getSavedMappings();
  saveMappings({ ...saved, [item.toLowerCase().trim()]: category });
}

export function removeCustomMapping(item) {
  const saved = getSavedMappings();
  delete saved[item.toLowerCase().trim()];
  saveMappings(saved);
}
