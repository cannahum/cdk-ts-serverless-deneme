import * as cdk from '@aws-cdk/core';
import {
  Runtime,
  Code,
  IFunction,
  Function,
  CfnParametersCode,
} from '@aws-cdk/aws-lambda';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import Environment from './Environment';

interface CdkTsServerlessDenemeStackProps extends cdk.StackProps {
  appEnv: Environment;
}
class CdkTsServerlessDenemeStack extends cdk.Stack {
  public static readonly STACK_NAME = 'CdkTsServerlessDenemeStack';

  public readonly httpApi: HttpApi;

  public readonly cfnOutputAPI: cdk.CfnOutput;

  private readonly appEnv: Environment;

  public sudokuCode: CfnParametersCode;

  public batchSudokuCode: CfnParametersCode;

  constructor(
    scope: cdk.Construct,
    id: string,
    { appEnv }: CdkTsServerlessDenemeStackProps,
  ) {
    super(scope, id);

    this.appEnv = appEnv;
    const generateSudokuHandler = this.buildLambdaGenerateSudoku();
    const generateSudokuLambdaIntegration = new LambdaProxyIntegration({
      handler: generateSudokuHandler,
    });

    const generateBatchSudokuHandler = this
      .buildLambdaGenerateBatchSudoku();
    const generateBatchSudokuLambdaIntegration = new LambdaProxyIntegration({
      handler: generateBatchSudokuHandler,
    });

    this.httpApi = this.buildAPI(
      generateSudokuLambdaIntegration,
      generateBatchSudokuLambdaIntegration,
    );

    this.cfnOutputAPI = new cdk.CfnOutput(
      this,
      `GenerateSudokuAPI-${this.appEnv}`, {
        value: this.httpApi.url!,
        exportName: 'GenerateSudokuAPIEndpoint',
      },
    );
  }

  private buildLambdaGenerateSudoku(): IFunction {
    const sudokuHandlerCode = Code.fromCfnParameters();
    this.sudokuCode = sudokuHandlerCode;
    return new Function(
      this,
      `GenerateSudoku-${this.appEnv}`,
      {
        runtime: Runtime.GO_1_X,
        handler: 'sudoku',
        code: sudokuHandlerCode,
      },
    );
  }

  private buildLambdaGenerateBatchSudoku(): IFunction {
    const batchSudokuHandlerCode = Code.fromCfnParameters();
    this.batchSudokuCode = batchSudokuHandlerCode;
    return new Function(
      this,
      `GenerateBatchSudoku-${this.appEnv}`,
      {
        runtime: Runtime.GO_1_X,
        handler: 'batchsudoku',
        code: batchSudokuHandlerCode,
      },
    );
  }

  private buildAPI(
    sudokuHandlerInt: LambdaProxyIntegration,
    batchSudokuHandlerInt: LambdaProxyIntegration,
  ): HttpApi {
    const httpApi = new HttpApi(this, `SudokuHttpAPI-${this.appEnv}`, {
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

export default CdkTsServerlessDenemeStack;
