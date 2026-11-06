# Deploying TapNodd to AWS

Stack: App Runner (container) + RDS Postgres + S3 (uploads) + ECR. Region defaults to ap-south-1.
The app reads `S3_BUCKET` for uploads (local `uploads/` when unset) and uses `prisma/schema.postgres.prisma`
(generated from the SQLite schema by `scripts/make-pg-schema.mjs`). Tables are created on container start.

Needs: AWS CLI logged in, Docker, Terraform.

```
cd infra
terraform init
terraform apply -target=aws_ecr_repository.app        # 1. create the registry
# 2. build and push the image (replace ACCOUNT and REGION)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com
docker build -t ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/tapnodd:latest ..
docker push ACCOUNT.dkr.ecr.ap-south-1.amazonaws.com/tapnodd:latest
terraform apply                                        # 3. database, bucket, App Runner
```
The `url` output is the live site. Seed the demo account once with `npm run seed` using the RDS URL
(from a machine that can reach it), or just sign up in the app.
Note: the database password is kept in Terraform state and the App Runner environment; move it to
Secrets Manager before real customers use this.
