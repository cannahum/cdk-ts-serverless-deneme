package main

import (
	"context"
	"fmt"

	"os"

	"github.com/aws/aws-lambda-go/lambda"
)

var appEnv = os.Getenv("APP_ENV")

type MyEvent struct {
	Name string `json:"name"`
}

func GenerateSudokuHandler(ctx context.Context, name MyEvent) (string, error) {
	return fmt.Sprintf("%s: Welcome to Generate Sudoku Handler!", appEnv), nil
}

func main() {
	lambda.Start(GenerateSudokuHandler)
}
