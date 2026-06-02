# API Routes Contract: Life App

> Last updated: 2026-06-02. Reflects current API surface including Feature 1, Feature 2 (Activities), Feature 3 (Budget), v2 Overhaul, Goals V2 (goal hierarchy, tallies, pace tracking), Scheduler Rules (blackout dates, session patterns, activity type propagation), **training vs supplemental split (climbing phases + scheduler + apply)**, **Activities Refactoring V1** (`isLogEntry` → `createdFromLog`, schedule-to-log bridge on activity check-off, `bridgedLogAction` on un-check / delete, `linkedLogId` on activity GET, `defaultDurationMinutes` on activity types, explicit `goalId` from WorkoutLog), schedule regeneration/reset, UI Design Overhaul (cascade delete, activity summary extension), **Role Scheduling Rules Removal** (dropped scheduling fields from roles, `sessionsPerWeek` server-side clamp `[1, 7]`), **Habit Tracking** (`/api/habits`, `/api/habit-logs`), **Library** (full — read-only, bookmarks, and admin CRUD), **Budget Expansion** (extended `GET /api/budget/summary`, extended `GET/PATCH /api/budget-settings`, extended `PATCH /api/spending-categories/:id`, new `/api/moment-logs` and `/api/moment-logs/:id`), and **Body Metrics Guidance** (`GET /api/body-profile`, `PATCH /api/body-profile`). Onboarding Wizard removed.

All API routes use Next.js Route Handlers. Base URL: `http://localhost:3000/api`

All responses are JSON. All dates are ISO 8601 format.

---

## Activity Types

Activity types define trackable activities (e.g., Running, Tennis, Reading, Meditation).

### GET /api/activity-types

