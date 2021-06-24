import * as cdk from '@aws-cdk/core';
import { Artifact, ArtifactPath, Pipeline } from '@aws-cdk/aws-codepipeline';
import {
  BuildEnvironment,
  BuildEnvironmentVariable,
  BuildEnvironmentVariableType,
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from '@aws-cdk/aws-codebuild';
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  CodeStarConnectionsSourceAction,
  // ManualApprovalAction,
} from '@aws-cdk/aws-codepipeline-actions';
import { CfnParametersCode } from '@aws-cdk/aws-lambda';
import CdkTsServerlessDenemeStack from './cdk-ts-serverless-deneme-stack';
import Environment from './Environment';

type StackInfo = {
  sudokuCode: CfnParametersCode;
  batchSudokuCode: CfnParametersCode;
  apiURL: string;
}
interface SudokuStackCICDPipelineProps extends cdk.StackProps {
  ppdStack: StackInfo;
  prdStack: StackInfo
}

export default class SudokuStackCICDPipelineStack extends cdk.Stack {
  public static getDeploymentAction(
    templatePath: ArtifactPath,
    parameterOverrides: {
      [index: string]: any;
    } = {},
    extraInputs?: Artifact[],
  ): CloudFormationCreateUpdateStackAction {
    return new CloudFormationCreateUpdateStackAction({
      actionName: 'Sudoku_Lambda_Cfn_Deploy',
      templatePath,
      parameterOverrides,
      stackName: CdkTsServerlessDenemeStack.STACK_NAME,
      adminPermissions: true,
      extraInputs,
    });
  }

    private readonly pipeline: Pipeline;

