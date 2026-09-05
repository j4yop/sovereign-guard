# Internal Engineering Deployment Guide
**Classification:** PublicInternal  
**Target Architecture:** AWS ECS Fargate & CloudFront  
**Last Updated:** September 2026

## 1. Overview
This document outlines the standard deployment pipeline for internal services within the engineering organization.

## 2. Infrastructure Prerequisites
- Docker container images must be built multi-arch (`linux/amd64`, `linux/arm64`).
- All services run behind private Application Load Balancers with AWS WAF enabled.
- Container memory allocation: 2 vCPU, 4GB RAM minimum for gateway nodes.

## 3. Deployment Steps
1. Run local linting and security scanners:
   ```bash
   pnpm lint && pytest tests/
   ```
2. Build and push container to internal ECR registry:
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login ...
   ```
3. Trigger blue/green deployment via AWS CodeDeploy.
4. Verify health checks at `/healthz` returning HTTP 200 within 45 seconds.