Returns all activity types.

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Running",
    "type": "cardio",
    "icon": "🏃",
    "isTracked": true,
    "defaultCalories": null,
    "defaultSteps": null,
    "defaultDurationMinutes": 60,
    "metricsConfig": [
      { "key": "distance_km", "label": "Distance (km)", "type": "number" },
      { "key": "pace", "label": "Pace (min/km)", "type": "text" }
    ],
    "variants": null,
    "createdAt": "2026-03-04T12:00:00.000Z",
    "updatedAt": "2026-03-04T12:00:00.000Z"
  }
]
```

`defaultDurationMinutes` (Activities Refactoring V1) is the value the schedule-to-log bridge uses for `durationMinutes` when auto-inserting an activity log on check-off of a scheduled activity of this type.

### POST /api/activity-types

Create a new activity type.

**Request body**:
```json
{
  "name": "Meditation",
  "type": "mindfulness",
  "icon": "🧘",
  "isTracked": true,
  "defaultCalories": null,
  "defaultSteps": null,
  "defaultDurationMinutes": 30,
  "metricsConfig": [],
  "variants": null
}
```

`defaultDurationMinutes` is optional on create; it must be a positive integer when provided and defaults to `60` if omitted. Activities Refactoring V1.

**Response** `201`: The created activity type object.

### PATCH /api/activity-types/:id

Update an activity type. Accepts any subset of fields. When `defaultDurationMinutes` is provided it must be a positive integer.

### DELETE /api/activity-types/:id

Delete an activity type.

---

## Activity Logs

Activity logs replace the former Workouts entity. They record completed activities and can optionally link to goals and calendar entries.

### GET /api/activity-logs

Returns activity logs with joined `activityTypeName`, `activityTypeIcon`. Accepts query params:
- `?activityTypeId=1` — filter by activity type
- `?date=YYYY-MM-DD` — filter by exact date (v2)
- `?from=YYYY-MM-DD` / `?to=YYYY-MM-DD` — date range
- `?limit=100` — max results (default 100)

**Response** `200`:
```json
[
  {
    "id": 1,
    "activityTypeId": 1,
    "goalId": 1,
    "activityId": 5,
    "date": "2026-03-04",
    "durationMinutes": 45,
    "calories": 380,
    "steps": null,
    "variant": null,
    "metrics": { "distance_km": 5.2, "pace": "5:30", "heart_rate": 155 },
    "notes": "Easy morning run",
    "createdAt": "2026-03-04T08:00:00.000Z",
    "activityTypeName": "Running",
    "activityTypeIcon": "🏃"
  }
]
```

### POST /api/activity-logs

Log a new activity. When `goalId` is provided, auto-creates or updates a calendar activity (marks existing uncompleted activity as completed, or creates new one with `createdFromLog=true`; field renamed from `isLogEntry` in Activities Refactoring V1). **v2**: After creating the log, auto-completes any matching scheduled activity (same `activityTypeId`, same date, not yet completed).

**Activities Refactoring V1**: The in-app WorkoutLog tab now exposes an "(optional) Goal" picker populated from `GET /api/goals?status=active`. The selected `goalId` is sent verbatim on this POST, replacing the previous behavior where logs were never linked to a goal. Logs created elsewhere (calendar check-off via the schedule-to-log bridge) continue to inherit `goalId` from the source activity.

**Request body**:
```json
{
  "activityTypeId": 1,
  "goalId": 1,
  "date": "2026-03-04",
  "durationMinutes": 45,
  "calories": 380,
  "steps": null,
  "variant": null,
  "metrics": { "distance_km": 5.2, "pace": "5:30", "heart_rate": 155 },
  "notes": "Easy morning run"
}
```

`activityTypeId` is required. `goalId` is optional.

**Response** `201`: The created activity log with joined fields.

### PATCH /api/activity-logs/:id

Update an activity log. Accepts any subset of fields.

### DELETE /api/activity-logs/:id

Delete an activity log.

---

## Body Metrics

### GET /api/body-metrics

Returns body metric entries. Accepts query params:
- `?type=weight` / `vo2max` / `resting_hr` — filter by metric type
- `?from=YYYY-MM-DD` / `?to=YYYY-MM-DD` — date range

### POST /api/body-metrics

Log a new measurement.

**Request body**:
```json
{
  "date": "2026-03-04",
  "metricType": "weight",
  "value": 75.5,
  "unit": "kg"
}
```

**Response** `201`: The created body metric entry.

---

## Body Profile

Stores optional user attributes (date of birth, biological sex, height, waist circumference) that power the client-side metric interpretation layer. One row per user; all data columns nullable.

> The interpretation logic (BMI, WHtR, VO2max percentile, RHR category) runs entirely client-side in `src/lib/body-metrics-guidance.ts`. There is no interpretation endpoint.

### GET /api/body-profile

Returns the authenticated user's body profile row.

If no row exists for the user yet, returns an all-null default object with `200` (not `404`). This allows the UI to render the "About you" card in an empty state without special-casing the first visit.

**Response** `200`:
```json
{
  "id": 1,
  "userId": "user_abc",
  "dateOfBirth": "1990-05-15",
  "biologicalSex": "male",
  "heightCm": 175,
  "waistCm": 85,
  "waistCmUpdatedAt": "2026-06-02T14:00:00.000Z",
  "createdAt": "2026-06-01T10:00:00.000Z",
  "updatedAt": "2026-06-02T14:00:00.000Z"
}
```

First-visit default (no row exists):
```json
{
  "id": null,
  "userId": "user_abc",
  "dateOfBirth": null,
  "biologicalSex": null,
  "heightCm": null,
  "waistCm": null,
  "waistCmUpdatedAt": null,
  "createdAt": "",
  "updatedAt": ""
}
```

**Response** `401`: No valid session.

---

### PATCH /api/body-profile

Upserts the authenticated user's body profile. Accepts any subset of the four data fields; omitted fields are left unchanged (upsert semantics — a second PATCH does not nullify fields set by the first).

When `waistCm` is present in the payload and non-null, `waistCmUpdatedAt` is set to the current server timestamp. When `waistCm` is explicitly set to `null`, `waistCmUpdatedAt` is also cleared to `null`.

The upsert is atomic (`INSERT … ON CONFLICT DO UPDATE`) — safe against concurrent first-ever PATCH requests.

**Request body** (all fields optional):
```json
{
  "dateOfBirth": "1990-05-15",
  "biologicalSex": "male",
  "heightCm": 175,
  "waistCm": 85
}
```

**Validation** (returns `400` with the exact error string on first failure):

| Field | Rule | Error string |
|-------|------|--------------|
| `dateOfBirth` | Must match `YYYY-MM-DD` and be parseable | `"Date of birth must be a valid date"` |
| `dateOfBirth` | Must not be in the future | `"Date of birth cannot be in the future"` |
| `biologicalSex` | Must be `'male'` or `'female'` | `"Biological sex must be 'male' or 'female'"` |
| `heightCm` | Positive real number | `"Height must be a positive number"` |
| `waistCm` | Positive real number | `"Waist must be a positive number"` |

**Response** `200`: Full updated profile row (same shape as GET).
**Response** `400`: Validation failure with `{ "error": "<message>" }`.
**Response** `401`: No valid session.

---

## Activities Summary

### GET /api/activities/summary

Aggregated activities dashboard data. Accepts `?weeks=8` (default 8). Renamed from `/api/fitness/summary` in v2.

**Response** `200`:
```json
{
  "volumeData": [
    {
      "week": "2026-02-24",
      "activities": [{ "minutes": 180, "activityTypeName": "Running", "activityTypeIcon": "🏃", "activityTypeId": 1 }],
      "totalMinutes": 240
    }
  ],
  "streaks": [
    { "activityTypeId": 1, "activityTypeName": "Running", "activityTypeIcon": "🏃", "currentStreak": 4 }
  ],
  "latestBodyMetrics": {
    "weight": { "value": 75.5, "unit": "kg", "date": "2026-03-04", "trend": -0.5 }
  },
  "activityByType": [
    { "name": "Running", "count": 8 },
    { "name": "Tennis", "count": 4 }
  ],
  "recentActivityLogs": [],
  "totalActivityLogs": 42,
  "totalMinutes": 2100,
  "totalCalories": 18500
}
```

`activityByType` provides a breakdown of activity log counts per activity type for the current month, used by the Activities Dashboard bar chart.

---

## Goals

Goals are standalone entities, not owned by weekly plans. They can belong to multiple roles via the `goalRoles` junction table. Goals now support target metrics for progress tracking.

### GET /api/goals

Returns goals with `activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod`, `activityTypeName`, `activityTypeIcon`. Accepts query params:
- `?status=active` (default) / `completed` / `archived` / `all`
- `?roleId=3` — filter to goals belonging to this role
- `?horizon=yearly|monthly|standalone` — **[Goals V2]** filter by horizon. `standalone` returns goals where `horizon IS NULL`
- `?parentId=5` — **[Goals V2]** return only monthly sub-goals for the given yearly goal id
- `?month=2026-03` — **[Goals V2]** return only monthly goals for the given month

**Response** `200`:
```json
[
  {
    "id": 1,
    "title": "Run a half marathon",
    "description": "Train for the spring race",
    "quadrant": "Q2",
    "targetDate": "2026-06-01",
    "sessionsPerWeek": 4,
    "activityTypeId": 1,
    "targetMetric": "durationMinutes",
    "targetValue": 180,
    "targetPeriod": "week",
    "activityTypeName": "Running",
    "activityTypeIcon": "🏃",
    "status": "active",
    "isCompleted": false,
    "horizon": "yearly",
    "parentGoalId": null,
    "month": null,
    "targetUnit": "km",
    "createdAt": "2026-03-04T12:00:00.000Z",
    "updatedAt": "2026-03-04T12:00:00.000Z",
    "roles": [
      { "id": 2, "name": "Athlete", "color": "#EF4444" }
    ]
  }
]
```

Note: `horizon`, `parentGoalId`, `month`, and `targetUnit` are null for existing standalone goals.

Note: `quadrant` is derived from `targetDate` at read time (≤7 days = Q1, else Q2). Not stored in the database.

### POST /api/goals

Create a new goal.

**Request body**:
```json
{
  "title": "Run a half marathon",
  "description": "Train for the spring race",
  "roleIds": [2, 6],
  "targetDate": "2026-06-01",
  "sessionsPerWeek": 4,
  "activityTypeId": 1,
  "targetMetric": "durationMinutes",
  "targetValue": 180,
  "targetPeriod": "week",
  "horizon": "yearly",
  "parentGoalId": null,
  "month": null,
  "targetUnit": "km"
}
```

`activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod` are optional (for metric-based goals).
`horizon`, `parentGoalId`, `month`, `targetUnit` are optional (Goals V2). Omit for backward-compatible standalone goals.

`sessionsPerWeek` is clamped server-side to `[1, 7]`: integers outside the range are pulled in, fractional values are rounded then clamped, and non-numeric input falls back to the default of 3. The client form enforces the same bounds; the server clamp is the belt-and-braces for direct API callers.

**Response** `201`: The created goal with derived quadrant and roles attached.

### PATCH /api/goals/:id

Update a goal. Accepts: `title`, `description`, `targetDate`, `sessionsPerWeek`, `status`, `isCompleted`, `roleIds`, `activityTypeId`, `targetMetric`, `targetValue`, `targetPeriod`, `horizon`, `parentGoalId`, `month`, `targetUnit`.

`sessionsPerWeek`, when provided, is clamped server-side to `[1, 7]` using the same rules as POST. Non-numeric or non-finite input is dropped (treated as "no change") rather than coerced.

### DELETE /api/goals/:id

Delete a goal, its `goalRoles` entries, and (for yearly goals) all linked monthly sub-goals and their role associations.

### GET /api/goals/:id/progress

Returns progress for a goal. Behavior depends on goal type:
- **Metric-based**: sums the relevant metric from activity logs within the current period.
- **Session-based**: counts logs for current week vs `sessionsPerWeek`.
- **Tally-based** (Goals V2): sums `goal_tallies.count` for the current period.
- **Yearly horizon** (Goals V2): aggregates progress from direct logs/tallies AND from all monthly sub-goals. Returns `paceStatus`.

**Response** `200`:
```json
{
  "current": 4,
  "target": 12,
  "percentage": 33,
  "period": "yearly",
  "metricLabel": "books",
  "paceStatus": "ahead",
  "elapsedPercentage": 25
}
```

`paceStatus` and `elapsedPercentage` are only present for goals with `horizon = 'yearly'`. `paceStatus` is one of: `'ahead'` | `'on_track'` | `'behind'` | `'no_data'`.

### GET /api/goals/:id/children `[Goals V2]`

Returns all monthly sub-goals for a yearly goal, each with inline progress data.

**Response** `200`:
```json
[
  {
    "id": 12,
    "title": "Read 1 book",
    "month": "2026-03",
    "targetValue": 1,
    "sessionsPerWeek": 2,
    "progress": { "current": 1, "target": 1, "percentage": 100 }
  }
]
```

---

## Goal Tallies `[Goals V2]`

Simple count-based progress entries for goals that do not require activity type tracking. The tally `count` is always in the same unit as the goal's `targetUnit` -- if the goal is "Run 500 km" (`targetUnit: "km"`), a tally of `count: 5` means 5 km. Tallies and activity-log metrics contribute to the same cumulative total.

### GET /api/goal-tallies

Returns tally entries. Accepts query params:
- `?goalId=5` — filter by goal (required or strongly recommended)
- `?from=YYYY-MM-DD` / `?to=YYYY-MM-DD` — date range

**Response** `200`:
```json
[
  {
    "id": 1,
    "goalId": 5,
    "date": "2026-03-10",
    "count": 1,
    "notes": "Finished Atomic Habits",
    "createdAt": "2026-03-10T20:00:00.000Z"
  }
]
```

### POST /api/goal-tallies

Log a tally entry.

**Request body**:
```json
{
  "goalId": 5,
  "date": "2026-03-10",
  "count": 1,
  "notes": "Finished Atomic Habits"
}
```

`goalId` and `date` are required. `count` defaults to 1. `notes` is optional.

**Response** `201`: The created tally entry.

### DELETE /api/goal-tallies/:id

Delete a tally entry.

**Response** `200`: `{ "success": true }`

---

## Roles

### GET /api/roles

Returns all active roles (add `?archived=true` to include archived).

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Professional",
    "description": "Career and work goals",
    "color": "#3B82F6",
    "displayOrder": 0,
    "isArchived": false,
    "isWorkRole": true,
    "createdAt": "2026-03-04T12:00:00.000Z",
    "updatedAt": "2026-03-04T12:00:00.000Z"
  }
]
```

