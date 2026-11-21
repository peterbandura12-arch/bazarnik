/**
 * Doladenie kategorií na základe názvu inzerátu.
 *
 * Externé portály (napr. Bazoš, Bazar.sk) uverejňujú smart hodinky, tablety,
 * diely, príslušenstvo či videogry v zle zvolených sekciách. Tieto pravidlá
 * prepíšu mapovanie podľa portálu, keď z názvu jednoznačne vyplýva presnejšia
 * kategória. Pravidlá sa vzťahujú len na kategórie v `onlyIfIn` – tak sa zabráni
 * prepísaniu dobre zaradených inzerátov z iných sekcií.
 *
 * Dôležité: prvé matchujúce pravidlo vyhráva – poradie v RULES je preto
 * zámerné (napr. videogry sa vyhodnotia skôr ako herne konzoly).
 */

interface RefineRule {
  category: string;
  /** Regex alebo funkčný test (pre pravidlá, ktoré samotný regex nezvládne). */
  test: RegExp | ((title: string) => boolean);
  onlyIfIn: string[];
}

// ---------------------------------------------------------------------------
// Mobilné príslušenstvo: funkčný test, lebo samotný regex nestačí.
// Pravidlo: buď je titulok „vedený" slovom príslušenstva, ALEBO titulok
// obsahuje slovo príslušenstva a zároveň NEBOUNUJE žiadny model telefónu
// („obal GUESS" → príslušenstvo, ale „iPhone 13 + kryt" ostanú v telefónoch,
// lebo tam je primárny produkt telefón).

const ACCESSORY_FIRST_TOKEN_RE =
  /^(obal|kryt|fond|puzdro|pouzdro|silik[oó]n|kožen|nabíjač|nabijac|kábel|kabel|adaptér|adapter|držiak|drziak|stojan|fóli|foli|tvrdé sklo|ochranné sklo|s-?pen|stylus|dotykov|memory|sd karta|micro ?sd|pamäťov|príslušenstv|prislusenstv|bezdrôtov|kondenzátor)/i;

const ACCESSORY_WORD_RE =
  /\b(obal|púzdr|puzdr|kryt|fond|fóli|foli|tvrdé sklo|ochranné sklo|nabíjač|nabijac|kábel|kabl|adaptér|adapter|držiak|drziak|stojan|pamäťov|memory\s+card|micro ?sd|s-?pen|stylus|dotykové pero|handričk|príslušenstv|prislusenstv|bezdrôtov)/i;

const PHONE_MODEL_RE =
  /(iphone|\d+\s?gb|galaxy|xiaomi|redmi|huawei|pixel|motorola|nokia|xperia|samsung|oneplus|oppo|realme|honor|sony\s+(xperia|wh|wf))/i;

// Mnozne tvary prislusenstva na konci titulku („IPhone 16e / 17e obaly") –
// plural znamena, ze sa predava prislusenstvo, nie telefon.
const ACCESSORY_END_PLURAL_RE =
  /(\b|\s)(obaly|kryty|p\u00fazdra|puzdra|f\u00f3lie|folie|nab\u00edja\u010dky|nabijacky|adapt\u00e9ry|adaptery|dr\u017eiaky|drziaky|stojany|skl\u00e1|skla)\s*$/i;

function isPhoneAccessory(title: string): boolean {
  const clean = title.trim().replace(/[.!?]+$/, "");
  if (ACCESSORY_FIRST_TOKEN_RE.test(clean)) return true;
  if (ACCESSORY_END_PLURAL_RE.test(clean)) return true;
  if (!ACCESSORY_WORD_RE.test(title)) return false;
  return !PHONE_MODEL_RE.test(title);
}

