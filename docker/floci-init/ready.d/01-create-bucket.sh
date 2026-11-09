#!/bin/sh
set -eu

BUCKET=psw2-capas-dev

aws s3 mb "s3://${BUCKET}" 2>/dev/null || true

cat > /tmp/bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LeituraPublicaDasCapas",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::psw2-capas-dev/games/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket "${BUCKET}" --policy file:///tmp/bucket-policy.json || true