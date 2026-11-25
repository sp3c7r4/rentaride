CREATE TYPE "public"."code_purpose" AS ENUM('email_verify', 'password_reset');--> statement-breakpoint
CREATE TYPE "public"."dispute_category" AS ENUM('damage', 'payment', 'vehicle_condition', 'conduct', 'other');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'in_review', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."fuel" AS ENUM('petrol', 'diesel', 'hybrid', 'electric');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'verified', 'action_needed');--> statement-breakpoint
CREATE TYPE "public"."lease_status" AS ENUM('active', 'completed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('request_received', 'request_approved', 'request_declined', 'payment_due', 'payment_received', 'payout_sent', 'dispute_update', 'kyc_update');--> statement-breakpoint
CREATE TYPE "public"."payment_channel" AS ENUM('card', 'transfer', 'ussd');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('scheduled', 'processing', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."repayment_status" AS ENUM('upcoming', 'due', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('driver', 'owner');--> statement-breakpoint
CREATE TYPE "public"."schedule" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."transmission" AS ENUM('automatic', 'manual');--> statement-breakpoint
CREATE TYPE "public"."upload_kind" AS ENUM('vehicle_photo', 'registration', 'licence', 'evidence');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('pending_review', 'live', 'leased', 'unlisted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('sedan', 'suv', 'van', 'electric', 'pickup', 'luxury');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispute_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"dispute_id" text NOT NULL,
	"author_id" text,
	"body" text DEFAULT '' NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"lease_id" text NOT NULL,
	"opened_by" text NOT NULL,
	"category" "dispute_category" NOT NULL,
	"subject" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_licences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"expiry" date NOT NULL,
	"file_key" text,
	"file_name" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"schedule" "schedule" NOT NULL,
	"term_months" integer NOT NULL,
	"start_date" date NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"decline_reason" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leases" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"schedule" "schedule" NOT NULL,
	"term_months" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"deposit" integer NOT NULL,
	"deposit_paid_at" timestamp with time zone,
	"status" "lease_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"lease_id" text NOT NULL,
	"repayment_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"amount" integer NOT NULL,
	"deposit_amount" integer DEFAULT 0 NOT NULL,
	"channel" "payment_channel",
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paystack_id" text,
	"gateway_response" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bank_code" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"recipient_code" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"period" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"status" "payout_status" DEFAULT 'scheduled' NOT NULL,
	"pay_date" date NOT NULL,
	"reference" text,
	"transfer_code" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paystack_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"reference" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repayments" (
	"id" text PRIMARY KEY NOT NULL,
	"lease_id" text NOT NULL,
	"index" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" integer NOT NULL,
	"status" "repayment_status" NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_id" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"owner_id" text NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"original_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "role",
	"phone" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"kyc_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"kyc_note" text,
	"onboarded" boolean DEFAULT false NOT NULL,
	"staff" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"src" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"colour" text NOT NULL,
	"plate" text NOT NULL,
	"type" "vehicle_type" NOT NULL,
	"transmission" "transmission" NOT NULL,
	"seats" integer NOT NULL,
	"fuel" "fuel" NOT NULL,
	"city" text NOT NULL,
	"mileage_km" integer NOT NULL,
	"price_daily" integer NOT NULL,
	"price_weekly" integer NOT NULL,
	"price_monthly" integer NOT NULL,
	"status" "vehicle_status" DEFAULT 'pending_review' NOT NULL,
	"review_note" text,
	"registration_key" text,
	"registration_name" text,
	"rating" numeric(2, 1) DEFAULT 0 NOT NULL,
	"trips" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"purpose" "code_purpose" NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_messages" ADD CONSTRAINT "dispute_messages_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_messages" ADD CONSTRAINT "dispute_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_licences" ADD CONSTRAINT "driver_licences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_requests" ADD CONSTRAINT "lease_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_requests" ADD CONSTRAINT "lease_requests_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_requests" ADD CONSTRAINT "lease_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_request_id_lease_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."lease_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_photos" ADD CONSTRAINT "vehicle_photos_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispute_messages_dispute_idx" ON "dispute_messages" USING btree ("dispute_id","created_at");--> statement-breakpoint
CREATE INDEX "disputes_lease_idx" ON "disputes" USING btree ("lease_id");--> statement-breakpoint
CREATE INDEX "requests_owner_idx" ON "lease_requests" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "requests_driver_idx" ON "lease_requests" USING btree ("driver_id","status");--> statement-breakpoint
CREATE INDEX "requests_vehicle_idx" ON "lease_requests" USING btree ("vehicle_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "leases_request_key" ON "leases" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "leases_driver_idx" ON "leases" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "leases_owner_idx" ON "leases" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_key" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payments_lease_idx" ON "payments" USING btree ("lease_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_owner_period_key" ON "payouts" USING btree ("owner_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "paystack_events_key" ON "paystack_events" USING btree ("event","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "repayments_lease_index_key" ON "repayments" USING btree ("lease_id","index");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uploads_key_key" ON "uploads" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "vehicle_photos_vehicle_idx" ON "vehicle_photos" USING btree ("vehicle_id","position");--> statement-breakpoint
CREATE INDEX "vehicles_owner_idx" ON "vehicles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_active_key" ON "vehicles" USING btree (upper(regexp_replace("plate", '\W', '', 'g'))) WHERE "vehicles"."status" <> 'rejected';--> statement-breakpoint
CREATE INDEX "codes_user_purpose_idx" ON "verification_codes" USING btree ("user_id","purpose");