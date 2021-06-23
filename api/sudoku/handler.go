package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
)

type MyEvent struct {
	Name string `json:"name"`
}

func GenerateSudokuHandler(ctx context.Context, name MyEvent) (string, error) {
	return "Welcome to GenerateSudokuHandler!", nil
}

func main() {
	lambda.Start(GenerateSudokuHandler)
}
