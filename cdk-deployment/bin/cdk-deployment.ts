#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkDeploymentStack } from '../lib/cdk-deployment-stack';
import { TakeHomeAssesmentStack } from '../lib/take-home-assesment-stack';

export const app = new cdk.App();

// new CdkDeploymentStack(app, 'CdkDeploymentStack', {});

new TakeHomeAssesmentStack(app, 'TakeHomeAssesmentStack', {
  env: {
    account: "010526269666",
    region: "us-east-1"
  }
});