    constructor(
      scope: cdk.Construct,
      id: string,
      { ppdStack, prdStack }: SudokuStackCICDPipelineProps,
    ) {
      super(scope, id);

      // Source code - Github
      const sourceOutput = new Artifact();
      const codeStarAction = new CodeStarConnectionsSourceAction({
        actionName: 'CheckoutFromGithub',
        // eslint-disable-next-line max-len
        connectionArn: 'arn:aws:codestar-connections:us-east-1:502192330072:connection/e34c709f-d258-4a60-99bd-6e8c162ba8ec',
        output: sourceOutput,
        owner: 'cannahum',
        repo: 'cdk-ts-serverless-deneme',
        branch: 'release',
      });

      // CDK Pipeline Stack - Preproduction
      const cdkBuildOutputPPD = new Artifact('CdkBuildOutputPPD');
      const cdkBuildProjectPPD = this.getCdkBuild(Environment.PPD);
      const cdkBuildActionPPD = new CodeBuildAction({
        actionName: 'CDKPPD_BuildAction',
        project: cdkBuildProjectPPD,
        input: sourceOutput,
        outputs: [cdkBuildOutputPPD],
      });
      // CDK Pipeline Stack - Production
      const cdkBuildOutputPRD = new Artifact('CdkBuildOutputPRD');
      const cdkBuildProjectPRD = this.getCdkBuild(Environment.PRD);
      const cdkBuildActionPRD = new CodeBuildAction({
        actionName: 'CDKPRD_BuildAction',
        project: cdkBuildProjectPRD,
        input: sourceOutput,
        outputs: [cdkBuildOutputPRD],
      });

      // Sudoku Lambda Stack - Preproduction
      const sudokuBuildOutputPPD = new Artifact('SudokuBuildOutputPPD');
      const sudokuLambdaBuildProjectPPD = this.getGoLambdaBuild(
        Environment.PPD,
        'GenerateSudoku',
        'api/sudoku',
        'sudoku',
      );
      const sudokuLambdaBuildActionPPD = new CodeBuildAction({
        actionName: 'SudokuLambdaPPD_BuildAction',
        project: sudokuLambdaBuildProjectPPD,
        input: sourceOutput,
        outputs: [sudokuBuildOutputPPD],
      });
      // Sudoku Lambda Stack - Production
      const sudokuBuildOutputPRD = new Artifact('SudokuBuildOutputPRD');
      const sudokuLambdaBuildProjectPRD = this.getGoLambdaBuild(
        Environment.PRD,
        'GenerateSudoku',
        'api/sudoku',
        'sudoku',
      );
      const sudokuLambdaBuildActionPRD = new CodeBuildAction({
        actionName: 'SudokuLambdaPRD_BuildAction',
        project: sudokuLambdaBuildProjectPRD,
        input: sourceOutput,
        outputs: [sudokuBuildOutputPRD],
      });

      // Batch Sudoku Lambda Stack - Preproduction
      const batchSudokuBuildOutputPPD = new Artifact(
        'BatchSudokuBuildOutputPPD',
      );
      const batchSudokuLambdaBuildProjectPPD = this.getGoLambdaBuild(
        Environment.PPD,
        'GenerateBatchSudoku',
        'api/batch-sudoku',
        'batchsudoku',
      );
      const batchSudokuLambdaBuildActionPPD = new CodeBuildAction({
        actionName: 'BatchSudokuLambdaPPD_BuildAction',
        project: batchSudokuLambdaBuildProjectPPD,
        input: sourceOutput,
        outputs: [batchSudokuBuildOutputPPD],
      });
      // Batch Sudoku Lambda Stack - Production
      const batchSudokuBuildOutputPRD = new Artifact(
        'BatchSudokuBuildOutputPRD',
      );
      const batchSudokuLambdaBuildProjectPRD = this.getGoLambdaBuild(
        Environment.PRD,
        'GenerateBatchSudoku',
        'api/batch-sudoku',
        'batchsudoku',
      );
      const batchSudokuLambdaBuildActionPRD = new CodeBuildAction({
        actionName: 'BatchSudokuLambdaPRD_BuildAction',
        project: batchSudokuLambdaBuildProjectPRD,
        input: sourceOutput,
        outputs: [batchSudokuBuildOutputPRD],
      });

      // Deployment - Preproduction
      const deployActionPPD = SudokuStackCICDPipelineStack.getDeploymentAction(
        cdkBuildOutputPPD.atPath(
          // eslint-disable-next-line max-len
          `${CdkTsServerlessDenemeStack.STACK_NAME}-${Environment.PPD}.template.json`,
        ),
        {
          ...ppdStack.sudokuCode.assign(sudokuBuildOutputPPD.s3Location),
          ...ppdStack
            .batchSudokuCode.assign(batchSudokuBuildOutputPPD.s3Location),
        },
        [sudokuBuildOutputPPD, batchSudokuBuildOutputPPD],
      );

      // Deployment - Production
      const deployActionPRD = SudokuStackCICDPipelineStack.getDeploymentAction(
        cdkBuildOutputPPD.atPath(
          // eslint-disable-next-line max-len
          `${CdkTsServerlessDenemeStack.STACK_NAME}-${Environment.PRD}.template.json`,
        ),
        {
          ...prdStack.sudokuCode.assign(sudokuBuildOutputPRD.s3Location),
          ...prdStack
            .batchSudokuCode.assign(batchSudokuBuildOutputPRD.s3Location),
        },
        [sudokuBuildOutputPRD, batchSudokuBuildOutputPRD],
      );

      this.pipeline = new Pipeline(this, 'Pipeline', {
        crossAccountKeys: false,
        stages: [
          {
            stageName: 'Source',
            actions: [
              codeStarAction,
            ],
          },
          {
            stageName: 'Build-PPD',
            actions: [
              sudokuLambdaBuildActionPPD,
              batchSudokuLambdaBuildActionPPD,
              cdkBuildActionPPD,
            ],
          },
          {
            stageName: 'Deploy-PPD',
            actions: [
              deployActionPPD,
            ],
          },
          // {
          //   stageName: 'AdminApproval',
          //   actions: [
          //     new ManualApprovalAction({
          //       actionName: 'Deploy-Sudoku-PRD-Approval',
          //       additionalInformation: 'Ready to deploy to Production?',
          //       externalEntityLink: ppdStack.apiURL,
          //       runOrder: 1,
          //     }),
          //   ],
          // },
          {
            stageName: 'Build-PRD',
            actions: [
              sudokuLambdaBuildActionPRD,
              batchSudokuLambdaBuildActionPRD,
              cdkBuildActionPRD,
            ],
          },
          {
            stageName: 'Deploy-PRD',
            actions: [
              deployActionPRD,
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
      variables: {[index: string]: BuildEnvironmentVariable} = {},
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

      const environmentVariables = {
        APP_ENV: {
          value: appEnv,
          type: BuildEnvironmentVariableType.PLAINTEXT,
        },
        ...variables,
      };

      return this.getCodebuildPipelineProject(
        `${lambdaFnName}-LambdaBuild`,
        appEnv,
        buildSpec,
        {
          buildImage: LinuxBuildImage.STANDARD_2_0,
          environmentVariables,
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
