import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userProfiles = sqliteTable("user_profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  notificationEmail: text("notification_email"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose"),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  createdByEmail: text("created_by_email").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tripMembers = sqliteTable("trip_members", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  userEmail: text("user_email").notNull(),
  role: text("role", { enum: ["creator", "member", "viewer", "finance"] }).notNull().default("member"),
  joinedAt: text("joined_at").notNull(),
});

export const tripMemberTodos = sqliteTable("trip_member_todos", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  userEmail: text("user_email").notNull(),
  itemKey: text("item_key", { enum: ["flight", "stay", "travel_request", "internet"] }).notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const tripDestinations = sqliteTable("trip_destinations", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  countryCode: text("country_code").notNull(),
  countryName: text("country_name").notNull(),
  cityCode: text("city_code"),
  cityName: text("city_name").notNull(),
  timezone: text("timezone"),
  sequence: integer("sequence").notNull().default(0),
});

export const agendaItems = sqliteTable("agenda_items", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at"),
  timezone: text("timezone"),
  place: text("place"),
  address: text("address"),
  referenceUrl: text("reference_url"),
  notes: text("notes"),
  createdByEmail: text("created_by_email").notNull(),
  updatedByEmail: text("updated_by_email").notNull(),
  version: integer("version").notNull().default(1),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tripDrafts = sqliteTable("trip_drafts", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  flow: text("flow", { enum: ["create", "itinerary", "expense"] }).notNull(),
  step: integer("step").notNull().default(1),
  payloadJson: text("payload_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  tripId: text("trip_id"),
  actorEmail: text("actor_email").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  createdAt: text("created_at").notNull(),
});

export const travelRequests = sqliteTable("travel_requests", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  confirmedByEmail: text("confirmed_by_email").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  status: text("status", { enum: ["confirmed", "superseded"] }).notNull().default("confirmed"),
  confirmedAt: text("confirmed_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const travelBookings = sqliteTable("travel_bookings", {
  id: text("id").primaryKey(), tripId: text("trip_id").notNull(), ownerEmail: text("owner_email").notNull(),
  kind: text("kind", { enum: ["flight", "stay"] }).notNull(), title: text("title").notNull(),
  startAt: text("start_at").notNull(), endAt: text("end_at").notNull(), timezone: text("timezone"),
  origin: text("origin"), destination: text("destination"), amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(), bookedAt: text("booked_at").notNull(), documentId: text("document_id"),
  version: integer("version").notNull().default(1), deletedAt: text("deleted_at"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});

export const travelDocuments = sqliteTable("travel_documents", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  tripId: text("trip_id").notNull(),
  kind: text("kind", { enum: ["flight", "stay"] }).notNull(),
  title: text("title").notNull(),
  travelerName: text("traveler_name").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  amountMinor: integer("amount_minor"),
  currency: text("currency"),
  cardLast4: text("card_last4"),
  shareSummary: integer("share_summary", { mode: "boolean" }).notNull().default(true),
  createExpense: integer("create_expense", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const personalExpenses = sqliteTable("personal_expenses", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  tripId: text("trip_id").notNull(),
  sourceDocumentId: text("source_document_id"),
  sourceBookingId: text("source_booking_id"),
  category: text("category").notNull(),
  merchant: text("merchant").notNull(),
  expenseDate: text("expense_date").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  originalAmountMinor: integer("original_amount_minor"),
  originalCurrency: text("original_currency"),
  reportingAmountMinor: integer("reporting_amount_minor"),
  reportingCurrency: text("reporting_currency"),
  exchangeRateSource: text("exchange_rate_source"),
  currencyDecisionReason: text("currency_decision_reason"),
  cardLast4: text("card_last4"),
  receiptCount: integer("receipt_count").notNull().default(1),
  remark: text("remark"),
  costCenter: text("cost_center").notNull().default("S2_GP1 100%"),
  exchangeRate: text("exchange_rate"),
  claimedTwdMinor: integer("claimed_twd_minor"),
  status: text("status", { enum: ["review", "ready", "missing"] }).notNull().default("review"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const uploadedDocuments = sqliteTable("uploaded_documents", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  tripId: text("trip_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentHash: text("content_hash"),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  documentType: text("document_type").notNull().default("unknown"),
  claimType: text("claim_type"),
  expenseDate: text("expense_date"),
  merchant: text("merchant"),
  currency: text("currency"),
  amountMinor: integer("amount_minor"),
  detectedCurrency: text("detected_currency"),
  detectedAmountMinor: integer("detected_amount_minor"),
  paymentMethod: text("payment_method", { enum: ["cash", "credit_card", "other"] }),
  cardLast4: text("card_last4"),
  suggestedName: text("suggested_name"),
  status: text("status", { enum: ["uploaded", "processing", "review", "ready", "failed"] }).notNull().default("uploaded"),
  extractionConfidence: integer("extraction_confidence"),
  extractionWarnings: text("extraction_warnings"),
  sourceExcerpt: text("source_excerpt"),
  extractionRawText: text("extraction_raw_text"),
  extractionCandidates: text("extraction_candidates"),
  extractionMappingReason: text("extraction_mapping_reason"),
  confirmedValues: text("confirmed_values"),
  confirmedByEmail: text("confirmed_by_email"),
  confirmedAt: text("confirmed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const personalCards = sqliteTable("personal_cards", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  issuer: text("issuer").notNull(),
  label: text("label").notNull(),
  last4: text("last4").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