### POST /api/roles

Create a new role.

**Request body**:
```json
{
  "name": "Athlete",
  "description": "Fitness and sports",
  "color": "#EF4444",
  "isWorkRole": false
}
```

**Response** `201`: The created role object.

### PATCH /api/roles/:id

Update a role. Accepts any subset of: `name`, `description`, `color`, `displayOrder`, `isArchived`, `isWorkRole`.

### PUT /api/roles/reorder

Reorder all roles.

**Request body**:
```json
{ "order": [3, 1, 4, 2, 5] }
```

---

## Habits

Habits represent daily behaviours the user is building, framed using *Atomic Habits* identity language. Phase 1 (foundation) is merged; the UI ships in Phase 2.

### GET /api/habits

Returns active habits for the authenticated user (`is_archived = 0`), ordered by `displayOrder` ascending. Each habit includes `recentLogDates`: deduplicated ISO `YYYY-MM-DD` strings from the last 30 days (sorted ascending). The server does **not** compute streaks — the client calls `computeStreaks(recentLogDates, today)` locally.

Add `?archived=true` to return archived habits instead (same shape).

**Response** `200`:
```json
[
  {
    "id": 1,
    "userId": "abc123",
    "identity": "I am a person who moves their body every day",
    "name": "Morning run",
    "cue": "After I wake up and brew coffee",
    "minimumVersion": "Put on running shoes and walk to the end of the street",
    "color": "#10B981",
    "displayOrder": 0,
    "isArchived": false,
    "createdAt": "2026-05-15 08:00:00",
    "updatedAt": "2026-05-15 08:00:00",
    "recentLogDates": ["2026-05-13", "2026-05-14", "2026-05-15"]
  }
]
```

