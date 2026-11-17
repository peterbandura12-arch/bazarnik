import {
  Smartphone,
  Monitor,
  Car,
  Home,
  Dumbbell,
  Shirt,
  Baby,
  Guitar,
  Briefcase,
  PawPrint,
  Building2,
  Package,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  elektronika: Smartphone,
  "pocitace-a-gaming": Monitor,
  "auto-moto": Car,
  "dom-a-zahrada": Home,
  "sport-a-outdoor": Dumbbell,
  "oblecenie-a-moda": Shirt,
  "deti-a-hracky": Baby,
  "hobby-a-volny-cas": Guitar,
  "praca-a-sluzby": Briefcase,
  zvierata: PawPrint,
  reality: Building2,
  ostatne: Package,
};

export function CategoryIcon({
  slug,
  className = "h-6 w-6",
}: {
  slug: string;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? Package;
  return <Icon className={className} aria-hidden />;
}
