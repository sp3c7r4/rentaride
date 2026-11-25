# Deploying RentARide to EC2

One EC2 instance runs two containers from the same image: the Next.js app
(`next start`) and the background worker (emails, daily repayment status,
monthly payouts). nginx on the host terminates TLS. Postgres, Redis, file
storage and email are managed AWS services.

## 1. AWS resources

| Resource | Notes |
|---|---|
| EC2 | Ubuntu 24.04, t3.small or larger. Security group: 80 and 443 from anywhere, 22 from your IP. |
| RDS Postgres 18 | Private subnet, reachable from the instance's security group only. |
| Redis | ElastiCache (use `rediss://`), or the `redis` container in the compose file. |
| S3 bucket | `rentaride-uploads`, Block Public Access on (files are served through the app). |
| IAM role on the instance | `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on the bucket. Then leave the S3 keys empty. |
| SES | Verify the sending domain, request production access, create SMTP credentials. |

RDS TLS: the RDS certificate authority isn't in Node's default store. Download
the [global bundle](https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem)
into `deploy/`, mount it, and set `NODE_EXTRA_CA_CERTS=/app/deploy/global-bundle.pem`.

## 2. Instance setup

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER   # log out and back in
git clone https://github.com/sp3c7r4/rentaride.git && cd rentaride/frontend
cp deploy/.env.production.example deploy/.env.production   # fill it in
```

## 3. Build, migrate, start

```bash
# Same key for every build, so Server Actions survive deploys and restarts.
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(cat ~/.rentaride-actions-key 2>/dev/null || \
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" | tee ~/.rentaride-actions-key)

docker compose -f deploy/docker-compose.prod.yml build
docker compose -f deploy/docker-compose.prod.yml run --rm migrate
docker compose -f deploy/docker-compose.prod.yml up -d app worker
```

Optional demo data (not for real production): `docker compose -f deploy/docker-compose.prod.yml run --rm migrate npm run db:seed`.

## 4. nginx and TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rentaride
sudo ln -s /etc/nginx/sites-available/rentaride /etc/nginx/sites-enabled/
sudo certbot --nginx -d rentaride.ng -d www.rentaride.ng
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Paystack

1. Settings > API Keys & Webhooks: put the live secret and public keys in `.env.production`.
2. Webhook URL: `https://rentaride.ng/api/webhooks/paystack`.
3. Transfers (owner payouts): enable Transfers on the account and disable the
   transfer OTP (Settings > Preferences), or payouts will wait for an OTP.
4. Fund the Paystack balance before the 5th; payouts transfer from it.

## Updating

```bash
git pull
docker compose -f deploy/docker-compose.prod.yml build
docker compose -f deploy/docker-compose.prod.yml run --rm migrate
docker compose -f deploy/docker-compose.prod.yml up -d app worker
```

## Operations

- Logs: `docker compose -f deploy/docker-compose.prod.yml logs -f app worker` (JSON lines).
- Run a scheduled job now: `docker compose -f deploy/docker-compose.prod.yml exec worker npm run job -- payouts`.
- Failed payouts stay `failed` with the reason; fix the cause and reschedule them.
- Back up RDS with automated snapshots (7+ days).