### POST /api/habits

Create a new habit. `displayOrder` is server-computed (`max + 1` across all habits for the user).

**Request body**:
```json
{
  "identity": "I am a person who moves their body every day",
  "name": "Morning run",
  "cue": "After I wake up and brew coffee",
  "minimumVersion": "Put on running shoes and walk to the end of the street",
  "color": "#10B981"
}
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `identity` | Yes | 1-200 chars |
| `name` | Yes | 1-50 chars |
| `cue` | No | 0-200 chars, nullable |
| `minimumVersion` | No | 0-200 chars, nullable |
| `color` | Yes | Valid hex `#RRGGBB` |

**Response** `201`: The created habit object (without `recentLogDates` — use `GET /api/habits` for the full wire shape).

### PATCH /api/habits/:id

Partial update. Accepts any subset of `identity`, `name`, `cue`, `minimumVersion`, `color`, `isArchived`, `displayOrder`. Same per-field validation as POST. Returns `404` if the habit does not exist for the authenticated user (never `403` — do not reveal existence to other users).

**Response** `200`: The updated habit row.

### DELETE /api/habits/:id

Hard-deletes the habit. The foreign-key cascade in `apply-schema.js` removes all associated `habit_logs` rows automatically. Returns `404` for unknown or cross-user IDs.

**Response** `204`: No content.

### PUT /api/habits/reorder

Reorder active habits. Validates the entire array before writing — if any ID is unknown, archived, or not owned by the user, the request is rejected with `400` and zero rows are updated.

**Request body**:
```json
{ "order": [3, 1, 4, 2] }
```

**Response** `204`: No content.

---

## Habit Logs

One completion record per habit per calendar day. Both endpoints are idempotent so the client can call them optimistically without checking existing state first.

### POST /api/habit-logs

Log a habit as done for a given date. **Idempotent**: if the `(habitId, date)` pair already exists, the server returns `201` with the existing row rather than `409`. The unique index on `habit_logs (habit_id, date)` is the authoritative enforcement mechanism — concurrent requests are safe.

**Request body**:
```json
{
  "habitId": 1,
  "date": "2026-05-15"
}
```

`date` must be a valid ISO `YYYY-MM-DD` calendar date (validated by round-trip check, not just regex). The client is responsible for sending its local calendar date — the server never infers "today".

**Response** `201`: The created (or already-existing) `habit_logs` row.
**Response** `400`: Missing or invalid `habitId` / `date`.
**Response** `404`: `habitId` does not belong to the authenticated user.

### DELETE /api/habit-logs

Un-log a habit for a given date. **Idempotent**: always returns `204`, even if no row matched. The client does not need to confirm the row existed before calling this.

**Request body**:
```json
{
  "habitId": 1,
  "date": "2026-05-15"
}
```

**Response** `204`: No content (whether a row was deleted or not).
**Response** `400`: Missing or invalid `habitId` / `date`.
**Response** `404`: `habitId` does not belong to the authenticated user.

---

## Weekly Plans

### GET /api/weekly-plans?week=YYYY-MM-DD

Get or auto-create a weekly plan for the given Monday. If no plan exists, one is created.

**Response** `200`: The weekly plan object.

### PATCH /api/weekly-plans

Update planning notes or isPlanned status.

**Request body**:
```json
{
  "weekStartDate": "2026-03-02",
  "planningNotes": "Focus on...",
  "isPlanned": true
}
```

---

## Weekly Focus Goals

Manages which goals are "in focus" for a given week. Goals must already exist in the `goals` table.

### GET /api/weekly-plans/:weekStartDate/goals

Returns all focus goals for the week, with roles and derived quadrant attached.

**Response** `200`:
```json
[
  {
    "id": 1,
    "focusId": 5,
    "title": "Run a half marathon",
    "quadrant": "Q2",
    "targetDate": "2026-06-01",
    "status": "active",
    "isCompleted": false,
    "roles": [{ "id": 2, "name": "Athlete", "color": "#EF4444" }]
  }
]
```

### POST /api/weekly-plans/:weekStartDate/goals

Add an existing goal to this week's focus.

**Request body**:
```json
{ "goalId": 1 }
```

**Response** `201`: The created focus link.
**Response** `409`: Goal is already in focus for this week.

### DELETE /api/weekly-plans/:weekStartDate/goals?goalId=1

Remove a goal from this week's focus.

---

## Activities

Calendar entries. Can be created manually or auto-created when logging via `/api/activity-logs` with a `goalId`.

### GET /api/activities

Get activities. Requires one of:
- `?date=YYYY-MM-DD` — single day
- `?weekStart=YYYY-MM-DD` — full week (7 days from Monday)

Response includes joined `roleName`, `roleColor`, `createdFromLog` (true when created from an activity log; renamed from `isLogEntry` in Activities Refactoring V1), **`sessionType`** (`training` \| `supplemental`), and **`linkedLogId`** (`number \| null`). `linkedLogId` is derived via a user-scoped `LEFT JOIN` on `activity_logs.activity_id` and is non-null when the activity is bidirectionally linked to a logged workout. The schedule-to-log bridge's idempotency guarantee (at most one log per activity) keeps the join safe for the activity row's lifetime; the client uses `linkedLogId` to decide whether to prompt the user before un-checking or deleting (Activities Refactoring V1).

### POST /api/activities

Create an activity.

**Request body**:
```json
{
  "title": "Morning run",
  "quadrant": "Q2",
  "activityDate": "2026-03-03",
  "startTime": "07:00",
  "endTime": "08:00",
  "roleId": 2,
  "goalId": 1,
  "notes": "Easy pace",
  "createdFromLog": false,
  "sessionType": "training"
}
```

`createdFromLog` is optional (default false). Set to `true` when the activity was created from logging via `/api/activity-logs`. The log-to-activity bridge in `POST /api/activity-logs` sets this flag automatically.

The response shape matches `GET /api/activities`; for a freshly-created activity `linkedLogId` is always `null`.

`sessionType` is optional on create (default `training`). Must be `training` or `supplemental` when provided.

### PATCH /api/activities/:id

