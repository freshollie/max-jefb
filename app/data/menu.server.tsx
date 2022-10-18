import "regenerator-runtime/runtime.js";
import { multicombinations } from "@combinatorics/n-multicombinations";
import pMemoize from "p-memoize";

import { sessionedFetch } from "~/services/just-eat.server";

export type Vendor = {
  name: string;
};

export type Image = {
  thumbnail: string;
  medium: string;
  large: string;
};

type JEItem = {
  id: string;
  images: Image[];
  foodType: string;
  price: number;
  name: string;
  description: string;
};

type Menu = {
  item: {
    vendor: Vendor;
    individualChoice: {
      budget: number;
      menuContent: {
        heroImage: Image;
        sections: {
          title: string;
          items: JEItem[];
        }[];
      };
    };
  };
};

export type Item = {
  id: string;
  section: string;
  images: Image[];
  foodType: string;
  price: number;
  name: string;
  description: string;
};

export type Combo = {
  key: string;
  items: Item[];
  price: number;
  averagePrice: number;
  uniqueLength: number;
};

type EaterOption = {
  orderId: string;
  vendorName: string;
  vendorLocationName: string;
  vendorImage: {
    original: string;
    thumbnail: string;
    medium: string;
    large: string;
  }[];
};

export type EatingDay = {
  requestedDeliveryDate: string;
  eaterOptions: EaterOption[];
};

let cache: Map<any, any>;

declare global {
  var __cache: Map<any, any> | undefined;
}

if (process.env.NODE_ENV === "production") {
  cache = new Map();
} else {
  if (!global.__cache) {
    global.__cache = new Map();
  }
  cache = global.__cache;
}

const fetcher = async <T = any,>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> => {
  const response = await sessionedFetch(input, init);
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
};

export const getCart = pMemoize(
  (from: string) => {
    return fetcher<{ items: EatingDay[] }>(
      `https://app.business.just-eat.co.uk/api/eaters/me/carts?from=${from}`
    );
  },
  { cache }
);

export const getMenuSummary = pMemoize(
  (menuId: string) => {
    return fetcher<Menu>(
      `https://app.business.just-eat.co.uk/api/individual-choice/${menuId}/summary`
    );
  },
  { cache }
);

export const getCombos = pMemoize(
  async (menu: Menu, max: number = 5) => {
    const budget = menu.item.individualChoice.budget;
    const allItems: Item[] =
      menu.item.individualChoice.menuContent.sections.flatMap((section) =>
        section.items.map((item) => ({
          id: item.id,
          section: section.title,
          images: item.images,
          price: item.price,
          name: item.name,
          description: item.description,
          foodType: item.foodType,
        }))
      );

    const combos: Combo[] = [];
    let iter = 0;
    for (const comboItems of multicombinations([...allItems, null], max)) {
      const combo = {
        items: comboItems.filter((item): item is Item => !!item),
        price: comboItems.reduce((acc, item) => acc + (item?.price ?? 0), 0),
      };

      if (combo.price < budget) {
        combos.push({
          ...combo,
          key: combo.items.map((item) => item.name).join(","),
          uniqueLength: new Set(combo.items.map((item) => item.id)).size,
          averagePrice:
            combo.items.length > 1 ? combo.price / combo.items.length : 0,
        });
      }
      iter += 1;

      if (iter % 10000 == 0) {
        // Allow ticks
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return combos;
  },
  { cache }
);
