export interface CategoryNode {
  slug: string;
  name: string;
  children: CategoryNode[];
}

/**
 * Statický strom kategórií – používa sa pre navigáciu a ako fallback,
 * kým nie je pripojená databáza. Zdrojom pravdy je tabuľka `categories`
 * v Supabase (supabase/seed-categories.sql má identickú štruktúru).
 */
export const CATEGORY_TREE: CategoryNode[] = [
  {
    slug: "elektronika",
    name: "Elektronika",
    children: [
      { slug: "mobilne-telefony", name: "Mobilné telefóny", children: [] },
      { slug: "tablety", name: "Tablety", children: [] },
      { slug: "smart-hodinky", name: "Smart hodinky", children: [] },
      { slug: "sluchadla", name: "Slúchadlá", children: [] },
      { slug: "fotoaparaty", name: "Fotoaparáty", children: [] },
      { slug: "televizory", name: "Televízory", children: [] },
      { slug: "audio-technika", name: "Audio technika", children: [] },
      { slug: "prislusenstvo-elektronika", name: "Príslušenstvo", children: [] },
      { slug: "nabijacky-a-kable", name: "Nabíjačky a káble", children: [] },
      { slug: "herna-elektronika", name: "Herná elektronika", children: [] },
    ],
  },
  {
    slug: "pocitace-a-gaming",
    name: "Počítače a gaming",
    children: [
      { slug: "notebooky", name: "Notebooky", children: [] },
      { slug: "stolne-pocitace", name: "Stolné počítače", children: [] },
      { slug: "pc-komponenty", name: "PC komponenty", children: [] },
      { slug: "graficke-karty", name: "Grafické karty", children: [] },
      { slug: "procesory", name: "Procesory", children: [] },
      { slug: "ram-a-uloziska", name: "RAM a úložiská", children: [] },
      { slug: "monitory", name: "Monitory", children: [] },
      { slug: "klavesnice-a-mysi", name: "Klávesnice a myši", children: [] },
      { slug: "herne-konzoly", name: "Herné konzoly", children: [] },
      { slug: "videohry", name: "Videohry", children: [] },
      { slug: "herne-prislusenstvo", name: "Herné príslušenstvo", children: [] },
      { slug: "herne-stolicky", name: "Herné stoličky", children: [] },
    ],
  },
  {
    slug: "auto-moto",
    name: "Auto-moto",
    children: [
      { slug: "osobne-automobily", name: "Osobné automobily", children: [] },
      { slug: "motocykle", name: "Motocykle", children: [] },
      { slug: "stvorkolky", name: "Štvorkolky", children: [] },
      { slug: "dodavky", name: "Dodávky", children: [] },
      { slug: "uzitkove-vozidla", name: "Úžitkové vozidlá", children: [] },
      { slug: "autodiely", name: "Autodiely", children: [] },
      { slug: "pneumatiky-a-disky", name: "Pneumatiky a disky", children: [] },
      { slug: "autoprislusenstvo", name: "Autopríslušenstvo", children: [] },
      { slug: "motodiely", name: "Motodiely", children: [] },
      { slug: "privesne-voziky", name: "Prívesné vozíky", children: [] },
      { slug: "elektromobilita", name: "Elektromobilita", children: [] },
    ],
  },
  {
    slug: "dom-a-zahrada",
    name: "Dom a záhrada",
    children: [
      { slug: "nabytok", name: "Nábytok", children: [] },
      { slug: "dekoracie", name: "Dekorácie", children: [] },
      { slug: "osvetlenie", name: "Osvetlenie", children: [] },
      { slug: "domace-spotrebice", name: "Domáce spotrebiče", children: [] },
      { slug: "kuchynske-vybavenie", name: "Kuchynské vybavenie", children: [] },
      { slug: "zahradny-nabytok", name: "Záhradný nábytok", children: [] },
      { slug: "zahradna-technika", name: "Záhradná technika", children: [] },
      { slug: "naradie", name: "Náradie", children: [] },
      { slug: "stavebny-material", name: "Stavebný materiál", children: [] },
      { slug: "vykurovanie", name: "Vykurovanie", children: [] },
      { slug: "bazeny", name: "Bazény a príslušenstvo", children: [] },
    ],
  },
  {
    slug: "sport-a-outdoor",
    name: "Šport a outdoor",
    children: [
      { slug: "fitness", name: "Fitness", children: [] },
      { slug: "cyklistika", name: "Cyklistika", children: [] },
      { slug: "lezenie", name: "Lezenie", children: [] },
      { slug: "turistika", name: "Turistika", children: [] },
      { slug: "kemping", name: "Kemping", children: [] },
      { slug: "snowboarding", name: "Snowboarding", children: [] },
      { slug: "lyzovanie", name: "Lyžovanie", children: [] },
      { slug: "vodne-sporty", name: "Vodné športy", children: [] },
      { slug: "bezecke-sporty", name: "Bežecké športy", children: [] },
      { slug: "loptove-sporty", name: "Loptové športy", children: [] },
      { slug: "sportove-oblecenie", name: "Športové oblečenie", children: [] },
      { slug: "sportove-vybavenie", name: "Športové vybavenie", children: [] },
    ],
  },
  {
    slug: "oblecenie-a-moda",
    name: "Oblečenie a móda",
    children: [
      { slug: "panske-oblecenie", name: "Pánske oblečenie", children: [] },
      { slug: "damske-oblecenie", name: "Dámske oblečenie", children: [] },
      { slug: "detske-oblecenie-moda", name: "Detské oblečenie", children: [] },
      { slug: "obuv", name: "Obuv", children: [] },
      { slug: "kabelky", name: "Kabelky", children: [] },
      { slug: "batohy", name: "Batohy", children: [] },
      { slug: "hodinky-moda", name: "Hodinky", children: [] },
      { slug: "sperky", name: "Šperky", children: [] },
      { slug: "modne-doplnky", name: "Módne doplnky", children: [] },
      { slug: "sportova-moda", name: "Športová móda", children: [] },
    ],
  },
  {
    slug: "deti-a-hracky",
    name: "Deti a hračky",
    children: [
      { slug: "hracky", name: "Hračky", children: [] },
      { slug: "kociky", name: "Kočíky", children: [] },
      { slug: "autosediacky", name: "Autosedačky", children: [] },
      { slug: "detske-postielky", name: "Detské postieľky", children: [] },
      { slug: "detsky-nabytok", name: "Detský nábytok", children: [] },
      { slug: "detske-oblecenie", name: "Detské oblečenie", children: [] },
      { slug: "skolske-potreby", name: "Školské potreby", children: [] },
      { slug: "detske-sportove-vybavenie", name: "Detské športové vybavenie", children: [] },
    ],
  },
  {
    slug: "hobby-a-volny-cas",
    name: "Hobby a voľný čas",
    children: [
      { slug: "hudobne-nastroje", name: "Hudobné nástroje", children: [] },
      { slug: "knihy", name: "Knihy", children: [] },
      { slug: "filmy-a-hudba", name: "Filmy a hudba", children: [] },
      { slug: "zberatelstvo", name: "Zberateľstvo", children: [] },
      { slug: "modelarstvo", name: "Modelárstvo", children: [] },
      { slug: "umenie", name: "Umenie", children: [] },
      { slug: "fotograficke-vybavenie", name: "Fotografické vybavenie", children: [] },
      { slug: "polovnictvo-a-rybarstvo", name: "Poľovníctvo a rybárstvo", children: [] },
      { slug: "spolocenske-hry", name: "Spoločenské hry", children: [] },
    ],
  },
  {
    slug: "praca-a-sluzby",
    name: "Práca a služby",
    children: [
      { slug: "pracovne-ponuky", name: "Pracovné ponuky", children: [] },
      { slug: "brigady", name: "Brigády", children: [] },
      { slug: "remeselne-sluzby", name: "Remeselné služby", children: [] },
      { slug: "stavebne-prace", name: "Stavebné práce", children: [] },
      { slug: "doprava", name: "Doprava", children: [] },
      { slug: "stahovanie", name: "Sťahovanie", children: [] },
      { slug: "it-sluzby", name: "IT služby", children: [] },
      { slug: "ostatne-sluzby", name: "Ostatné služby", children: [] },
    ],
  },
  {
    slug: "zvierata",
    name: "Zvieratá a chovateľstvo",
    children: [
      { slug: "psy", name: "Psy", children: [] },
      { slug: "macki", name: "Mačky", children: [] },
      { slug: "hlodavce", name: "Hlodavce", children: [] },
      { slug: "vtaky", name: "Vtáky", children: [] },
      { slug: "akvaristika", name: "Akvaristika", children: [] },
      { slug: "teraristika", name: "Teraristika", children: [] },
      { slug: "chovatelske-potreby", name: "Chovateľské potreby", children: [] },
    ],
  },
  {
    slug: "reality",
    name: "Reality",
    children: [
      { slug: "byty-na-predaj", name: "Byty na predaj", children: [] },
      { slug: "byty-na-prenajom", name: "Byty na prenájom", children: [] },
      { slug: "domy-na-predaj", name: "Domy na predaj", children: [] },
      { slug: "domy-na-prenajom", name: "Domy na prenájom", children: [] },
      { slug: "pozemky", name: "Pozemky", children: [] },
      { slug: "komercne-priestory", name: "Komerčné priestory", children: [] },
      { slug: "garaze-a-parkovanie", name: "Garáže a parkovacie miesta", children: [] },
      { slug: "rekreacne-objekty", name: "Rekreačné objekty", children: [] },
    ],
  },
  {
    slug: "ostatne",
    name: "Ostatné",
    children: [
      { slug: "vstupenky", name: "Vstupenky", children: [] },
      { slug: "ruzne-predmety", name: "Rôzne predmety", children: [] },
      { slug: "darujem", name: "Darujem", children: [] },
      { slug: "straty-a-nalezy", name: "Straty a nálezy", children: [] },
      { slug: "ostatne-inzeraty", name: "Ostatné inzeráty", children: [] },
    ],
  },
];

