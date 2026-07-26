import { computeVariantPrices } from "@/lib/pricing";
import { slugify } from "@/lib/slugify";
import type { ProductVariant } from "@/lib/firestore/types";

export interface CatalogEntry {
  name: string;
  /** 3ml oil base price in INR. null = price not decided yet (pending). */
  basePrice: number | null;
  description: string;
  notes: string[];
}

export const CATALOG: CatalogEntry[] = [
  // ---- ACTIVE ----
  { name: "Erba Pure", basePrice: 150, description: "A crisp green fougère with an aromatic, herbal heart.", notes: ["bergamot", "lavender", "oakmoss", "musk"] },
  { name: "Jasmine", basePrice: 80, description: "A pure, honeyed jasmine bloom captured at night.", notes: ["jasmine", "tuberose", "white musk"] },
  { name: "Pure Musk", basePrice: 250, description: "A warm, skin-close musk that lingers long after you've left the room.", notes: ["white musk", "amber", "sandalwood"] },
  { name: "Polo Sport (Type 1)", basePrice: 150, description: "An energetic citrus-aromatic burst built for movement.", notes: ["citrus", "mint", "marine notes", "musk"] },
  { name: "Polo Sport (Type 2)", basePrice: 95, description: "A lighter, greener take on the classic sport accord.", notes: ["green citrus", "lavender", "woody musk"] },
  { name: "Biscuit", basePrice: 80, description: "A warm, sugary gourmand that smells good enough to eat.", notes: ["vanilla", "caramel", "tonka bean", "milk"] },
  { name: "No Million", basePrice: 100, description: "A bold spicy-leather scent with a golden amber glow.", notes: ["blood orange", "cinnamon", "leather", "amber"] },
  { name: "Mariyam", basePrice: 150, description: "An opulent floral oriental fit for royalty.", notes: ["rose", "oud", "saffron", "musk"] },
  { name: "HHH", basePrice: 100, description: "A clean, confident musk with a soft powdery finish.", notes: ["musk", "iris", "sandalwood"] },
  { name: "Dylan Blue", basePrice: 130, description: "A fresh aquatic scent with a citrus-woody trail.", notes: ["grapefruit", "water notes", "patchouli", "ambroxan"] },
  { name: "Adidas", basePrice: 100, description: "A clean, everyday sport fragrance with citrus energy.", notes: ["citrus", "aromatic herbs", "musk"] },
  { name: "Oud Al Layl", basePrice: 150, description: "A dark, smoky oud built for the night.", notes: ["oud", "smoke", "amber", "spices"] },
  { name: "Royal Black", basePrice: 150, description: "A regal blend of black oud and warm spice.", notes: ["oud", "leather", "black pepper", "amber"] },
  { name: "Oudh Quwaith", basePrice: 150, description: "A rich, resinous oud with a distinct Gulf character.", notes: ["oud", "rose", "saffron", "amber"] },
  { name: "Chocolate", basePrice: 200, description: "A decadent cocoa gourmand wrapped in warm vanilla.", notes: ["cocoa", "vanilla", "praline", "musk"] },
  { name: "Berbbery", basePrice: 150, description: "A refined woody-aromatic scent with quiet confidence.", notes: ["bergamot", "cedar", "musk", "amber"] },
  { name: "Imperial", basePrice: 200, description: "A majestic oriental composition of oud, amber and spice.", notes: ["oud", "amber", "spices", "vanilla"] },
  { name: "Ahmed Magribi Murj", basePrice: 250, description: "A luxurious Moroccan-inspired blend of rose and oud.", notes: ["rose", "oud", "saffron", "musk"] },
  { name: "Marj Top", basePrice: 200, description: "An elevated take on a rich amber-oud accord.", notes: ["oud", "amber", "rose", "musk"] },
  { name: "CR7", basePrice: 100, description: "A confident, woody-aromatic scent for everyday wear.", notes: ["bergamot", "lavender", "cedarwood", "musk"] },
  { name: "Thaabish Ouda", basePrice: 100, description: "A smoky, earthy oud with quiet depth.", notes: ["oud", "patchouli", "amber"] },
  { name: "Sunset", basePrice: 150, description: "A warm, golden-hour blend of fruit and amber.", notes: ["mandarin", "peach", "amber", "vanilla"] },
  { name: "Musk Rijal", basePrice: 150, description: "A clean, masculine white musk for daily wear.", notes: ["white musk", "cedar", "bergamot"] },
  { name: "CK One", basePrice: 150, description: "A crisp, unisex citrus scent that's fresh from morning to night.", notes: ["bergamot", "green tea", "musk", "cedar"] },
  { name: "Sabaya", basePrice: 100, description: "A graceful floral bouquet layered over soft oud.", notes: ["rose", "jasmine", "oud", "musk"] },
  { name: "Good Girl CH", basePrice: 130, description: "A striking contrast of sweet almond and dark cacao.", notes: ["almond", "tuberose", "cacao", "tonka bean"] },
  { name: "Mango", basePrice: 100, description: "A juicy, sun-ripened mango in a light fruity accord.", notes: ["mango", "citrus", "coconut", "musk"] },
  { name: "Sandal", basePrice: 100, description: "A smooth, creamy sandalwood with a warm finish.", notes: ["sandalwood", "amber", "vanilla"] },
  { name: "Black Lotus", basePrice: 100, description: "A mysterious lotus bloom set against dark musk.", notes: ["lotus", "water lily", "musk", "amber"] },
  { name: "Chemda", basePrice: 120, description: "A soft floral amber with a comforting warmth.", notes: ["rose", "amber", "vanilla", "musk"] },
  { name: "Marj Premium", basePrice: 150, description: "A premium amber-oud blend with a refined finish.", notes: ["oud", "amber", "rose", "sandalwood"] },
  { name: "White Oud", basePrice: 150, description: "A softer, lighter oud with a clean woody heart.", notes: ["oud", "musk", "sandalwood"] },
  { name: "Kissing Killian", basePrice: 110, description: "A sweet marshmallow-vanilla scent with a flirtatious edge.", notes: ["marshmallow", "vanilla", "orange blossom", "musk"] },
  { name: "Black Premium", basePrice: 130, description: "A dark, premium woody-oriental for evening wear.", notes: ["oud", "leather", "amber", "spices"] },
  { name: "Gold Floral", basePrice: 100, description: "A radiant floral bouquet with a golden warmth.", notes: ["rose", "jasmine", "amber", "musk"] },
  { name: "Kilian", basePrice: 150, description: "An elegant rose-oud composition with understated luxury.", notes: ["rose", "oud", "saffron", "musk"] },
  { name: "Bombshell", basePrice: 150, description: "A vibrant fruity-floral bouquet that turns heads.", notes: ["passionfruit", "peony", "vanilla orchid"] },
  { name: "Brut", basePrice: 80, description: "A classic aromatic fougère with timeless barbershop charm.", notes: ["lavender", "oakmoss", "citrus", "musk"] },
  { name: "Hugo Boss Her", basePrice: 150, description: "A playful floral-fruity scent with a modern edge.", notes: ["pear", "peony", "patchouli", "musk"] },
  { name: "Black Opium", basePrice: 100, description: "A seductive blend of coffee and vanilla laced with white flowers.", notes: ["coffee", "vanilla", "white flowers", "patchouli"] },
  { name: "Oudh Allad", basePrice: 150, description: "A traditional, deep oud with a smoky resinous trail.", notes: ["oud", "resin", "smoke", "amber"] },

  // ---- PENDING (price not decided) ----
  { name: "Green Ajmal", basePrice: null, description: "A fresh green composition awaiting its final blend.", notes: ["green notes", "citrus", "musk"] },
  { name: "Miziyan", basePrice: null, description: "A delicate floral scent yet to be finalized.", notes: ["rose", "musk", "amber"] },
  { name: "Tabish", basePrice: null, description: "A warm, radiant blend still in development.", notes: ["amber", "oud", "vanilla"] },
  { name: "Solid", basePrice: null, description: "A rich, concentrated attar blend in progress.", notes: ["musk", "amber", "sandalwood"] },
  { name: "Ambr", basePrice: null, description: "A warm amber composition awaiting pricing.", notes: ["amber", "vanilla", "musk"] },
  { name: "Armani", basePrice: null, description: "A refined, clean woody scent in the classic style.", notes: ["bergamot", "cedar", "musk"] },
  { name: "Dirham", basePrice: null, description: "A luxurious blend evoking golden opulence.", notes: ["oud", "saffron", "amber"] },
  { name: "Inten", basePrice: null, description: "A bold, intense woody-fruity composition.", notes: ["blackcurrant", "birch", "musk"] },
];

export interface BuiltProduct {
  slug: string;
  name: string;
  description: string;
  notes: string[];
  category: string;
  isActive: boolean;
  basePrice: number | null;
  variants: ProductVariant[];
}

export function buildCatalogProducts(): BuiltProduct[] {
  return CATALOG.map((entry): BuiltProduct => {
    const isActive = entry.basePrice !== null;
    const computed = computeVariantPrices(entry.basePrice ?? 0);
    return {
      slug: slugify(entry.name),
      name: entry.name,
      description: entry.description,
      notes: entry.notes,
      category: "Fragrance",
      isActive,
      basePrice: entry.basePrice,
      variants: computed.map(
        (c): ProductVariant => ({
          variantId: c.variantId,
          type: c.type,
          sizeMl: c.sizeMl,
          priceInr: c.priceInr,
          mrpInr: c.mrpInr,
          stock: 0,
          lowStockThreshold: 3,
        }),
      ),
    };
  });
}
