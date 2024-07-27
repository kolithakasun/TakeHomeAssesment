import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { aws_applicationautoscaling } from "aws-cdk-lib";

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

    // httplistener.addAction("HttpDefaultAction", {
    //   action: elbv2.ListenerAction.redirect({
    //     protocol: "HTTPS",
    //     host: "#{host}",
    //     path: "/#{path}",
    //     query: "#{query}",
    //     port: "443",
    //   }),
    // });

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
    const executionrole = new iam.Role(this, "EcsTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    // Log Group
    const ecsLogGroup = new logs.LogGroup(this, "ContainerLogGroup", {
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    const taskDefinition = new ecs.TaskDefinition(this, "THATaskDefinition", {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: "256",
      memoryMiB: "512",
      networkMode: ecs.NetworkMode.AWS_VPC,
      taskRole: executionrole,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Add contianer to the task
    const container = taskDefinition.addContainer("THAContainer", {
      image: ecs.ContainerImage.fromRegistry("010526269666.dkr.ecr.us-east-1.amazonaws.com/takehomeassesment:latest"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "THALogs",
        logGroup: ecsLogGroup,
      })
    });

    // Port Mapping
    container.addPortMappings({ containerPort: 8000, hostPort: 8000 });

    // SG for ECS
    const ecsSG = new ec2.SecurityGroup(this, "THASecurityGroup", {
      vpc: vpc,
      allowAllOutbound: true,
    });
    
    // Allow traffic from ALB
    ecsSG.addIngressRule(
      ec2.Peer.securityGroupId(albSG.securityGroupId),
      ec2.Port.tcp(8000)
    );

    // ECS Service
    const thaecsservice = new ecs.FargateService(this, "THAService", {
      cluster: thacluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [ecsSG],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      assignPublicIp: true,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      enableExecuteCommand: true,
    });

    // Create TG and Add ECS Service as the targets
    const thatargetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      targets: [thaecsservice],
      protocol: elbv2.ApplicationProtocol.HTTP,
      vpc: vpc,
      port: 8000,
      deregistrationDelay: cdk.Duration.seconds(30),
      healthCheck: {
        path: "/",
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        interval: cdk.Duration.seconds(10),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: "200",
      },
    });

    // Add default Action for http listener
    httplistener.addAction("HttpDefaultAction", {
      action: elbv2.ListenerAction.forward([thatargetGroup]),
    });

  }
}