export function findCategory(slug: string): CategoryNode | undefined {
  for (const parent of CATEGORY_TREE) {
    if (parent.slug === slug) return parent;
    const child = parent.children.find((c) => c.slug === slug);
    if (child) return child;
  }
  return undefined;
}

export function getCategoryLabel(slug: string): string | undefined {
  return findCategory(slug)?.name;
}

export function getCategoryPath(slug: string): CategoryNode[] {
  for (const parent of CATEGORY_TREE) {
    if (parent.slug === slug) return [parent];
    const child = parent.children.find((c) => c.slug === slug);
    if (child) return [parent, child];
  }
  return [];
}

/** Emoji pre hlavné kategórie – používa sa v chipoch a dlaždicách na homepage. */
export const CATEGORY_EMOJI: Record<string, string> = {
  elektronika: "📺",
  "pocitace-a-gaming": "🎮",
  "auto-moto": "🚗",
  "dom-a-zahrada": "🏠",
  "sport-a-outdoor": "🚲",
  "oblecenie-a-moda": "👟",
  "deti-a-hracky": "🧸",
  "hobby-a-volny-cas": "🎸",
  "praca-a-sluzby": "🧰",
  zvierata: "🐾",
  reality: "🔑",
  ostatne: "📦",
};

/** Zdroje, ktoré Bazárnik prehľadáva (odkazy do pätičky). */
export const EXTERNAL_SOURCES: Array<{ name: string; url: string }> = [
  { name: "Bazoš.sk", url: "https://www.bazos.sk" },
  { name: "Bazar.sk", url: "https://www.bazar.sk" },
  { name: "Modrý koník", url: "https://www.modrykonik.sk" },
  { name: "Vinted.sk", url: "https://www.vinted.sk" },
  { name: "Facebook Marketplace", url: "https://www.facebook.com/marketplace/sk/" },
  { name: "Autobazar.eu", url: "https://www.autobazar.eu" },
  { name: "Autobazar.sk", url: "https://www.autobazar.sk" },
  { name: "Autovia.sk", url: "https://www.autovia.sk" },
  { name: "Nehnutelnosti.sk", url: "https://www.nehnutelnosti.sk" },
  { name: "Inzercia.sk", url: "https://www.inzercia.sk" },
  { name: "Bazox.sk", url: "https://bazox.sk" },
  { name: "Predamkupim.sk", url: "https://www.predamkupim.sk" },
];

/**
 * Podkategórie zobrazované po kliknutí na kategóriu (ako na Alze).
 * Pre hlavnú kategóriu vráti jej podkategórie, pre podkategóriu súrodencov.
 */
export function getCategoryNavChips(slug: string): CategoryNode[] {
  const category = findCategory(slug);
  if (!category) return [];
  if (category.children.length > 0) return category.children;
  const parent = CATEGORY_TREE.find((p) => p.children.some((c) => c.slug === slug));
  if (!parent) return [];
  return parent.children.filter((c) => c.slug !== slug);
}
