import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma/prisma.service';
import { InitTransactionDto, InputExecuteTransactionDto } from './order.dto';
import { Order, OrderStatus, OrderType } from '@prisma/client';
import { ClientKafka } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Order as OrderSchema } from './order.schema';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';

@Injectable()
export class OrdersService {
  constructor(
    private prismaService: PrismaService,
    @Inject('ORDERS_PUBLISHER')
    private readonly kafkaClient: ClientKafka,
    @InjectModel(OrderSchema.name) private orderModel: Model<OrderSchema>,
  ) {}

  all(filter: { wallet_id: string }) {
    return this.prismaService.order.findMany({
      where: {
        wallet_id: filter.wallet_id,
      },
      include: {
        Transactions: true,
        Asset: {
          select: {
            id: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });
  }

  async initTransaction(input: InitTransactionDto) {
    const order = await this.prismaService.order.create({
      data: {
        asset_id: input.asset_id,
        wallet_id: input.wallet_id,
        shares: input.shares,
        partial: input.shares,
        type: input.type,
        status: OrderStatus.PENDING,
        price: input.price,
        version: 1,
      },
    });

    this.kafkaClient.emit('input-orders', {
      order_id: order.id,
      investor_id: order.wallet_id,
      asset_id: order.asset_id,
      shares: order.shares,
      price: order.price,
      order_type: order.type,
    });

    return order;
  }

  async executeTransaction(input: InputExecuteTransactionDto) {
    console.log('Transaction Input: ', input);

    return this.prismaService.$transaction(async (prisma) => {
      const order = await prisma.order.findUnique({
        where: {
          id: input.order_id,
        },
      });

      if (!order) {
        console.log(
          'Pedido recebido via kafka mas não encontrado no DB: ',
          input,
        );
        return null;
      }

      await prisma.order.update({
        where: {
          id: input.order_id,
          version: order.version,
        },
        data: {
          status: input.status,
          partial: order.shares - input.negotiated_shares,
          Transactions: {
            create: {
              related_investor_id: input.related_investor_id,
              broker_transaction_id: input.broker_transaction_id,
              shares: input.negotiated_shares,
              price: input.price,
            },
          },
          version: { increment: 1 },
        },
      });

      if (input.status === OrderStatus.CLOSED) {
        await prisma.asset.update({
          where: {
            id: order.asset_id,
          },
          data: {
            price: input.price,
          },
        });

        await prisma.assetDaily.create({
          data: {
            asset_id: order.asset_id,
            date: new Date(),
            price: input.price,
          },
        });

        const walletAsset = await prisma.walletAsset.findUnique({
          where: {
            wallet_id_asset_id: {
              asset_id: order.asset_id,
              wallet_id: order.wallet_id,
            },
          },
        });

        if (walletAsset) {
          await prisma.walletAsset.update({
            where: {
              wallet_id_asset_id: {
                asset_id: order.asset_id,
                wallet_id: order.wallet_id,
              },
              version: walletAsset.version,
            },
            data: {
              shares:
                order.type === OrderType.BUY
                  ? walletAsset.shares + order.shares
                  : walletAsset.shares - order.shares,
              version: { increment: 1 },
            },
          });
        } else {
          await prisma.walletAsset.create({
            data: {
              asset_id: order.asset_id,
              wallet_id: order.wallet_id,
              shares: input.negotiated_shares,
              version: 1,
            },
          });
        }
      }
    });
  }

  subscribeEvents(wallet_id: string): Observable<{
    event: 'order-created' | 'order-updated' | 'order-deleted';
    data: Order;
  }> {
    return new Observable((observer) => {
      this.orderModel
        .watch(
          [
            {
              $match: {
                $or: [
                  {
                    operationType: 'insert',
                  },
                  {
                    operationType: 'update',
                  },
                  {
                    operationType: 'delete',
                  },
                ],
                'fullDocument.wallet_id': wallet_id,
              },
            },
          ],
          {
            fullDocument: 'updateLookup',
          },
        )
        .on('change', async (data) => {
          console.log('Alteração em uma Order: ', data.operationType);

          let order = null;

          if (data.operationType !== 'delete') {
            order = await this.prismaService.order.findUnique({
              where: {
                id: data.fullDocument._id + '',
              },
            });
          }

          observer.next({
            event:
              data.operationType === 'insert'
                ? 'order-created'
                : data.operationType === 'update'
                  ? 'order-updated'
                  : 'order-deleted',
            data: order,
          });
        });
    });
  }
}
