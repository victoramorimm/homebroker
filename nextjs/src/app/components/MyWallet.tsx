"use client";

import {
  Button,
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
} from "./flowbite-components";
import { Asset, WalletAsset } from "../models";
import Link from "next/link";
import useSWR from "swr";
import useSWRSubscription, { SWRSubscriptionOptions } from "swr/subscription";
import { fetcher } from "../utils";

// async function getWalletAssets(wallet_id: string): Promise<WalletAsset[]> {
//   const response = await fetch(
//     `http://localhost:3000/wallets/${wallet_id}/assets`,
//     {
//       next: {
//         // revalidate: isHomeBrokerClosed() ? 60 * 60 : 5,
//         revalidate: 1,
//       },
//     }
//   );

//   return response.json();
// }

export default function MyWallet(props: { wallet_id: string }) {
  // const walletsAssets = await getWalletAssets(props.wallet_id);

  const {
    data: walletsAssets,
    error,
    mutate: mutateWalletAssets,
  } = useSWR<WalletAsset[]>(
    `http://localhost:3000/wallets/${props.wallet_id}/assets`,
    fetcher,
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { data: walletAssetUpdated } = useSWRSubscription(
    `http://localhost:3000/wallets/${props.wallet_id}/assets/events`,
    (path, { next }: SWRSubscriptionOptions) => {
      const eventSource = new EventSource(path);
      eventSource.addEventListener("wallet-asset-updated", async (event) => {
        const walletAssetUpdated: WalletAsset = JSON.parse(event.data);
        await mutateWalletAssets((prev) => {
          const foundIndex = prev?.findIndex(
            (walletAsset) =>
              walletAsset.asset_id === walletAssetUpdated.asset_id
          );

          if (foundIndex !== -1) {
            prev![foundIndex!].shares = walletAssetUpdated.shares;
          }

          return [...prev!];
        }, false);
        next(null, walletAssetUpdated);
      });
      eventSource.onerror = (error) => {
        console.error("EventSource failed:", error);
        eventSource.close();
      };
      return () => {
        eventSource.close();
      };
    }
  );

  const { data: assetChanged } = useSWRSubscription(
    `http://localhost:3000/assets/events`,
    (path, { next }: SWRSubscriptionOptions) => {
      const eventSource = new EventSource(path);
      eventSource.addEventListener("asset-price-changed", async (event) => {
        const assetPriceChanged: Asset = JSON.parse(event.data);
        await mutateWalletAssets((prev) => {
          const walletAssetIndex = prev!.findIndex(
            (walletAsset) => walletAsset.asset_id === assetPriceChanged.id
          );
          console.log(walletAssetIndex);

          if (walletAssetIndex !== -1) {
            prev![walletAssetIndex].Asset.price = assetPriceChanged.price;
          }
          return [...prev!];
        }, false);
        next(null, assetPriceChanged);
      });

      eventSource.onerror = (error) => {
        console.error("EventSource failed:", error);
        eventSource.close();
      };
      return () => {
        eventSource.close();
      };
    }
  );

  return (
    <Table>
      <TableHead>
        <TableHeadCell>Nome</TableHeadCell>
        <TableHeadCell>Preço R$</TableHeadCell>
        <TableHeadCell>Quant.</TableHeadCell>
        <TableHeadCell>
          <span className="sr-only">Comprar/Vender</span>
        </TableHeadCell>
      </TableHead>
      <TableBody className="divide-y">
        {walletsAssets!.map((walletAsset, key) => (
          <TableRow className="border-gray-700 bg-gray-800" key={key}>
            <TableCell className="whitespace-nowrap font-medium text-white">
              {walletAsset.Asset.id} ({walletAsset.Asset.symbol})
            </TableCell>
            <TableCell>{walletAsset.Asset.price}</TableCell>
            <TableCell>{walletAsset.shares}</TableCell>
            <TableCell>
              <Link
                className="font-medium hover:underline text-cyan-500"
                href={`/${props.wallet_id}/home-broker/${walletAsset.Asset.id}`}
              >
                Comprar/Vender
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
