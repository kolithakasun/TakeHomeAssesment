import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";


export class TakeHomeAssesmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get Default VPC
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      vpcId: 'vpc-044cfbb21a38bcc7c',
      region: 'us-east-1'
    });

    // Create SG for ALB
    const albSG = new ec2.SecurityGroup(this, 'SecurityGroup', { 
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'alb-security-group',
    });

    // Adding Rule
    albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');

    // ALB Creation
    const alb = new elbv2.ApplicationLoadBalancer(this, 'MyALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSG,
      loadBalancerName: 'ecs-alb'
    });

    // Create http listner
    const httplistener = alb.addListener('HTTPListener', {
      port: 80,
      open: true,
    });

    httplistener.addAction("HttpDefaultAction", {
      action: elbv2.ListenerAction.redirect({
        protocol: "HTTPS",
        host: "#{host}",
        path: "/#{path}",
        query: "#{query}",
        port: "443",
      }),
    });

    // // S3 Bucket
    // const s3Bucket = new s3.Bucket(this, "TakeHomeAssesmentBucket", {
    //   bucketName: "TakeHomeAssesmentBucket",
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    // });

    // ECS Cluster
    const thacluster = new ecs.Cluster(this, "THACluster", {
      vpc: vpc
    });
    
    //Execution Role

  }
}
