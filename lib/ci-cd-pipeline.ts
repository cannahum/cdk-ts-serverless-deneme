import * as cdk from '@aws-cdk/core';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import {
  BuildEnvironment,
  BuildEnvironmentVariableType,
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from '@aws-cdk/aws-codebuild';
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  CodeStarConnectionsSourceAction,
} from '@aws-cdk/aws-codepipeline-actions';
import { CfnParametersCode } from '@aws-cdk/aws-lambda';
import CdkTsServerlessDenemeStack from './cdk-ts-serverless-deneme-stack';
import Environment from './Environment';

interface SudokuStackCICDPipelineProps extends cdk.StackProps {
  sudokuCode: CfnParametersCode;
  batchSudokuCode: CfnParametersCode;
}

export default class SudokuStackCICDPipelineStack extends cdk.Stack {
    private readonly pipeline: Pipeline;

    constructor(
      scope: cdk.Construct,
      id: string,
      { sudokuCode, batchSudokuCode }: SudokuStackCICDPipelineProps,
    ) {
      super(scope, id);

      const cdkBuildProjectPPD = this.getCdkBuild(Environment.PPD);
      const sudokuLambdaBuildProjectPPD = this.getGoLambdaBuild(
        Environment.PPD,
        'GenerateSudoku',
        'api/sudoku',
        'sudoku',
      );
      const batchSudokuLambdaBuildProjectPPD = this.getGoLambdaBuild(
        Environment.PPD,
        'GenerateBatchSudoku',
        'api/batch-sudoku',
        'batchsudoku',
      );

      const sourceOutput = new Artifact();
      const sudokuBuildOutput = new Artifact('SudokuBuildOutput');
      const batchSudokuBuildOutput = new Artifact('BatchSudokuBuildOutput');
      const cdkBuildOutput = new Artifact('CdkBuildOutput');

      this.pipeline = new Pipeline(this, 'Pipeline', {
        crossAccountKeys: false,
        stages: [
          {
            stageName: 'Source',
            actions: [
              new CodeStarConnectionsSourceAction({
                actionName: 'CheckoutFromGithub',
                // eslint-disable-next-line max-len
                connectionArn: 'arn:aws:codestar-connections:us-east-1:502192330072:connection/e34c709f-d258-4a60-99bd-6e8c162ba8ec',
                output: sourceOutput,
                owner: 'cannahum',
                repo: 'cdk-ts-serverless-deneme',
                branch: 'release',
              }),
            ],
          },
          {
            stageName: 'Build-PPD',
            actions: [
              new CodeBuildAction({
                actionName: 'SudokuLambda_BuildAction',
                project: sudokuLambdaBuildProjectPPD,
                input: sourceOutput,
                outputs: [sudokuBuildOutput],
              }),
              new CodeBuildAction({
                actionName: 'BatchSudokuLambda_BuildAction',
                project: batchSudokuLambdaBuildProjectPPD,
                input: sourceOutput,
                outputs: [batchSudokuBuildOutput],
              }),
              new CodeBuildAction({
                actionName: 'CDK_BuildAction',
                project: cdkBuildProjectPPD,
                input: sourceOutput,
                outputs: [cdkBuildOutput],
              }),
            ],
          },
          {
            stageName: 'Deploy',
            actions: [
              new CloudFormationCreateUpdateStackAction({
                actionName: 'Sudoku_Lambda_Cfn_Deploy',
                templatePath: cdkBuildOutput.atPath(
                  // eslint-disable-next-line max-len
                  `${CdkTsServerlessDenemeStack.STACK_NAME}-${Environment.PPD}.template.json`,
                ),
                parameterOverrides: {
                  ...sudokuCode.assign(sudokuBuildOutput.s3Location),
                  ...batchSudokuCode.assign(batchSudokuBuildOutput.s3Location),
                },
                stackName: 'CdkTsServerlessDenemeStack',
                adminPermissions: true,
                extraInputs: [sudokuBuildOutput, batchSudokuBuildOutput],
              }),
            ],
          },
        ],
      });
    }

    private getCdkBuild(appEnv: Environment): PipelineProject {
      const buildSpec = BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: 'npm install',
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist',
            ],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: [
            // eslint-disable-next-line max-len
            `${CdkTsServerlessDenemeStack.STACK_NAME}-${Environment.PPD}.template.json`,
          ],
        },
      });

      const environment: BuildEnvironment = {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        environmentVariables: {
          APP_ENV: {
            value: appEnv,
            type: BuildEnvironmentVariableType.PLAINTEXT,
          },
        },
      };

      return this.getCodebuildPipelineProject(
        'CDKBuildProject',
        appEnv,
        buildSpec,
        environment,
      );
    }

    private getGoLambdaBuild(
      appEnv: Environment,
      lambdaFnName: string,
      baseDirectory: string,
      outputFileName: string,
    ): PipelineProject {
      const buildSpec = BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              `cd ${baseDirectory}`,
              'go get ./...',
            ],
          },
          build: {
            commands: [
              `go build -o ${outputFileName}`,
            ],
          },
        },
        artifacts: {
          'base-directory': baseDirectory,
          files: [
            outputFileName,
          ],
        },
      });

      return this.getCodebuildPipelineProject(
        `${lambdaFnName}-LambdaBuild`,
        appEnv,
        buildSpec,
        {
          buildImage: LinuxBuildImage.STANDARD_2_0,
        },
      );
    }

    private getCodebuildPipelineProject(
      buildName: string,
      appEnv: Environment,
      spec: BuildSpec,
      env: BuildEnvironment,
    ): PipelineProject {
      return new PipelineProject(this, `${buildName}-${appEnv}`, {
        buildSpec: spec,
        environment: env,
      });
    }
}
