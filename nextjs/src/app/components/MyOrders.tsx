import { Order } from "../models";
import { isHomeBrokerClosed } from "../utils";
import {
  Table,
  TableBody,
  TableHead,
  TableCell,
  TableHeadCell,
  TableRow,
  Badge,
} from "../components/flowbite-components";

async function getOrders(wallet_id: string): Promise<Order[]> {
  "use server";

  const response = await fetch(
    `http://host.docker.internal:3000/wallets/${wallet_id}/orders`,
    {
      next: {
        tags: [`orders-wallet-${wallet_id}`],
        // revalidate: isHomeBrokerClosed() ? 60 * 60 : 5,
        revalidate: 1,
      },
    }
  );

  return response.json();
}

export default async function MyOrders(props: { wallet_id: string }) {
  const orders = await getOrders(props.wallet_id);

  return (
    <div>
      <article className="format format-invert">
        <h2>Meus pedidos</h2>
      </article>
      <Table>
        <TableHead>
          <TableHeadCell>ID do Ativo</TableHeadCell>
          <TableHeadCell>Quantidade</TableHeadCell>
          <TableHeadCell>Preço</TableHeadCell>
          <TableHeadCell>Tipo</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
        </TableHead>
        <TableBody>
          {orders.map((order, key) => (
            <TableRow className="border-gray-700 bg-gray-800" key={key}>
              <TableCell className="whitespace-nowrap font-medium text-white">
                {order.Asset.id}
              </TableCell>
              <TableCell>{order.shares}</TableCell>
              <TableCell>{order.price}</TableCell>
              <TableCell>
                <Badge color={order.type === "BUY" ? "green" : "red"}>
                  {order.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge>{order.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
