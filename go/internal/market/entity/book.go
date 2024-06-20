package entity

import (
	"container/heap"
	"fmt"
	"sync"
)

type Book struct {
	Order 				[]		*Order
	Transaction 		[]		*Transaction
	OrdersChan 			chan	*Order
	OrdersChanOut 		chan	*Order
	Wg 					*sync.WaitGroup
}

func NewBook(orderChan chan *Order, orderChanOut chan *Order, wg *sync.WaitGroup) *Book {
	return &Book{
		Order: 			[]*Order{},
		Transaction: 	[]*Transaction{},
		OrdersChan: 	orderChan,
		OrdersChanOut: 	orderChanOut,
		Wg: 			wg,
	}
}

func (b *Book) Trade() {
	buyOrdersQueue := make(map[string]*OrderQueue)
	sellOrdersQueue := make(map[string]*OrderQueue)

	// buyOrdersQueue := NewOrderQueue()
	// sellOrdersQueue := NewOrderQueue()

	// heap.Init(buyOrdersQueue)
	// heap.Init(sellOrdersQueue)

	for order := range b.OrdersChan {
		asset := order.Asset.ID

		if (buyOrdersQueue[asset] == nil) {
			buyOrdersQueue[asset] = NewOrderQueue()
			heap.Init(buyOrdersQueue[asset])
		}

		if (sellOrdersQueue[asset] == nil) {
			sellOrdersQueue[asset] = NewOrderQueue()
			heap.Init(sellOrdersQueue[asset])
		}

		fmt.Println("ORDER: ", order)

		if (order.OrderType == "BUY") {
			buyOrdersQueue[asset].Push(order)
			if (sellOrdersQueue[asset].Len() > 0 && sellOrdersQueue[asset].Orders[0].Price <= order.Price) {
				sellOrder := sellOrdersQueue[asset].Pop().(*Order)

				if (sellOrder.PendingShares > 0) {
					transaction := NewTransaction(sellOrder, order, order.Shares, sellOrder.Price)
					b.AddTransaction(transaction, b.Wg)
					sellOrder.Transactions = append(sellOrder.Transactions, transaction)
					order.Transactions = append(order.Transactions, transaction)
					b.OrdersChanOut <- sellOrder
					b.OrdersChanOut <- order

					if (sellOrder.PendingShares > 0) {
						sellOrdersQueue[asset].Push(sellOrder)
					}
				}
			}
		} else if (order.OrderType == "SELL") {
			sellOrdersQueue[asset].Push(order)
			if (buyOrdersQueue[asset].Len() > 0 && buyOrdersQueue[asset].Orders[0].Price >= order.Price) {
				fmt.Println("SELL ORDER: ", order)
				buyOrder := buyOrdersQueue[asset].Pop().(*Order)
				fmt.Println("BUY ORDER: ", buyOrder)

				if (buyOrder.PendingShares > 0) {
					transaction := NewTransaction(order, buyOrder, order.Shares, buyOrder.Price)
					fmt.Println("SELL TRANSACTION: ", transaction)
					b.AddTransaction(transaction, b.Wg)
					buyOrder.Transactions = append(buyOrder.Transactions, transaction)
					order.Transactions = append(order.Transactions, transaction)
					b.OrdersChanOut <- buyOrder
					b.OrdersChanOut <- order

					if (buyOrder.PendingShares > 0) {
						buyOrdersQueue[asset].Push(buyOrder)
					}
				}
			}
		}
	}
}

func (b *Book) AddTransaction(transaction *Transaction, wg *sync.WaitGroup) {
	defer wg.Done()
	
	sellingShares := transaction.SellingOrder.PendingShares
	buyingShares := transaction.BuyingOrder.PendingShares

	minShares := sellingShares

	if (buyingShares < minShares) {
		minShares = buyingShares
	}

	transaction.SellingOrder.Investor.UpdateAssetPosition(transaction.SellingOrder.Asset.ID, -minShares)
	transaction.SellingOrder.PendingShares -= minShares
	transaction.BuyingOrder.Investor.UpdateAssetPosition(transaction.BuyingOrder.Asset.ID, minShares)
	transaction.BuyingOrder.PendingShares -= minShares
	transaction.TotalPrice = float64(transaction.Shares) * transaction.BuyingOrder.Price
	if (transaction.SellingOrder.PendingShares == 0) {
		transaction.SellingOrder.Status = "CLOSED"
	}
	if (transaction.BuyingOrder.PendingShares == 0) {
		transaction.BuyingOrder.Status = "CLOSED"
	}
	b.Transaction = append(b.Transaction, transaction)
}