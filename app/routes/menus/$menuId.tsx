import { json, type LoaderFunction } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useSearchParams,
  useSubmit,
  useTransition,
} from "@remix-run/react";
import config from "~/config.server";
import "regenerator-runtime/runtime.js";
import { multicombinations } from "@combinatorics/n-multicombinations";

type Vendor = {
  name: string;
};

type Image = {
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

type Item = {
  id: string;
  section: string;
  images: Image[];
  foodType: string;
  price: number;
  name: string;
  description: string;
};

type Combo = {
  key: string;
  items: Item[];
  price: number;
  averagePrice: number;
  uniqueLength: number;
};

type LoaderData = {
  vendor: Vendor;
  combos: Combo[];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const url = new URL(request.url);
  const mustInclude = url.searchParams.getAll("mustInclude");
  const singleItem = !!url.searchParams.get("singleItem");
  const sort = url.searchParams.get("sort") ?? "weighted";

  const data: Menu = await (
    await fetch(
      `https://app.business.just-eat.co.uk/api/individual-choice/${params.menuId}/summary`,
      {
        headers: new Headers(config.jefbHeaders),
      }
    )
  ).json();

  const budget = data.item.individualChoice.budget;
  const allItems: Item[] =
    data.item.individualChoice.menuContent.sections.flatMap((section) =>
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
  for (const comboItems of multicombinations([...allItems, null], 5)) {
    const combo = {
      items: comboItems.filter((item): item is Item => !!item),
      price: comboItems.reduce((acc, item) => acc + (item?.price ?? 0), 0),
    };

    if (combo.price < budget) {
      combos.push({
        ...combo,
        key: combo.items.map((item) => item.name).join(","),
        uniqueLength: new Set(combo.items.map((item) => item.id)).size,
        averagePrice: combo.price / combo.items.length,
      });
    }
  }

  let filteredCombos = [...combos];

  if (singleItem) {
    filteredCombos = filteredCombos.filter((combo) => combo.uniqueLength == 1);
  }

  mustInclude.forEach((requiredFoodType) => {
    filteredCombos = filteredCombos.filter((combo) =>
      combo.items.some((item) => item.foodType == requiredFoodType)
    );
  });

  if (sort === "weighted" && !singleItem) {
    console.log("weighted");
    filteredCombos.sort(
      (c1, c2) => c2.price + c2.averagePrice - (c1.price + c1.averagePrice)
    );
  } else if (sort == "max"){
    filteredCombos.sort((c1, c2) => c2.price - c1.price);
  } else if (sort == "rouge") {
    filteredCombos.sort((c1, c2) => (c2.price + c2.uniqueLength) - (c1.price + c1.uniqueLength));
  }
  return json<LoaderData>({
    vendor: data.item.vendor,
    combos: filteredCombos,
  });
};

const uniqueBy = <T, K extends keyof T>(vals: T[], k: K): T[] => {
  const out: T[] = [];
  const existing = new Set<T[K]>();
  vals.forEach((obj) => {
    if (!existing.has(obj[k])) {
      existing.add(obj[k]);
      out.push(obj);
    }
  });

  return out;
};

const ItemDetails: React.FC<{ item: Item }> = ({ item }) => {
  return (
    <div style={{ width: 250, height: 100, display: "flex", alignItems: "center" }}>
      <img src={item.images[0].thumbnail} style={{ width: 100, padding: 8 }} />
      <div>{item.name}</div>
    </div>
  );
};

const CombinationDetails: React.FC<{ items: Item[] }> = ({ items }) => {
  const totals = items.reduce(
    (totals, item) => ({ ...totals, [item.id]: (totals[item.id] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  const toRender = uniqueBy(items, "id");

  toRender.sort((i1, i2) => totals[i2.id] - totals[i1.id]);

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      {toRender.map((item) => (
        <div key={item.id} style={{ margin: 12 }}>
          <ItemDetails item={item} />
          <span>{totals[item.id]}</span>
        </div>
      ))}
    </div>
  );
};

export default function Index() {
  const submit = useSubmit();
  const transition = useTransition();
  const [searchParams] = useSearchParams();
  const mustInclude = searchParams.getAll("mustInclude");
  const singleItem = !!searchParams.get("singleItem");
  const sort = searchParams.get("sort") ?? "weighted";
  const { vendor, combos } = useLoaderData<LoaderData>();

  return (
    <div>
      <div>
        <h1>{vendor.name}</h1>
        <div>
          <Link to="/">Back</Link>
          <Form method="get" onChange={(e) => submit(e.currentTarget)}>
            <label htmlFor="mustInclude">Drink</label>
            <input
              type="checkbox"
              id="mustInclude"
              name="mustInclude"
              value="drink"
              defaultChecked={mustInclude.includes("drink")}
            />
            <label htmlFor="singleItem">Single item</label>
            <input
              type="checkbox"
              id="singleItem"
              name="singleItem"
              value="true"
              defaultChecked={singleItem}
            />
            <div>
              <h4>Sort</h4>
              <label htmlFor="weightedSort">Weighted</label>
              <input
                type="radio"
                id="weightedSort"
                name="sort"
                value="weighted"
                defaultChecked={sort === "weighted"}
              />
              <label htmlFor="maxSort">Max</label>
              <input
                type="radio"
                id="maxSort"
                name="sort"
                value="max"
                defaultChecked={sort === "max"}
              />
              <label htmlFor="rougeSort">Rouge</label>
              <input
                type="radio"
                id="rougeSort"
                name="sort"
                value="rouge"
                defaultChecked={sort === "rouge"}
              />
            </div>
          </Form>
        </div>
      </div>
      <div style={{ opacity: transition.state == "submitting" ? 0.5 : 1 }}>
        {combos.slice(0, 1000).map((combo) => (
          <div key={combo.key} style={{ margin: 24 }}>
            <CombinationDetails items={combo.items} />
            <span> - £{combo.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
