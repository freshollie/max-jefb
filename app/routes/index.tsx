import { json, type LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { startOfDay } from "date-fns";
import { type EatingDay, getCart } from "~/data/menu.server";

export const loader: LoaderFunction = async () => {
  const cart = await getCart(startOfDay(new Date()).toISOString());

  return json(
    cart.items.filter(
      (item) =>
        new Date(item.requestedDeliveryDate).getTime() > new Date().getTime()
    )
  );
};

const Index: React.FC = () => {
  const days = useLoaderData<EatingDay[]>();
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
