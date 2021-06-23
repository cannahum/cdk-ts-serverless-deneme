package main

import (
	"context"
	"fmt"

	"os"

	"github.com/aws/aws-lambda-go/lambda"
)

var appEnv = os.Getenv("appEnv")

type MyEvent struct {
	Name string `json:"name"`
}

func GenerateSudokuHandler(ctx context.Context, name MyEvent) (string, error) {
	return fmt.Sprintf("Env %s: Welcome to GenerateSudokuHandler!", appEnv), nil
}

func main() {
	lambda.Start(GenerateSudokuHandler)
}
