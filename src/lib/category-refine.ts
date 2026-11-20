/**
 * Doladenie kategorií na základe názvu inzerátu.
 *
 * Externé portály (napr. Bazoš) uverejnujú smart hodinky, tablety či slúchadlá
 * v sekcii Mobilné telefóny. To spôsobuje nesprávne zaradenie. Tieto pravidlá
 * prepíšu mapovanie podľa portálu, keď z názvu jednoznačne vyplýva presnejšia
 * kategória. Pravidla sa vzťahujú len na kategórie v `onlyIfIn` – tak sa zabráni
 * prepísaniu dobre zaradených inzerátov z iných sekcií.
 */

interface RefineRule {
  category: string;
  test: RegExp;
  onlyIfIn: string[];
}

const RULES: RefineRule[] = [
  // Smart hodinky sa na Bazoši objavujú v sekcii mobil
  {
    category: "smart-hodinky",
    test:
      /(apple\s*watch|galaxy\s*watch|smart\s*watch|smartwatch|smart\s*hodink|amazfit|garmin|fitbit|xiaomi\s*(mi\s*|redmi\s*)?band|mi\s*band|huawei\s*watch|honor\s*watch|watch\s*(gt|se|\d)|swatch|smartwatch|hodink)/i,
    onlyIfIn: ["mobilne-telefony", "elektronika", "prislusenstvo-elektronika", "herna-elektronika"],
  },
  // Tablety
  {
    category: "tablety",
    test: /(ipad|tablet|galaxy\s*tab|tab\s*(a|s|se)\s*\d)/i,
    onlyIfIn: ["mobilne-telefony", "elektronika", "notebooky", "pocitace-a-gaming"],
  },
  // Slúchadlá
  {
    category: "sluchadla",
    test: /(airpods|sluchadl|earbuds|headset|galaxy\s*buds|bassbuds|halo|\bbuds\b)/i,
    onlyIfIn: ["mobilne-telefony", "elektronika", "prislusenstvo-elektronika"],
  },
  // Notebooky
  {
    category: "notebooky",
    test: /(notebook|macbook|laptop|thinkpad|\bideapad\b|\bzenbook\b|\bvivobook\b)/i,
    onlyIfIn: ["pocitace-a-gaming", "elektronika", "stolne-pocitace", "mobilne-telefony"],
  },
  // Grafické karty
  {
    category: "graficke-karty",
    test: /(rtx\s*\d|gtx\s*\d|\brx\s*\d{4}|grafic)/i,
    onlyIfIn: ["pocitace-a-gaming", "pc-komponenty", "stolne-pocitace", "elektronika"],
  },
  // Pneumatiky a disky nie sú osobné auto (kolesá, disky, gumy…)
  {
    category: "pneumatiky-a-disky",
    test:
      /(koles[áa]|koliesk|\bdisk[kyú]?\b|\bdiskov\b|alufel|plechov[ée]\s+disk|pneu\b|pneumatik|zimn[ée]\s+gum|letn[ée]\s+gum|\bgum[yý]\b|sobovacie)/i,
    onlyIfIn: ["osobne-automobily", "dodavky", "uzitkove-vozidla"],
  },
  // Diely a príslušenstvo nie sú osobné auto (motor, prevodovka, brzdy…)
  {
    category: "autodiely",
    test:
      /(prevodovk|altern[áa]tor|rozvody|\bturbo\b|brzd[yáié]|brzdov|stierač|v[yý]fuk|karos[ée]ri|n[áa]razov|zrkadl|svetlomet|\bmotor\b|\bmotora\b|filtr|senzor|kardan|podvozok|katalyz|zdvih|klakson|plechov?|n[áa]hradn[ée]\s+diel|\bdiely\b|\bdiel\b|rozde)/i,
    onlyIfIn: ["osobne-automobily", "dodavky", "uzitkove-vozidla"],
  },
  // Diely motocyklov nie sú motocykel
  {
    category: "motodiely",
    test:
      /(\bdiel|koles|motocyklov[áee]\s+(motor|v[yý]fuk|brzd|rám)|profilov?[áa]|\bkufor\b|\bkufr\b|svetlomet|zrkadl|prevodovk|plechov?)/i,
    onlyIfIn: ["motocykle"],
  },
  // Autopríslušenstvo (koberce, kryty, kufre…)
  {
    category: "autoprislusenstvo",
    test: /(koberec|koberce|kryty|kryt\s+|pon?tah|pon?tahy|kufor\s+auta| dekor|diagnostk|kamera\s+do\s+auta|palubn|termopast|glyc[ée]r|n[áa]pl[ňn]|olaj|aditív)/i,
    onlyIfIn: ["osobne-automobily"],
  },
];

/**
 * Vráti presnejší slug kategórie podľa názvu, ak existuje. Inak vráti pôvodný
 * slug tak, ako prišiel z portálu.
 */
export function refineCategoryByTitle(
  title: string,
  categorySlug: string | null
): string | null {
  if (!categorySlug) return categorySlug;
  for (const rule of RULES) {
    if (!rule.onlyIfIn.includes(categorySlug)) continue;
    if (rule.test.test(title)) return rule.category;
  }
  return categorySlug;
}
