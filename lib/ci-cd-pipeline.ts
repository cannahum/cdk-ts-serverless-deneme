import * as cdk from '@aws-cdk/core';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import {
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
import Environment from './Environment';

interface SudokuStackCICDPipelineProps extends cdk.StackProps {
    appEnv: Environment;
}

export default class SudokuStackCICDPipelineStack extends cdk.Stack {
    private readonly pipeline: Pipeline;

    constructor(
      scope: cdk.Construct,
      id: string,
      { appEnv }: SudokuStackCICDPipelineProps,
    ) {
      super(scope, id);

      console.log(appEnv);

      const cdkBuildProject = new PipelineProject(this, 'CDKBuildProject', {
        buildSpec: BuildSpec.fromObject({
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
              'CdkTsServerlessDenemeStack.template.json',
            ],
          },
        }),
        environment: {
          buildImage: LinuxBuildImage.STANDARD_5_0,
          environmentVariables: {
            APP_ENV: {
              value: appEnv,
              type: BuildEnvironmentVariableType.PLAINTEXT,
            },
          },
        },
      });

      const sudokuLambdaBuildProject = new PipelineProject(
        this,
        'SudokuLambdaBuildProject',
        {
          buildSpec: BuildSpec.fromObject({
            version: '0.2',
            phases: {
              install: {
                commands: [
                  'cd api/sudoku',
                  'go get ./...',
                ],
              },
              build: {
                commands: 'go build -o sudoku',
              },
            },
            artifacts: {
              'base-directory': 'api',
              files: [
                'sudoku',
              ],
            },
          }),
          environment: {
            buildImage: LinuxBuildImage.STANDARD_2_0,
          },
        },
      );

      const batchSudokuLambdaBuildProject = new PipelineProject(
        this,
        'BatchSudokuLambdaBuildProject',
        {
          buildSpec: BuildSpec.fromObject({
            version: '0.2',
            phases: {
              install: {
                commands: [
                  'cd api/batch-sudoku',
                  'go get ./...',
                ],
              },
              build: {
                commands: 'go build -o batchsudoku',
              },
            },
            artifacts: {
              'base-directory': 'api',
              files: [
                'batchsudoku',
              ],
            },
          }),
          environment: {
            buildImage: LinuxBuildImage.STANDARD_2_0,
          },
        },
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
            stageName: 'Build',
            actions: [
              new CodeBuildAction({
                actionName: 'SudokuLambda_Build',
                project: sudokuLambdaBuildProject,
                input: sourceOutput,
                outputs: [sudokuBuildOutput],
              }),
              new CodeBuildAction({
                actionName: 'BatchSudokuLambda_Build',
                project: batchSudokuLambdaBuildProject,
                input: sourceOutput,
                outputs: [batchSudokuBuildOutput],
              }),
              new CodeBuildAction({
                actionName: 'CDK_Build',
                project: cdkBuildProject,
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
                  'CdkTsServerlessDenemeStack.template.json',
                ),
                stackName: 'CdkTsServerlessDenemeStack',
                adminPermissions: true,
                extraInputs: [sudokuBuildOutput, batchSudokuBuildOutput],
              }),
            ],
          },
        ],
      });
    }
}
