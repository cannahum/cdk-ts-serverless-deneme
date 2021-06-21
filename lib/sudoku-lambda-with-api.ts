import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-go';
import { Runtime } from '@aws-cdk/aws-lambda';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as path from 'path';
import Environment from './Environment';

interface LambdaWithAPIProps {
    env: Environment;
}

export default class SudokuLambdaWithAPI extends cdk.Construct {
    public readonly httpApi: HttpApi;

    public readonly cfnOutputAPI: cdk.CfnOutput;

    constructor(scope: cdk.Construct, id: string, { env }: LambdaWithAPIProps) {
      super(scope, id);

      const generateSudokuHandler = this.buildLambdaGenerateSudoku(env);
      const generateBatchSudokuHandler = this
        .buildLambdaGenerateBatchSudoku(env);

      const generateSudokuLambdaIntegration = new LambdaProxyIntegration({
        handler: generateSudokuHandler,
      });

      const generateBatchSudokuLambdaIntegration = new LambdaProxyIntegration({
        handler: generateBatchSudokuHandler,
      });

      this.httpApi = this.buildAPI(
        generateSudokuLambdaIntegration,
        generateBatchSudokuLambdaIntegration,
        env,
      );

      this.cfnOutputAPI = new cdk.CfnOutput(this, `GenerateSudokuAPI-${env}`, {
        value: this.httpApi.url!,
        exportName: 'GenerateSudokuAPIEndpoint',
      });
    }

    private buildLambdaGenerateSudoku(env: Environment): lambda.GoFunction {
      return new lambda.GoFunction(
        this,
        `GenerateSudokuLambda-${env}`,
        {
          runtime: Runtime.GO_1_X,
          entry: path.join(__dirname, '..', 'api', 'sudoku'),
        },
      );
    }

    private buildLambdaGenerateBatchSudoku(env: Environment) {
      return new lambda.GoFunction(
        this,
        `GenerateBatchSudokuLambda-${env}`,
        {
          runtime: Runtime.GO_1_X,
          entry: path.join(__dirname, '..', 'api', 'batch-sudoku'),
        },
      );
    }

    private buildAPI(
      sudokuHandlerInt: LambdaProxyIntegration,
      batchSudokuHandlerInt: LambdaProxyIntegration,
      env: Environment,
    ): HttpApi {
      const httpApi = new HttpApi(this, `GenerateSudokuHttpAPI-${env}`, {
        corsPreflight: {
          allowOrigins: ['*'],
          allowMethods: [CorsHttpMethod.GET],
        },
        apiName: 'generate-sudoku-api',
        createDefaultStage: true,
      });

      httpApi.addRoutes({
        path: '/sudoku',
        methods: [
          HttpMethod.GET,
        ],
        integration: sudokuHandlerInt,
      });

      httpApi.addRoutes({
        path: '/sudoku/batch',
        methods: [
          HttpMethod.GET,
        ],
        integration: batchSudokuHandlerInt,
      });

      return httpApi;
    }
}
