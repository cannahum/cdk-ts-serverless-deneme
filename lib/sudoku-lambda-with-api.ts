import * as cdk from '@aws-cdk/core';
import {
  Runtime,
  Code,
  IFunction,
  Function,
} from '@aws-cdk/aws-lambda';
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

    private readonly environment: Environment;

    constructor(scope: cdk.Construct, id: string, { env }: LambdaWithAPIProps) {
      super(scope, id);
      this.environment = env;
      const generateSudokuHandler = this.buildLambdaGenerateSudoku(env);
      const generateSudokuLambdaIntegration = new LambdaProxyIntegration({
        handler: generateSudokuHandler,
      });

      const generateBatchSudokuHandler = this
        .buildLambdaGenerateBatchSudoku(env);
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

    private buildLambdaGenerateSudoku(env: Environment): IFunction {
      return new Function(
        this,
        `GenerateSudokuLambda-${env}`,
        {
          runtime: Runtime.GO_1_X,
          handler: 'main.main',
          code: Code.fromAsset(path.join(__dirname, '..', 'api', 'sudoku')),
          environment: {
            appEnv: this.environment,
          },
        },
      );
      // return new lambda.GoFunction(
      //   this,
      //   `GenerateSudokuLambda-${env}`,
      //   {
      //     runtime: Runtime.GO_1_X,
      //     entry: path.join(__dirname, '..', 'api', 'sudoku'),
      //   },
      // );
    }

    private buildLambdaGenerateBatchSudoku(env: Environment): IFunction {
      return new Function(
        this,
        `GenerateBatchSudokuLambda-${env}`,
        {
          runtime: Runtime.GO_1_X,
          handler: 'main.main',
          code: Code.fromAsset(
            path.join(__dirname, '..', 'api', 'batch-sudoku'),
          ),
          environment: {
            appEnv: this.environment,
          },
        },
      );
      // return new lambda.GoFunction(
      //   this,
      //   `GenerateBatchSudokuLambda-${env}`,
      //   {
      //     runtime: Runtime.GO_1_X,
      //     entry: path.join(__dirname, '..', 'api', 'batch-sudoku'),
      //   },
      // );
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
