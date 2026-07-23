import {
  integer,
  sqliteTable,
  text,
  primaryKey
} from "drizzle-orm/sqlite-core";

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull()
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull()
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  location: text("location"),
  startsAt: integer("starts_at", { mode: "number" }).notNull(),
  endsAt: integer("ends_at", { mode: "number" }).notNull(),
  description: text("description"),
  signupDeadlineAt: integer("signup_deadline_at", { mode: "number" }).notNull(),
  allowPartner: integer("allow_partner", { mode: "boolean" }).notNull().default(false),
  allowChildren: integer("allow_children", { mode: "boolean" }).notNull().default(false),
  allowGuestList: integer("allow_guest_list", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "number" }).notNull()
});

export const eventOwners = sqliteTable(
  "event_owners",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    contactPhone: text("contact_phone"),
    shareEmail: integer("share_email", { mode: "boolean" }).notNull().default(false),
    sharePhone: integer("share_phone", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.eventId, table.userId] })
  })
);

export const programItems = sqliteTable("program_items", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startsAt: integer("starts_at", { mode: "number" }).notNull(),
  endsAt: integer("ends_at", { mode: "number" }).notNull(),
  description: text("description"),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull()
});

export const meals = sqliteTable("meals", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  date: text("date").notNull(),
  startsAt: integer("starts_at", { mode: "number" }).notNull(),
  endsAt: integer("ends_at", { mode: "number" }).notNull(),
  cutoffAt: integer("cutoff_at", { mode: "number" }).notNull(),
  description: text("description")
});

export const guestGroups = sqliteTable("guest_groups", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  inviteToken: text("invite_token").notNull().unique(),
  eventStatus: text("event_status").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  shareEmail: integer("share_email", { mode: "boolean" }).notNull().default(false),
  sharePhone: integer("share_phone", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "number" })
});

export const people = sqliteTable("people", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => guestGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  dietType: text("diet_type"),
  dietNotes: text("diet_notes")
});

export const guestAvailability = sqliteTable("guest_availability", {
  groupId: text("group_id")
    .notNull()
    .references(() => guestGroups.id, { onDelete: "cascade" }),
  comesAt: integer("comes_at", { mode: "number" }),
  leavesAt: integer("leaves_at", { mode: "number" })
});

export const guestResponses = sqliteTable(
  "guest_responses",
  {
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
    changedAfterDeadline: integer("changed_after_deadline", {
      mode: "boolean"
    }).notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.personId, table.mealId] })
  })
);

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  authorGroupId: text("author_group_id")
    .references(() => guestGroups.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull()
});

export const changeLog = sqliteTable("change_log", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  mealId: text("meal_id").references(() => meals.id, { onDelete: "cascade" }),
  guestGroupId: text("guest_group_id").references(() => guestGroups.id, {
    onDelete: "set null"
  }),
  before: text("before").notNull(),
  after: text("after").notNull(),
  changedAt: integer("changed_at", { mode: "number" }).notNull(),
  changedBy: text("changed_by").notNull(),
  isAfterCutoff: integer("is_after_cutoff", { mode: "boolean" }).notNull()
});
