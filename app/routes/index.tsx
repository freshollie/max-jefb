import { json, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { startOfDay } from "date-fns";
import config from "~/config.server";

type Vendor = {
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

type Day = {
  requestedDeliveryDate: string;
  eaterOptions: Vendor[];
};

export const loader: LoaderFunction = async () => {
  const cart: { items: Day[] } = await (
    await fetch(
      `https://app.business.just-eat.co.uk/api/eaters/me/carts?from=${startOfDay(
        new Date()
      ).toISOString()}`,
      { headers: new Headers(config.jefbHeaders) }
    )
  ).json();

  return json(
    cart.items.filter(
      (item) =>
        new Date(item.requestedDeliveryDate).getTime() > new Date().getTime()
    )
  );
};

const Index: React.FC = () => {
  const days = useLoaderData<Day[]>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <div>
        {days.map((day) => (
          <div key={day.requestedDeliveryDate}>
            <div>{day.requestedDeliveryDate}</div>
            <div>
              {day.eaterOptions.map((vendor) => (
                <div key={vendor.orderId}>
                  <Link to={`/menus/${vendor.orderId}`}>
                    {vendor.vendorName}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
