import MyOrders from "@/app/components/MyOrders";
import { OrderForm } from "@/app/components/OrderForm";
import { Tabs, TabItem, Card } from "@/app/components/flowbite-components";
import { HiShoppingCart, HiArrowUp } from "../../../components/react-icons/hi";
import { ChartComponent } from "@/app/components/ChartComponent";
import { SyncOrders } from "@/app/components/SyncOrders";
import { AssetChartComponent } from "@/app/components/AssetChartComponent";

export default async function HomeBrokerPage({
  params,
}: {
  params: { wallet_id: string; asset_id: string; type: "BUY" | "SELL" };
}) {
  return (
    <main className="flex flex-grow flex-col container mx-auto p-2">
      <article className="format format-invert">
        <h1 className="font-dm">Home broker - {params.asset_id}</h1>
      </article>
      <div className="grid grid-cols-5 flex-grow gap-2 mt-2">
        <div className="col-span-2">
          <div>
            <Card
              theme={{
                root: {
                  children:
                    "flex h-full flex-col justify-center gap-4 py-4 px-2",
                },
              }}
            >
              <Tabs aria-label="Default tabs" style="pills">
                <TabItem active title="Comprar" icon={HiShoppingCart}>
                  <OrderForm
                    wallet_id={params.wallet_id}
                    asset_id={params.asset_id}
                    type="BUY"
                  />
                </TabItem>
                <TabItem title="Vender" icon={HiArrowUp}>
                  <OrderForm
                    wallet_id={params.wallet_id}
                    asset_id={params.asset_id}
                    type="SELL"
                  />
                </TabItem>
              </Tabs>
            </Card>
          </div>
          <div className="mt-2">
            <Card
              theme={{
                root: {
                  children:
                    "flex h-full flex-col justify-center gap-4 py-4 px-2",
                },
              }}
            >
              <SyncOrders wallet_id={params.wallet_id}>
                <div className="max-h-96 overflow-y-auto overflow-hidden">
                  <MyOrders wallet_id={params.wallet_id} />
                </div>
              </SyncOrders>
            </Card>
          </div>
        </div>
        <div className="col-span-3 flex flex-grow">
          <AssetChartComponent asset_id={params.asset_id}></AssetChartComponent>
        </div>
      </div>
    </main>
  );
}