const RULES: RefineRule[] = [
  // Videogry musia byť vyhodnotené SKÔR ako herne konzoly („FIFA 16 Xbox 360"
  // je hra, nie konzola).
  {
    category: "videohry",
    test:
      /(fifa\s?\d|pes\s?\d|gta\s?[3-6]|gta\s?v|\bgta\b|grand\s?theft|minecraft|call\s?of\s?duty|need\s?for\s?speed|\bnfs\b|farming\s?simulator|forza|battlefield|assassin|tomb\s?raider|hierka|\bhra\b|playstation\s?[2-5]\s+hra|\bxbox\s+(360\s+|\d+\s+)?hra)/i,
    onlyIfIn: ["herne-konzoly", "pocitace-a-gaming", "herna-elektronika", "herne-prislusenstvo"],
  },
  // Herne konzoly (železo, nie hra ani príslušenstvo)
  {
    category: "herne-konzoly",
    test: /(playstation\s*[2-5]|\bps[2-5]\b|\bxbox\b|nintendo|game\s?boy|gameboy|\bpsp\b|ps\s?vita|steam\s?deck|konzol)/i,
    onlyIfIn: ["elektronika", "pocitace-a-gaming", "herna-elektronika", "herne-prislusenstvo", "videohry"],
  },
  // Smart hodinky sa na Bazoši objavujú v sekcii mobil
  {
    category: "smart-hodinky",
    test:
      /(apple\s*watch|galaxy\s*watch|smart\s*watch|smartwatch|smart\s*hodink|amazfit|garmin|fitbit|xiaomi\s*(mi\s*|redmi\s*)?band|mi\s*band|huawei\s*watch|honor\s*watch|watch\s*(gt|se|4|5|6)|swatch|fitness\s*náram)/i,
    onlyIfIn: ["mobilne-telefony", "elektronika", "prislusenstvo-elektronika", "herna-elektronika", "hodinky-moda"],
  },
  // Tablety
  {
    category: "tablety",
    test: /(ipad|tablet|galaxy\s*tab|tab\s*(a|s|se)\s*\d)/i,
    onlyIfIn: ["mobilne-telefony", "elektronika", "notebooky", "pocitace-a-gaming", "prislusenstvo-elektronika"],
  },
  // Mobilné príslušenstvo (funkčný test vyššie)
  {
    category: "prislusenstvo-elektronika",
    test: isPhoneAccessory,
    onlyIfIn: ["mobilne-telefony", "elektronika", "smart-hodinky", "herna-elektronika", "tablety", "fotoaparaty"],
  },
  // Televízory
  {
    category: "televizory",
    test:
      /(televizor|televízor|\btv\b|oled|qled|android\s+tv|philips\s+\d{2}|panasonic\s+tx)/i,
    onlyIfIn: ["elektronika", "dom-a-zahrada", "pocitace-a-gaming", "mobilne-telefony"],
  },
  // Domáce spotrebiče (robotické vysávače, pračky, mrazničky…)
  {
    category: "domace-spotrebice",
    test:
      /(vysávač|vysavac|robotický vys|pračk|prack|sušičk|mrazničk|chladničk|spin[áa]ck|umývačk|umyvack|sporák|sporak|mikrovlnn|žehlič)/i,
    onlyIfIn: ["elektronika", "dom-a-zahrada", "nabytok"],
  },
  // Kuchynské vybavenie
  {
    category: "kuchynske-vybavenie",
    test:
      /(mixér|\bmixer\b|kávovar|kavovar|espress|fritéz|kuchynský robot|\briad\b|hrniec|panvic|príbor|kuchynské nože|odšťavovač|multicook)/i,
    onlyIfIn: ["elektronika", "dom-a-zahrada", "nabytok"],
  },
  // Osvetlenie
  {
    category: "osvetlenie",
    test: /(svietidl|lustr|lampa|\blampy\b|žiarov|LED\s+pás|LED\s+sviet|stropné svietidl|bodové svietidl)/i,
    onlyIfIn: ["elektronika", "dom-a-zahrada", "prislusenstvo-elektronika"],
  },
  // Fotoaparáty, drony a fototechnika
  {
    category: "fotoaparaty",
    test: /(dji|mavic|phantom|\bdron\b|meopta|zväčšovák|zvacsov|polaroid|zrkadlovka|bezzrkadlovka)/i,
    onlyIfIn: ["elektronika", "dom-a-zahrada", "pocitace-a-gaming", "prislusenstvo-elektronika"],
  },
  // Notebooky
  {
    category: "notebooky",
    test: /(notebook|macbook|laptop|thinkpad|\bideapad\b|\bzenbook\b|\bvivobook\b|ultrabook)/i,
    onlyIfIn: ["pocitace-a-gaming", "elektronika", "stolne-pocitace", "mobilne-telefony", "pc-komponenty"],
  },
  // PC komponenty
  {
    category: "pc-komponenty",
    test:
      /(základn|doska|procesor|\bram\b|\bddr[2345]\b|\bcpu\b|chladeni|chladivo|skrinka|napájac|\bpsu\b|ventilátor|geforce|\brtx\s|\bgtx\s|\brx\s+\d{4}|grafick)/i,
    onlyIfIn: ["elektronika", "pocitace-a-gaming", "stolne-pocitace", "ram-a-uloziska", "notebooky"],
  },
  // RAM a úložiská
  {
    category: "ram-a-uloziska",
    test: /(ssd|\bhdd\b|\bnvme\b|\bm\.2|pendrive|usb\s+kľúč|micro\s?sd|pevný disk|externý disk|\bddr[34]\b\s?\d)/i,
    onlyIfIn: ["pocitace-a-gaming", "elektronika", "pc-komponenty", "stolne-pocitace", "prislusenstvo-elektronika"],
  },
  // Náradie a agro/strojové diely (Zetor, Ursus, Takeuchi…)
  {
    category: "naradie",
    test: /(zetor|ursus|locust|narex|sústruh|sustruh|lemese|podmietac|diskovic|medziskri|hydraulik|takeuchi|bobcat|\bjcb\b|nakladač|\bpluh\b|brázdi|\btraktor|\bfreké|\bbrús)/i,
    onlyIfIn: ["dom-a-zahrada", "nabytok"],
  },
  // Pneumatiky a disky nie sú osobné auto (kolesá, disky, gumy)
  {
    category: "pneumatiky-a-disky",
    test:
      /(koles[áa]|koliesk|\bdisk[kyú]?\b|\bdiskov\b|alufel|plechov[ée]\s+disk|pneu\b|pneumatik|zimn[ée]\s+gum|letn[ée]\s+gum|\bgum[yý]\b|sobovacie|\balu\b|\bfelg|\br1[3-9]\b|5x1[0-2]\d|styling\s+\d|\d{3}[\/]\d{2}[\/\s][a-z]?\s?\d{1,2}|\d{3}\s\d{2}\s[a-z]?\d{1,2}|pi?relli|\btaurus\b|barum|bridgestone|hankook|kormoran|goodyear|\bdunlop\b|\bfulda\b|nexen|nokian|\bopona\b|toyo\b|elektron|letn.{0,14}sada|zimn.{0,14}sada|sada\s+(zimn|letn|disk|kolies|gum))/i,
    onlyIfIn: ["osobne-automobily", "dodavky", "uzitkove-vozidla", "autoprislusenstvo"],
  },
  // Prívesné vozíky nie sú osobné auto
  {
    category: "privesne-voziky",
    test: /(prí?vesn[aá][ée]?ĥ?ť?\s?[oó]z[ií]k|\bvozík\b|\bvozik\b|karavan)/i,
    onlyIfIn: ["osobne-automobily", "dodavky", "uzitkove-vozidla", "auto-moto"],
  },
  // Dodávky a dodávkové modely nie sú osobné auto
  {
    category: "dodavky",
    test: /(movano|\bmaster\b|\bboxer\b|ducato|trafic|talento|transit|\bvito\b|viano|kangoo|berlingo|\bpartner\b|caddy|multivan|caravelle|transporter|\bt[3456]\b|dod[aá]vk|furgon|\bproace\b|\btraveller\b|\b[89]\s?miest|\b9miest)/i,
    onlyIfIn: ["osobne-automobily", "uzitkove-vozidla"],
  },
  // Užitkové/nákladné vozidlá (kippery, valníky…) nie sú osobné auto
  {
    category: "uzitkove-vozidla",
    test: /(kipper|kamion|\bvalník|sklápač|\bnákladn)/i,
    onlyIfIn: ["osobne-automobily", "dodavky"],
  },
  // Diely a príslušenstvo nie sú osobné auto (motor, prevodovka, brzdy, dvere…)
  {
    category: "autodiely",
    test:
      /(prevodovk|altern[áa]tor|rozvody|\bturbo\b|brzd[yáié]|stierač|stierac|v[yý]fuk|vyfuk|karos[ée]ri|nárazov|n[aá]razn|zrkadl|svetlomet|\bmotor\b|\bmotora\b|fil[táa]r|filter|senzor|bateria|oprava|pružen|kardan|aretač|matabro|podvozok|katalyz|zdvih|klakson|n[áa]hradn[ée]\s+diel|\bdiely|\bdielcov|dver[eí]|kapot|\btlmi|amortiz|závesn|clonitk|volant|autosklo|\bskl[oá]\b|bud[ií]k|sp[íi]na|přepínač|prepinac|koncovk|mrie[žz]k|obličk|sed[aá]č?c?k|\bprah\b|st[ĺl]pik|airbag|podblatn|hlava\s+valcov|n[áa]prav|chlad|xenon|\bokn|rozpredaj|\bdielov|v[ýy]stuh|\br[áa]di|\bpredok|motorcek)/i,
    onlyIfIn: ["osobne-automobily", "dodavky", "uzitkove-vozidla", "autoprislusenstvo"],
  },
  // Diely motocyklov nie sú motocykel
  {
    category: "motodiely",
    test:
      /(\bdiel|koles|motocyklov[áee]\s+(motor|výfuk|brzd|rám)|profilov?[áa]|\bkufor\b|svetlomet|zrkadl|prevodovk|plechov?|\btlmi|amortiz)/i,
    onlyIfIn: ["motocykle"],
  },
  // Autopríslušenstvo (koberce, kryty, kufríky…)
  {
    category: "autoprislusenstvo",
    test:
      /(koberec|koberce|kryty|kryt\s+|po?tah|kufor\s+auta|dekor|diagnostk|kamera\s+do\s+auta|palubn|termopast|glyc[ée]r|aditív|roletk|št[ií]t|nab[ií]ja)/i,
    onlyIfIn: ["osobne-automobily"],
  },
  // Šperky a bižutéria (Pandora náramky nie sú oblečenie)
  {
    category: "sperky",
    test: /(pandora|prívesok|privesok|náramok|naramok|prsteň|prstene|naušnic|bizut|\bsperk)/i,
    onlyIfIn: ["oblecenie-a-moda", "panske-oblecenie", "damske-oblecenie", "detske-oblecenie-moda", "modne-doplnky", "hodinky-moda"],
  },
  // Elektromobilita
  {
    category: "elektromobilita",
    test:
      /(elektrick[ýáé].{0,20}(kolobežk|skúter|scooter)|e-?scooter|ninebot|segway|xiaomi\s+scooter|m365)/i,
    onlyIfIn: ["sport-a-outdoor", "sportove-vybavenie", "deti-a-hracky", "hracky", "elektronika", "cyklistika"],
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
    const hit = typeof rule.test === "function" ? rule.test(title) : rule.test.test(title);
    if (hit) return rule.category;
  }
  return categorySlug;
}
