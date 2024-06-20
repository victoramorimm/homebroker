package main

import (
	"encoding/json"
	"fmt"
	"sync"

	ckafka "github.com/confluentinc/confluent-kafka-go/kafka"
	"github.com/victoramorimm/homebroker/go/internal/dto"
	"github.com/victoramorimm/homebroker/go/internal/infra/kafka"
	"github.com/victoramorimm/homebroker/go/internal/market/entity"
	"github.com/victoramorimm/homebroker/go/internal/market/transformer"
)

func main() {
	ordersIn := make(chan *entity.Order)
	ordersOut := make(chan *entity.Order)
	wg := &sync.WaitGroup{}
	defer wg.Wait()

	kafkaMsgChan := make(chan *ckafka.Message)
	configMap := &ckafka.ConfigMap{
		"bootstrap.servers": "host.docker.internal:9094",
		"group.id": "trade-group",
		"auto.offset.reset": "latest",
	}

	producer := kafka.NewKafkaProducer(configMap)
	kafka := kafka.NewConsumer(configMap, []string{"input-orders"})

	go kafka.Consume(kafkaMsgChan) // Thread 2

	// Recebe as mensagens do Kafka, joga no input, processa
	// e joga no output e depois envia para o Kafka
	book := entity.NewBook(ordersIn, ordersOut, wg)
	go book.Trade() // Thread 3

	go func() {
		for msg := range kafkaMsgChan {
			wg.Add(1)
			fmt.Println(string(msg.Value))
			tradeInput := dto.TradeInput{}
			err := json.Unmarshal(msg.Value, &tradeInput)
			if err != nil {
				panic(err)
			}
			order := transformer.TransformInput(tradeInput)
			ordersIn <- order
		}
	}()

	for res := range ordersOut {
		output := transformer.TransformOutput(res)
		outputJson, err := json.Marshal(output)
		fmt.Println(string(outputJson))
		if (err != nil) {
			fmt.Println(err)
		}
		producer.Publish(outputJson, []byte("orders"), "output-orders")
	}
}