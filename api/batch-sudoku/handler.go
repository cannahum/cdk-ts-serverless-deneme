package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

type MyEvent struct {
	Name string `json:"name"`
}

func GenerateBatchSudokuHandler(ctx context.Context, name MyEvent) (string, error) {
	return "Welcome to GenerateBatchSudokuHandler!", nil
}

func main() {
	lambda.Start(GenerateBatchSudokuHandler)
}
