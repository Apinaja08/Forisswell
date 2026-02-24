/**
 * calendarAlertService.js
 *
 * Checks Google Calendar for upcoming tree-care events and creates alerts
 * for trees that have scheduled care tasks.
 *
 * Reuses the existing calendarService.js (googleapis OAuth2 integration).
 *
 * Care keywords that trigger an alert: "watering", "pruning", "inspection",
 * "trimming", "fertilizing", "treatment" (configurable via CALENDAR_CARE_KEYWORDS env).
 */

const { google } = require("googleapis");
const Alert = require("../models/Alert");
const Tree = require("../models/Tree");
const alertService = require("./alertService");
const logger = require("../utils/logger");

// ─── Config ───────────────────────────────────────────────────────────────────

const getCareKeywords = () =>
  (
    process.env.CALENDAR_CARE_KEYWORDS ||
    "watering,pruning,inspection,trimming,fertilizing,treatment"
  )
    .split(",")
    .map((k) => k.trim().toLowerCase());

const getOAuth2Client = () => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  return client;
};

// ─── Tree-specific calendar check ─────────────────────────────────────────────

/**
 * Check Google Calendar for events related to a specific tree.
 * An event is considered related if its title or description contains:
 *   - The tree's MongoDB ID, OR
 *   - The tree's name/species AND a care keyword
 *
 * Events within the next 7 days are checked.
 * Creates an alert for each unprocessed qualifying event.
 *
 * @param {object} tree - Mongoose Tree document
 * @param {string} googleRefreshToken - OAuth2 refresh token for calendar access
 * @returns {{ alertsCreated: number }}
 */
const checkCalendarEventsForTree = async (tree, googleRefreshToken) => {
  if (!googleRefreshToken) {
    logger.warn("[calendarAlert] No Google refresh token provided — skipping calendar check");
    return { alertsCreated: 0 };
  }

  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: googleRefreshToken });

  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let events;
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: inSevenDays.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    events = response.data.items || [];
  } catch (err) {
    logger.error(`[calendarAlert] Failed to fetch calendar events for tree ${tree._id}: ${err.message}`);
    return { alertsCreated: 0 };
  }

  const careKeywords = getCareKeywords();
  const treeIdStr = tree._id.toString();
  const treeNameLower = (tree.name || tree.species || "").toLowerCase();

  let alertsCreated = 0;

  for (const event of events) {
    const titleLower = (event.summary || "").toLowerCase();
    const descLower = (event.description || "").toLowerCase();
    const combined = `${titleLower} ${descLower}`;

    // Check if the event is related to this tree
    const isTreeRelated =
      combined.includes(treeIdStr) ||
      (treeNameLower && combined.includes(treeNameLower));

    if (!isTreeRelated) continue;

    // Check if the event contains a care keyword
    const hasCareKeyword = careKeywords.some((kw) => combined.includes(kw));
    if (!hasCareKeyword) continue;

    // Skip if an alert for this calendar event already exists
    const existing = await Alert.findOne({
      calendarEventId: event.id,
      status: { $in: ["searching", "accepted", "in_progress"] },
    });
    if (existing) continue;

    try {
      const result = await alertService.createAlert(
        tree._id,
        "calendar_event",
        "calendar",
        null,      // no weatherSnapshot for calendar alerts
        event.id,  // calendarEventId
        {
          field: "calendar_event",
          value: event.summary,
          threshold: `Scheduled care: ${careKeywords.filter((kw) => combined.includes(kw)).join(", ")}`,
        }
      );
      if (result) {
        alertsCreated++;
        logger.info(
          `[calendarAlert] Alert created for tree ${tree._id} — event: "${event.summary}"`
        );
      }
    } catch (err) {
      logger.error(
        `[calendarAlert] Failed to create alert for tree ${tree._id} / event ${event.id}: ${err.message}`
      );
    }
  }

  return { alertsCreated };
};

// ─── Scheduled Check (all active trees) ──────────────────────────────────────

/**
 * Called by admin trigger or node-cron.
 * Requires a system-level Google refresh token stored in GOOGLE_SYSTEM_REFRESH_TOKEN env.
 */
const runCalendarCheckForAllTrees = async () => {
  const refreshToken = process.env.GOOGLE_SYSTEM_REFRESH_TOKEN;
  if (!refreshToken) {
    logger.warn("[calendarAlert] GOOGLE_SYSTEM_REFRESH_TOKEN not set — calendar check skipped");
    return { treesChecked: 0, alertsCreated: 0 };
  }

  logger.info("[calendarAlert] Starting calendar check for all trees...");

  const trees = await Tree.find({ isActive: true });
  let totalAlerts = 0;

  for (const tree of trees) {
    const { alertsCreated } = await checkCalendarEventsForTree(tree, refreshToken);
    totalAlerts += alertsCreated;
  }

  logger.info(
    `[calendarAlert] Calendar check complete — ${trees.length} tree(s) checked, ${totalAlerts} alert(s) created`
  );

  return { treesChecked: trees.length, alertsCreated: totalAlerts };
};

module.exports = { checkCalendarEventsForTree, runCalendarCheckForAllTrees };
