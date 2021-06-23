#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import CdkTsServerlessDenemeStack from '../lib/cdk-ts-serverless-deneme-stack';
import Environment from '../lib/Environment';
import SudokuStackCICDPipeline from '../lib/ci-cd-pipeline';

const e = process.env.APP_ENV;
let appEnv;
switch (e) {
  case Environment.PRD:
    appEnv = Environment.PRD;
    break;
  case Environment.PPD:
    appEnv = Environment.PPD;
    break;
  case Environment.DEV:
    appEnv = Environment.DEV;
    break;
  default:
    throw Error('No APP_ENV detected');
}

const app = new cdk.App();

// eslint-disable-next-line no-new
new CdkTsServerlessDenemeStack(app, 'CdkTsServerlessDenemeStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: {
  // account: process.env.CDK_DEFAULT_ACCOUNT,
  // region: process.env.CDK_DEFAULT_REGION
  // },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  env: { region: 'us-east-1' },
  appEnv,
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

// eslint-disable-next-line no-new
new SudokuStackCICDPipeline(
  app,
  'SudokuStackCICDPipelineStack',
  { appEnv },
);

app.synth();
