terraform {
  required_version = ">= 1.5"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.5" }
  }
}

provider "aws" { region = var.region }

variable "region" { default = "ap-south-1" }
variable "name" { default = "foundertouch" }
variable "image_tag" { default = "latest" }

data "aws_caller_identity" "me" {}
data "aws_vpc" "default" { default = true }
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ---- Container registry ----
resource "aws_ecr_repository" "app" {
  name         = var.name
  force_delete = true
}

# ---- File uploads (photos, logos, resumes, decks) ----
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.name}-uploads-${data.aws_caller_identity.me.account_id}"
}
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

# ---- Database (RDS Postgres, not public) ----
resource "random_password" "db" {
  length  = 28
  special = false
}
resource "aws_security_group" "app" {
  name   = "${var.name}-app"
  vpc_id = data.aws_vpc.default.id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
resource "aws_security_group" "db" {
  name   = "${var.name}-db"
  vpc_id = data.aws_vpc.default.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}
resource "aws_db_subnet_group" "db" {
  name       = "${var.name}-db"
  subnet_ids = data.aws_subnets.default.ids
}
resource "aws_db_instance" "db" {
  identifier              = "${var.name}-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  storage_encrypted       = true
  db_name                 = "foundertouch"
  username                = "foundertouch"
  password                = random_password.db.result
  db_subnet_group_name    = aws_db_subnet_group.db.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  publicly_accessible     = false
  backup_retention_period = 7
  skip_final_snapshot     = true
}

# ---- App Runner ----
resource "aws_iam_role" "access" {
  name = "${var.name}-apprunner-access"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "build.apprunner.amazonaws.com" } }] })
}
resource "aws_iam_role_policy_attachment" "access" {
  role       = aws_iam_role.access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}
resource "aws_iam_role" "instance" {
  name = "${var.name}-apprunner-instance"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "tasks.apprunner.amazonaws.com" } }] })
}
resource "aws_iam_role_policy" "instance_s3" {
  role = aws_iam_role.instance.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], Resource = "${aws_s3_bucket.uploads.arn}/*" }] })
}
resource "aws_apprunner_vpc_connector" "app" {
  vpc_connector_name = var.name
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.app.id]
}
resource "aws_apprunner_service" "app" {
  service_name = var.name
  source_configuration {
    authentication_configuration { access_role_arn = aws_iam_role.access.arn }
    auto_deployments_enabled = false
    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"
      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          DATABASE_URL = "postgresql://foundertouch:${random_password.db.result}@${aws_db_instance.db.address}:5432/foundertouch"
          S3_BUCKET    = aws_s3_bucket.uploads.bucket
          AWS_REGION   = var.region
        }
      }
    }
  }
  instance_configuration {
    cpu               = "1024"
    memory            = "2048"
    instance_role_arn = aws_iam_role.instance.arn
  }
  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.app.arn
    }
  }
  health_check_configuration {
    protocol = "HTTP"
    path     = "/login"
  }
}

output "url" { value = "https://${aws_apprunner_service.app.service_url}" }
output "ecr_repository" { value = aws_ecr_repository.app.repository_url }
output "uploads_bucket" { value = aws_s3_bucket.uploads.bucket }
