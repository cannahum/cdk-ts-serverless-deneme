#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import CdkTsServerlessDenemeStack from '../lib/cdk-ts-serverless-deneme-stack';
import Environment from '../lib/Environment';
import SudokuStackCICDPipeline from '../lib/ci-cd-pipeline';

const app = new cdk.App();

const ppdStack = new CdkTsServerlessDenemeStack(
  app,
  `${CdkTsServerlessDenemeStack.STACK_NAME}${Environment.PPD}`,
  {
    env: { region: 'us-east-1' },
    appEnv: Environment.PPD,
  },
);

const prdStack = new CdkTsServerlessDenemeStack(
  app,
  `${CdkTsServerlessDenemeStack.STACK_NAME}${Environment.PRD}`,
  {
    env: { region: 'us-east-1' },
    appEnv: Environment.PRD,
  },
);

// eslint-disable-next-line no-new
new SudokuStackCICDPipeline(
  app,
  'SudokuStackCICDPipelineStack',
  {
    ppdStack: {
      sudokuCode: ppdStack.sudokuCode,
      batchSudokuCode: ppdStack.batchSudokuCode,
      apiURL: ppdStack.httpApi.url!,
    },
    prdStack: {
      sudokuCode: prdStack.sudokuCode,
      batchSudokuCode: prdStack.batchSudokuCode,
      apiURL: prdStack.httpApi.url!,
    },
  },
);

app.synth();
