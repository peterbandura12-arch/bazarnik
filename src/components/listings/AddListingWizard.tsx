"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { CATEGORY_TREE } from "@/lib/categories";
import { CONDITION_LABELS, slugify } from "@/lib/utils";
import type { ListingCondition } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Kategória", "Informácie", "Fotografie", "Kontakt", "Kontrola"] as const;

interface PhotoItem {
  file: File;
  preview: string;
  isPrimary: boolean;
}

export function AddListingWizard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [parentCategory, setParentCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<ListingCondition>("pouzite");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPreference, setContactPreference] = useState("chat");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const parent = CATEGORY_TREE.find((c) => c.slug === parentCategory);
  const sub = parent?.children.find((c) => c.slug === subCategory);

  function validateStep(current: number): string | null {
    if (current === 0 && !subCategory) return "Vyberte hlavnú kategóriu a podkategóriu.";
    if (current === 1) {
      if (title.trim().length < 5) return "Názov musí mať aspoň 5 znakov.";
      if (description.trim().length < 10) return "Opis musí mať aspoň 10 znakov.";
      if (price === "" || Number(price) < 0) return "Zadajte platnú cenu (0 = darujem).";
      if (!location.trim()) return "Zadajte lokalitu.";
    }
    return null;
  }

  function nextStep() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const newPhotos: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024)
      .map((file, i) => ({
        file,
        preview: URL.createObjectURL(file),
        isPrimary: photos.length === 0 && i === 0,
      }));
    setPhotos((p) => [...p, ...newPhotos].slice(0, 10));
  }

  function movePhoto(index: number, dir: -1 | 1) {
    setPhotos((p) => {
      const next = [...p];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function publish() {
    setPublishing(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/prihlasenie?next=/pridat-inzerat");
      return;
    }

    const slugBase = slugify(title) || "inzerat";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const { data: listing, error: insertError } = await supabase
      .from("listings")
      .insert({
        slug,
        user_id: user.id,
        category_id: subCategory,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        condition,
        brand: brand.trim() || null,
        model: model.trim() || null,
        location: location.trim(),
        contact_preference: contactPreference,
      })
      .select("id")
      .single();

    if (insertError || !listing) {
      setPublishing(false);
      setError("Inzerát sa nepodarilo publikovať. Skontrolujte prihlásenie a skúste znova.");
      return;
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const path = `${user.id}/${listing.id}/${i}-${photo.file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, photo.file, { contentType: photo.file.type });

      if (uploadError) continue;

      const { data: urlData } = supabase.storage.from("listing-images").getPublicUrl(path);

      await supabase.from("listing_images").insert({
        listing_id: listing.id,
        url: urlData.publicUrl,
        sort_order: i,
        is_primary: photo.isPrimary,
      });
    }

    router.push(`/inzerat/${slug}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm" aria-label="Postup pridávania inzerátu">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? "bg-green-100 text-green-700"
                  : i === step
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={i === step ? "font-semibold text-ink-900" : "text-ink-500"}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-ink-300">→</span>}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Kategória inzerátu</h2>
            <Field label="Hlavná kategória" required>
              <Select
                value={parentCategory}
                onChange={(e) => {
                  setParentCategory(e.target.value);
                  setSubCategory("");
                }}
              >
                <option value="">Vyberte kategóriu…</option>
                {CATEGORY_TREE.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            {parent && (
              <Field label="Podkategória" required>
                <Select value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                  <option value="">Vyberte podkategóriu…</option>
                  {parent.children.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Informácie o produkte</h2>
            <Field label="Názov inzerátu" required hint="5 – 120 znakov, napr. „iPhone 13, 128 GB, modrý“">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Opis" required hint="Opíšte stav, príslušenstvo a dôvod predaja (aspoň 10 znakov)">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
                rows={6}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cena (€)" required hint="Zadajte 0, ak darujete">
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </Field>
              <Field label="Stav produktu" required>
                <Select value={condition} onChange={(e) => setCondition(e.target.value as ListingCondition)}>
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Značka">
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Napr. Samsung" />
              </Field>
              <Field label="Model">
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Napr. Galaxy S23" />
              </Field>
            </div>
            <Field label="Lokalita" required hint="Mesto alebo kraj, kde je tovar k dispozícii">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Napr. Bratislava" />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Fotografie</h2>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 bg-ink-50 px-6 py-10 text-center transition-colors hover:border-brand-400">
              <ImagePlus className="h-8 w-8 text-ink-400" />
              <span className="text-sm font-medium text-ink-700">
                Kliknite a vyberte fotografie (max. 10, do 10 MB)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addPhotos(e.target.files)}
              />
            </label>

            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, i) => (
                  <li key={photo.preview} className="overflow-hidden rounded-lg border border-ink-200">
                    <div className="relative aspect-[4/3] bg-ink-100">
                      <Image
                        src={photo.preview}
                        alt={`Náhľad fotografie ${i + 1}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      {photo.isPrimary && (
                        <span className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Star className="h-3 w-3" /> Hlavná
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-1.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => movePhoto(i, -1)}
                          disabled={i === 0}
                          aria-label="Presunúť fotografii doľava"
                          className="rounded p-1 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(i, 1)}
                          disabled={i === photos.length - 1}
                          aria-label="Presunúť fotografii doprava"
                          className="rounded p-1 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((p) => p.map((ph, j) => ({ ...ph, isPrimary: j === i })))
                          }
                          aria-label="Nastaviť ako hlavnú fotografiu"
                          className="rounded p-1 text-ink-500 hover:bg-ink-100"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((p) => p.filter((_, j) => j !== i))
                          }
                          aria-label="Odstrániť fotografiu"
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Kontaktné údaje</h2>
            <p className="text-sm text-ink-500">
              Účet: <strong>{userEmail}</strong>
            </p>
            <Field label="Telefónne číslo" hint="Nepovinné – zobrazí sa len podľa zvoleného spôsobu kontaktu">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+421 900 000 000"
              />
            </Field>
            <Field label="Preferovaný spôsob kontaktovania" required>
              <Select value={contactPreference} onChange={(e) => setContactPreference(e.target.value)}>
                <option value="chat">Správa cez Bazárnik (chat)</option>
                <option value="phone">Telefónne volanie</option>
                <option value="email">E-mail</option>
              </Select>
            </Field>
            {contactPreference === "phone" && !phone && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Pre telefónny kontakt doplňte telefónne číslo.
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Kontrola a publikovanie</h2>
            <dl className="divide-y divide-ink-100 rounded-xl border border-ink-200 text-sm">
              {[
                ["Kategória", `${parent?.name ?? "–"} → ${sub?.name ?? "–"}`],
                ["Názov", title],
                ["Cena", price === "0" ? "Darujem" : `${price} €`],
                ["Stav", CONDITION_LABELS[condition]],
                ["Značka", brand || "–"],
                ["Model", model || "–"],
                ["Lokalita", location],
                ["Fotografie", `${photos.length}×`],
                [
                  "Kontakt",
                  contactPreference === "chat"
                    ? "Chat cez Bazárnik"
                    : contactPreference === "phone"
                      ? `Telefón: ${phone || "neuvedený"}`
                      : "E-mail",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="shrink-0 text-ink-500">{label}</dt>
                  <dd className="text-right font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-ink-500">
              Publikovaním inzerátu potvrdzujete, že ponuka je vaša a zodpovedá podmienkam
              používania platformy.
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || publishing}
          >
            <ArrowLeft className="h-4 w-4" /> Späť
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep} disabled={publishing}>
              Pokračovať <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="accent" size="lg" onClick={publish} disabled={publishing}>
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publikujem…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Publikovať inzerát
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
