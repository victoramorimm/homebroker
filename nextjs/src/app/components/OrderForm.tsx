import { TextInput, Label, Button } from "./flowbite-components";
import { revalidateTag } from "next/cache";

async function initTransaction(formData: FormData) {
  "use server";

  const shares = formData.get("shares");
  const price = formData.get("price");
  const wallet_id = formData.get("wallet_id");
  const asset_id = formData.get("asset_id");
  const type = formData.get("type");

  console.log({ shares, price, wallet_id, asset_id, type });

  await fetch(`http://host.docker.internal:3000/wallets/${wallet_id}/orders`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      shares: Number(shares),
      price: Number(price),
      asset_id,
      type,
      status: "OPEN",
      Asset: {
        id: asset_id,
        symbol: "PETR4",
        price: 30,
      },
    }),
  });

  revalidateTag(`orders-wallet-${wallet_id}`);

  return { shares, price, wallet_id, asset_id, type };
}

export function OrderForm(props: {
  asset_id: string;
  wallet_id: string;
  type: "BUY" | "SELL";
}) {
  return (
    <div>
      <form action={initTransaction}>
        <input name="asset_id" type="hidden" defaultValue={props.asset_id} />
        <input name="wallet_id" type="hidden" defaultValue={props.wallet_id} />
        <input name="type" type="hidden" defaultValue={props.type} />
        <div>
          <div className="mb-2 block">
            <Label htmlFor="shares" value="Quantidade" />
          </div>
          <TextInput
            id="shares"
            name="shares"
            required
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            placeholder="Quantidade"
          />
        </div>
        <div>
          <div className="mb-2 block">
            <Label htmlFor="price" value="Preço R$" />
          </div>
          <TextInput
            id="price"
            name="price"
            required
            type="number"
            min={1}
            step={1}
            placeholder="Preço"
          />
        </div>
        <br />
        <Button type="submit" color={props.type === "BUY" ? "green" : "red"}>
          Confirmar {props.type === "BUY" ? "compra" : "venda"}
        </Button>
      </form>
    </div>
  );
}