Update an activity (reschedule, complete, add notes, etc.). Omitted fields are unchanged (e.g. drag-reschedule sends only `activityDate`).

**Schedule-to-log bridges** (Activities Refactoring V1) — fire when the PATCH transitions `isCompleted`:

- **Check-off transition** (`isCompleted` flips `false → true`): if the activity has an `activityTypeId`, the handler idempotently inserts a row into `activity_logs` with `activityId` set to this activity, `activityTypeId` and `goalId` copied from the activity, `durationMinutes` from `activity_types.default_duration_minutes` (default `60` when missing), and `date` set to `activityDate`. The insert is skipped if a matching log already exists, if `activityTypeId` is null, or if the referenced activity type is not visible to the user (defensive FK check). The transition is detected using the same boolean coercion that the update uses, so client payloads with non-boolean truthy values (`1`, `"true"`) behave consistently.
- **Un-check transition** (`isCompleted` flips `true → false`): the body must include **`bridgedLogAction`** when a linked log exists. Allowed values: `"delete"` (removes the linked log) or `"unlink"` (clears `activity_logs.activity_id` and `activity_logs.goal_id` on the linked log so the workout history is preserved but no longer counts toward the goal). Missing or unrecognized `bridgedLogAction` is treated as no-op for forward compatibility. The client (`LinkedLogActionDialog`) determines whether to surface the prompt based on the `linkedLogId` it already has from GET — optimistic flow, no extra round-trip.

Optional **`sessionType`**: `training` \| `supplemental` — used when editing session type from the activity form.

### DELETE /api/activities/:id

Delete an activity.

**Bridged delete** (Activities Refactoring V1): when the activity has a linked activity log, the handler requires a query parameter **`?bridgedLogAction=delete|unlink`** describing what to do with the linked log first.

- `?bridgedLogAction=delete` — deletes the linked log, then deletes the activity.
- `?bridgedLogAction=unlink` — clears the log's `activity_id` and `goal_id` (preserving the workout history) before deleting the activity.
- If the activity has a linked log and the parameter is missing or unrecognized, the handler responds **`409 Conflict`** with `{ "linkedLogId": <number> }`; the client uses this to open the `LinkedLogActionDialog` and retry with the chosen action. Activities with no linked log delete cleanly with no parameter required.

---

## Recurring Activities

### GET /api/recurring-activities

Get all recurring activities, with joined `roleName` and `roleColor`.

### POST /api/recurring-activities

Create a recurring activity template.

**Request body**:
```json
{
  "roleId": 3,
  "title": "Tennis",
  "quadrant": "Q2",
  "dayOfWeek": 2,
  "startTime": "18:00",
  "endTime": "20:00"
}
```

### PATCH /api/recurring-activities/:id

Update or pause a recurring activity.

### DELETE /api/recurring-activities/:id

Delete a recurring activity.

---

## Schedule Generation

### POST /api/schedule/generate

Generate a proposed schedule based on focus goals, existing activities, recurring events, roles, and scheduler settings.

