import * as cdk from '@aws-cdk/core';
import SudokuLambdaWithAPI from './sudoku-lambda-with-api';
import Environment from './Environment';

interface CdkTsServerlessDenemeStackProps extends cdk.StackProps {
  appEnv: Environment
}
class CdkTsServerlessDenemeStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: CdkTsServerlessDenemeStackProps,
  ) {
    super(scope, id, props);

    const sudokuLambdaWithAPI = new SudokuLambdaWithAPI(
      this,
      'SudokuLambdaWithAPI',
      {
        env: props.appEnv,
      },
    );

    console.log(sudokuLambdaWithAPI.cfnOutputAPI.exportName);
  }
}

export default CdkTsServerlessDenemeStack;
