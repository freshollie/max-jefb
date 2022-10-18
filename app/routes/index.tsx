import { json, type LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { format, startOfDay } from "date-fns";
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
          <div key={day.requestedDeliveryDate} style={{padding: 12}}>
            <div>{format(new Date(day.requestedDeliveryDate), "dd/MM/YYY")}</div>
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