**Request body**:
```json
{
  "weekStartDate": "2026-03-02",
  "scope": "month",
  "regenerate": true,
  "month": "2026-03"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `weekStartDate` | Yes | Monday of the week (used for weekly plan / focus goals lookup) |
| `scope` | No | `"week"` (default) or `"month"` |
| `regenerate` | No | When `true`, ignores existing scheduler-generated activities for focus goals so the schedule is built from scratch. Default `false`. |
| `month` | No | `"YYYY-MM"` format. Used when `scope = "month"` to ensure the correct calendar month is targeted, regardless of which day-of-week the 1st falls on. |

**Response** `200`:
```json
{
  "activities": [
    {
      "title": "Run a half marathon",
      "quadrant": "Q2",
      "activityDate": "2026-03-03",
      "startTime": "06:00",
      "endTime": "07:00",
      "roleId": 2,
      "goalId": 1,
      "activityTypeId": 1,
      "roleName": "Athlete",
      "roleColor": "#EF4444",
      "reason": "Session 1/4 — personal time",
      "notes": "…",
      "sessionType": "training"
    }
  ],
  "warnings": ["Could only fit 2/4 sessions for \"Learn Python\""],
  "summary": "Generated 12 activities across 3 goals for the month. Q2 focus: 75%. Spread across 20 days.",
  "regenerate": true,
  "focusGoalIds": [1, 5],
  "dateRange": { "start": "2026-03-01", "end": "2026-03-31" }
}
```

When `regenerate` is `true`, the response includes `focusGoalIds` and `dateRange` metadata. These are passed to the apply endpoint to identify which old activities should be replaced.

**Scheduler algorithm phases**:
1. Classify each day as work/weekend with time windows
2. Calculate sessions needed per goal (`sessionsPerWeek × numWeeks - existing`) -- **[Goals V2]** if a monthly sub-goal exists for the current month, use its `sessionsPerWeek` instead. When `regenerate = true`, existing scheduler-generated activities for focus goals are excluded from the count.
3. Sort goals by urgency (Q1 first, then Q2, then nearest target date)
4. Round-robin placement respecting: work/personal windows, rest-day constraints, max weekly occurrences, no same-day repeats, spread across days
5. Generate summary and warnings

**[Goals V2]** When a focus goal has a monthly sub-goal for the current month, the `reason` field in the generated activity will note: `"Using March benchmark: 5 sessions/week"`.

**[Training vs supplemental V1]** When a focus goal has an **active** training plan, the handler loads split counts, preferred weekday arrays, and phase **layer** columns. `generateSchedule` receives a per-goal split map; each proposed activity includes **`sessionType`**: `"training"` or `"supplemental"`. Training sessions are placed first each ISO week up to `trainingSessionsPerWeek`, then supplemental up to `supplementalSessionsPerWeek`. Notes use `sportFocusContent` + `mentalGameContent` for training, `supplementalContent` for supplemental, with fallback to full `description`. Goals without a plan keep `sessionType: "training"`.

### POST /api/schedule/apply

Apply a generated schedule by creating all proposed activities. Each activity inherits `activityTypeId` from its linked goal (enabling correct activity type display and matching with activity logs) and **`sessionType`** from the proposal (`training` or `supplemental`, defaulting to `training` if omitted). When `regenerate` is `true`, deletes old scheduler-generated activities (non-logged, non-completed) for the specified focus goals within the date range before inserting new ones.

**Request body**:
```json
{
  "activities": [ /* ProposedActivity[] from generate response */ ],
  "regenerate": true,
  "focusGoalIds": [1, 5],
  "dateRange": { "start": "2026-03-01", "end": "2026-03-31" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `activities` | Yes | Array of proposed activities to create |
| `regenerate` | No | When `true`, deletes old scheduled activities before inserting. Default `false`. |
| `focusGoalIds` | No | Goal IDs whose old activities should be replaced (only used when `regenerate = true`) |
| `dateRange` | No | Date range for deletion (`{ start, end }`, only used when `regenerate = true`) |

**Response** `201`:
```json
{
  "created": 12,
  "deleted": 8,
  "activities": [ /* created Activity objects */ ]
}
```

### POST /api/schedule/reset

Remove all scheduled (non-logged, non-completed) activities within a date range. Used to clear the month before regenerating a fresh schedule. Preserves manually logged activities and completed activities.

**Request body**:
```json
{
  "start": "2026-03-01",
  "end": "2026-03-31"
}
```

**Response** `200`:
```json
{
  "deleted": 24
}
```

---

## Scheduler Settings

### GET /api/scheduler-settings

Returns the app-wide scheduler configuration. Auto-creates defaults on first call.

**Response** `200`:
```json
{
  "id": 1,
  "workStartTime": "09:00",
  "workEndTime": "17:00",
  "workDays": [1, 2, 3, 4, 5],
  "enforceWeeklySpread": true,
  "maxActivitiesPerDay": 4
}
```

### PATCH /api/scheduler-settings

Update scheduler settings.

**Request body** (all fields optional):
```json
{
  "workStartTime": "08:30",
  "workEndTime": "17:30",
  "workDays": [1, 2, 3, 4, 5],
  "enforceWeeklySpread": false,
  "maxActivitiesPerDay": 3
}
```

---

## Scheduler Blackout Dates

### GET /api/scheduler-blackout-dates

Returns all blackout dates, sorted by date.

**Response** `200`: array of `{ id, date, label, isRecurring, createdAt }`.

### POST /api/scheduler-blackout-dates

Create a new blackout date.

**Request body**:
```json
{
  "date": "2026-12-25",
  "label": "Christmas",
  "isRecurring": true
}
```

### DELETE /api/scheduler-blackout-dates/:id

Delete a blackout date.

---

## Goal Session Patterns

### GET /api/goals/:id/session-patterns

Returns session patterns for a goal, sorted by position.

**Response** `200`: array of `{ id, goalId, position, label, restDaysAfter, createdAt }`.

### POST /api/goals/:id/session-patterns

Replace all session patterns for a goal (delete existing, create new).

**Request body**:
```json
{
  "patterns": [
    { "label": "Short run 4km", "restDaysAfter": 1 },
    { "label": "Short run 4km", "restDaysAfter": 1 },
    { "label": "Long run 12km", "restDaysAfter": 2 }
  ]
}
```

### DELETE /api/goal-session-patterns/:id

Delete a single session pattern entry.

---

## Training plans (periodization + split)

Multi-sport training plans share `GET/POST/DELETE` on `/api/training-plans` plus assess-level, phase transition, restart, refresh-descriptions, and **split editing** for an existing plan.

### GET /api/training-plans?goalId={id}

Returns the plan for that goal or `null`. Response includes `sportProfile` as a parsed object and **`trainingPreferredDays` / `supplementalPreferredDays` as number arrays** (parsed from stored JSON strings). Includes `phases` ordered by `orderIndex`.

### POST /api/training-plans

Creates a plan for `goalId` (409 if one already exists). Body includes `sport`, `yearsExperience`, `startDate`, `sportProfile`, and optionally:

| Field | Required | Description |
|-------|----------|-------------|
| `trainingSessionsPerWeek` | No* | If either split field is sent, **both** must be sent and must sum to the goal’s `sessionsPerWeek`. |
| `supplementalSessionsPerWeek` | No* | See above. If omitted, server uses `defaultSplit(goal.sessionsPerWeek)`. |
| `trainingPreferredDays` | No | `number[]`, weekday 1–7. |
| `supplementalPreferredDays` | No | `number[]`. |

For **climbing**, inserted phases include `sportFocusContent`, `supplementalContent`, `mentalGameContent` when generated; tennis/running phases leave those columns null and use `description` only.

### PATCH /api/training-plans/:id

Updates split and/or preferred days only (does not regenerate phases). Body: optional `trainingSessionsPerWeek`, `supplementalSessionsPerWeek` (must be sent together and sum to goal `sessionsPerWeek`), `trainingPreferredDays`, `supplementalPreferredDays`. Returns the updated plan with parsed day arrays.

### DELETE /api/training-plans/:id

Deletes the plan (and phases via FK cascade).

### POST /api/training-plans/assess-level

**Climbing**: body includes `sport: "climbing"`, grades, `yearsExperience`. Returns derived level and recommended model (used by the climbing plan dialog).

### POST /api/training-phases/:id/transition

Advances the active phase (user-confirmed in UI).

### POST /api/training-plans/:id/restart

Regenerates phases from today; **does not** clear `training_sessions_per_week`, `supplemental_sessions_per_week`, or preferred-day columns on the plan.

### POST /api/training-plans/refresh-descriptions

Recomputes phase text for all of the user’s plans. For **climbing**, also writes the three layer columns from `buildClimbingPhaseContent`.

---

## Planned Expenses (v2)

### GET /api/planned-expenses?year=YYYY

Returns all planned expenses for a given year.

**Response** `200`:
```json
[
  {
    "id": 1,
    "name": "Christmas gifts",
    "amount": 500,
    "month": "2026-12",
    "categoryId": 3,
    "categoryName": "Amusement",
    "categoryIcon": "🎉",
    "notes": "Family and friends",
    "createdAt": "2026-03-06T12:00:00.000Z",
    "updatedAt": "2026-03-06T12:00:00.000Z"
  }
]
```

### POST /api/planned-expenses

Create a planned expense.

**Request body**:
```json
{
  "name": "Christmas gifts",
  "amount": 500,
  "month": "2026-12",
  "categoryId": 3,
  "notes": "Family and friends"
}
```

**Response** `201`: The created planned expense.

### PATCH /api/planned-expenses/:id

Update a planned expense. Accepts any subset of fields.

### DELETE /api/planned-expenses/:id

Delete a planned expense.

---

## Moment Logs *(Budget Expansion)*

Records of big-purchase decisions with optional Housel filter answers. Per-user; all routes require auth (401 if no session). `categoryId` ownership is validated on POST (403 if the category belongs to another user).

### POST /api/moment-logs

Create a moment log. Optionally inserts a linked `spending_entries` row in the same transaction.

**Auth**: required.

**Body**:
```json
{
  "amount": 850,
  "description": "New laptop",
  "date": "2026-05-23",
  "categoryId": 3,
  "scorecardAnswer": "Mostly for me, a little bit for the look",
  "utilityStatusAnswer": "High utility — I need it daily. Moderate status.",
  "sixMonthAnswer": "I'll still be using it every day.",
  "decision": "proceeded",
  "alsoLogAsSpending": true
}
```

- `amount`: required, > 0.
- `date`: required, `YYYY-MM-DD`.
- `decision`: required, one of `"proceeded"`, `"declined"`, `"parked"`.
- `categoryId`: optional. Must belong to the current user (403 otherwise).
- `scorecardAnswer`, `utilityStatusAnswer`, `sixMonthAnswer`: optional. Saved as-is (nullable).
- `alsoLogAsSpending`: optional. When `true` AND `decision === "proceeded"`, inserts a `spending_entries` row atomically and sets `spendingEntryId` on the moment log.

**Response** `201`: The created `moment_logs` row (including `spendingEntryId` if linked).
**Response** `400`: Validation error with field-specific message.
**Response** `403`: `categoryId` does not belong to the current user.

---

### GET /api/moment-logs

Returns paginated moment logs for the current user, joined with category name.

**Auth**: required.

**Query params**:
- `limit` (default 50, max 200)
- `offset` (default 0)
- `decision` (optional — one of `"proceeded"`, `"declined"`, `"parked"`)

**Response** `200`:
```json
{
  "logs": [
    {
      "id": 1,
      "userId": "...",
      "date": "2026-05-23",
      "amount": 850,
      "description": "New laptop",
      "categoryId": 3,
      "categoryName": "Electronics",
      "spendingEntryId": 42,
      "scorecardAnswer": "...",
      "utilityStatusAnswer": "...",
      "sixMonthAnswer": "...",
      "decision": "proceeded",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 12
}
```

---

### PATCH /api/moment-logs/:id

Update a moment log's `decision` and/or filter answers. Ownership-gated (404 if not found or belongs to another user).

**Auth**: required.

**Body** (all fields optional):
```json
{
  "decision": "declined",
  "scorecardAnswer": "Updated answer",
  "utilityStatusAnswer": null,
  "sixMonthAnswer": "Changed my mind"
}
```

**Response** `200`: Updated moment log row.
**Response** `400`: Invalid `decision` value.
**Response** `404`: Not found or not owned by current user.

---

### DELETE /api/moment-logs/:id

Delete a moment log. **Does NOT delete the linked `spendingEntries` row** — the spending entry is decoupled and survives independently. Ownership-gated.

**Auth**: required.

**Response** `204`: No content.
**Response** `404`: Not found or not owned by current user.

---

## Budget Settings *(extended by Budget Expansion)*

The `GET /api/budget-settings` and `PATCH /api/budget-settings` routes now include four additional fields:

| Field | Type | Description |
|-------|------|-------------|
| `bucketTargets` | `{ fixed, invest, save, guilt_free }` or `null` | Target % per Sethi bucket. Validated on PATCH: must be an object with all four numeric keys. |
| `momentThreshold` | `number` (default 200) | Euro amount above which the Moment dialog prompts the user. |
| `targetAnnualSpending` | `number \| null` | Override for annual spending in the 25× FI calculation. |
| `statePensionAnnualAmount` | `number \| null` | Projected state pension per year for the 25× target adjustment. |

---

## Budget Summary *(extended by Budget Expansion)*

`GET /api/budget/summary?month=YYYY-MM` now returns three additional top-level fields:

```json
{
  "buckets": [
    { "key": "fixed",       "label": "Fixed",       "targetPct": 55,   "actualPct": 58.2, "actualAmount": 2100 },
    { "key": "invest",      "label": "Invest",      "targetPct": 10,   "actualPct": 8.1,  "actualAmount": 290  },
    { "key": "save",        "label": "Save",        "targetPct": 10,   "actualPct": 5.4,  "actualAmount": 195  },
    { "key": "guilt_free",  "label": "Guilt-Free",  "targetPct": 25,   "actualPct": 28.3, "actualAmount": 1020 },
    { "key": "unassigned",  "label": "Unassigned",  "targetPct": null, "actualPct": 5.0,  "actualAmount": 180  }
  ],
  "investingLadder": [
    { "key": "emergency_cash",     "label": "Emergency Cash (3 months)",          "filled": true,  "categoryMapped": true  },
    { "key": "credit_card_debt",   "label": "Pay off credit card debt",           "filled": false, "categoryMapped": false },
    { "key": "consumer_credit",    "label": "Pay off consumer credit",            "filled": true,  "categoryMapped": true  },
    { "key": "employer_pension",   "label": "Max employer pension / 2nd pillar", "filled": false, "categoryMapped": false },
    { "key": "pensioensparen",     "label": "Pensioensparen (\u20ac1,350/yr)",         "filled": true,  "categoryMapped": true  },
    { "key": "langetermijnsparen", "label": "Langetermijnsparen (\u20ac2,450/yr)",     "filled": false, "categoryMapped": false },
    { "key": "etf_investment",     "label": "Broad ETF investment (VT/IWDA)",    "filled": false, "categoryMapped": false }
  ],
  "target25x": {
    "computedAnnualSpending": 36000,
    "overrideAnnualSpending": null,
    "activeAnnualSpending": 36000,
    "target": 900000,
    "adjustedTarget": 525000
  }
}
```

- `buckets`: `BucketActual[]` — actual % computed against monthly income. Unassigned spending is surfaced as a fifth entry with `key: "unassigned"` and `targetPct: null`.
- `investingLadder`: `InvestingLadderRung[]` — 7 rungs, each with `key`, `label`, `filled`, `categoryMapped`. Most rungs are `filled` when the user has a spending category with the matching canonical name assigned to the `invest` bucket. Exception: `emergency_cash` is `filled` when `computedSaved >= 3 × avgMonthlyFixedCosts` (savings vs. 3 months of fixed costs; no category mapping needed).
- `target25x`: `Target25x` — computed by `computeTarget25x()` in `src/lib/budget-computations.ts`. `target` = 25 × `activeAnnualSpending`. `adjustedTarget` = 25 × max(`activeAnnualSpending` − `statePensionAnnualAmount`, 0). `activeAnnualSpending` uses `overrideAnnualSpending` from settings when set, otherwise `computedAnnualSpending` from current-month spending entries × 12.

---

## Spending Categories *(extended by Budget Expansion)*

`PATCH /api/spending-categories/:id` now accepts a `bucket` field:

- `bucket`: one of `"fixed"`, `"invest"`, `"save"`, `"guilt_free"`, or `null` (unassign).
- Returns `400` for any other value.

---

## Library

Read-only reference content. Shared across all users (no per-user scoping on content tables). Bookmarks are per-user (Phase 3).

### GET /api/library/topics

Returns all library topics ordered by `display_order`.

**Auth**: required (401 if no session).

**Response** `200`:
```json
[
  {
    "id": 1,
    "slug": "tennis",
    "title": "Tennis",
    "icon": "Swords",
    "description": "Stroke mechanics, physical conditioning, mental game, and match tactics for the recreational player.",
    "displayOrder": 0,
    "createdAt": "2026-05-19T00:00:00.000Z",
    "updatedAt": "2026-05-19T00:00:00.000Z"
  }
]
```

---

### GET /api/library/topics/:slug

Returns a single topic with its full nested category and item tree. Each item includes `isBookmarked` reflecting the current user's bookmark state.

**Auth**: required (401 if no session).

**Response** `200`:
```json
{
  "id": 1,
  "slug": "tennis",
  "title": "Tennis",
  "icon": "Swords",
  "description": "...",
  "displayOrder": 0,
  "createdAt": "...",
  "updatedAt": "...",
  "categories": [
    {
      "id": 1,
      "topicId": 1,
      "title": "Stroke Mechanics",
      "displayOrder": 0,
      "createdAt": "...",
      "updatedAt": "...",
      "items": [
        {
          "id": 1,
          "categoryId": 1,
          "title": "The Kinetic Chain",
          "type": "concept",
          "what": "...",
          "why": "...",
          "how": "...",
          "durationOrReps": null,
          "displayOrder": 0,
          "createdAt": "...",
          "updatedAt": "...",
          "isBookmarked": false
        }
      ]
    }
  ]
}
```

**Response** `404`: Topic with the given slug does not exist.

---

### GET /api/library/bookmarks

Returns all bookmarked items for the current user, joined with item/category/topic data. Sorted by topic `display_order` then item `display_order`.

**Auth**: required (401 if no session).

**Response** `200`: Array of `BookmarkedItem` (extends `LibraryItem` with `isBookmarked: true`, `topicId`, `topicSlug`, `topicTitle`, `topicIcon`, `categoryTitle`).

---

### POST /api/library/bookmarks

Bookmark an item. **Idempotent** — always returns `201` (INSERT OR IGNORE). Body: `{ itemId: number }`.

**Auth**: required.

**Response** `201`: The `library_bookmarks` row.
**Response** `400`: Missing or invalid `itemId`.
**Response** `404`: Item not found.

---

### DELETE /api/library/bookmarks/:itemId

Remove a bookmark. **Idempotent** — always returns `204`, even if no row matched.

**Auth**: required.

**Response** `204`: No content.
**Response** `400`: Invalid `itemId`.

---

### POST /api/library/topics/:slug/categories

**Admin only** (403 for non-admins). Add a new category to a topic. Body: `{ title: string }` (max 80 chars).

**Response** `201`: Created category row.
**Response** `400`: Missing/invalid title.
**Response** `404`: Topic slug not found.

---

### PATCH /api/library/categories/:id

**Admin only**. Update category `title` and/or `displayOrder`. All fields optional.

**Response** `200`: Updated category row.
**Response** `404`: Category not found.

---

### DELETE /api/library/categories/:id

**Admin only**. Hard-delete. FK cascade removes all items and their bookmarks. **Idempotent** — returns `204` even if already deleted.

**Response** `204`: No content.

---

### POST /api/library/categories/:id/items

**Admin only**. Create a new item. All fields (`title`, `type`, `what`, `why`, `how`) required. `durationOrReps` optional. Length caps enforced (title: 100, what/why: 600, how: 1200, durationOrReps: 120).

**Response** `201`: Created item row.
**Response** `400`: Validation error.
**Response** `404`: Category not found.

---

### PATCH /api/library/items/:id

**Admin only**. Update any item field. All fields optional. Same length caps as POST.

**Response** `200`: Updated item row.
**Response** `404`: Item not found.

---

### DELETE /api/library/items/:id

**Admin only**. Hard-delete. FK cascade removes associated bookmarks.

**Response** `204`: No content.

---

### PUT /api/library/categories/:id/reorder

**Admin only**. Reorder items within a category. Body: `{ order: number[] }` — array of item IDs in desired display order. Updates `display_order` in a single transaction.

**Response** `200`: `{ ok: true }`.
**Response** `400`: Invalid order array or IDs not belonging to this category.
**Response** `404`: Category not found.

---

## Health Check

### GET /api/health

Simple health check endpoint.

**Response** `200`:
```json
{ "status": "ok" }
```
