// services/calendarService.js
const { google } = require('googleapis');
const ical = require('ical-generator');
const moment = require('moment');

class CalendarService {
  constructor() {
    this.calendar = google.calendar('v3');
  }

  // ─── Helper: build OAuth2 client from user tokens ───────────────────────────
  _getAuthClient(user) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: user.googleRefreshToken,
      access_token: user.googleAccessToken  // optional but speeds up first call
    });

    // Auto-save new access tokens when they refresh
    auth.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        // Save back to DB — import User model here or pass a callback
        const User = require('../models/User');
        await User.findByIdAndUpdate(user._id, {
          googleRefreshToken: tokens.refresh_token,
          googleAccessToken: tokens.access_token
        });
      }
    });

    return auth;
  }

  // ─── Helper: build the calendar event resource ───────────────────────────────
  _buildCalendarEvent(event) {
    return {
      summary: event.title,
      description: event.description,
      location: event.location?.address || '',
      start: {
        dateTime: new Date(event.startDate).toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: new Date(event.endDate).toISOString(),
        timeZone: 'America/New_York'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },  // 1 day before
          { method: 'popup', minutes: 30 }          // 30 mins before
        ]
      }
    };
  }

  // ─── ADD event to Google Calendar ───────────────────────────────────────────
  // Called in: createEvent, joinEvent
  async addToGoogleCalendar(event, user) {
    try {
      const auth = this._getAuthClient(user);

      const response = await this.calendar.events.insert({
        auth,
        calendarId: 'primary',
        resource: this._buildCalendarEvent(event)
      });

      console.log(`Calendar event created: ${response.data.id}`);
      return response.data.id; // stored as event.calendarEventId
    } catch (error) {
      console.error('Error adding to Google Calendar:', error.message);
      throw error;
    }
  }

  // ─── UPDATE event in Google Calendar ────────────────────────────────────────
  // Called in: updateEvent
  async updateGoogleCalendarEvent(event, user, calendarEventId) {
    try {
      const auth = this._getAuthClient(user);

      const response = await this.calendar.events.update({
        auth,
        calendarId: 'primary',
        eventId: calendarEventId,
        resource: this._buildCalendarEvent(event)
      });

      console.log(`Calendar event updated: ${calendarEventId}`);
      return response.data;
    } catch (error) {
      // If event no longer exists in Google Calendar, don't crash
      if (error.code === 404) {
        console.warn(`Calendar event not found (may have been deleted manually): ${calendarEventId}`);
        return null;
      }
      console.error('Error updating Google Calendar event:', error.message);
      throw error;
    }
  }

  // ─── REMOVE event from Google Calendar ──────────────────────────────────────
  // Called in: leaveEvent, deleteEvent
  async removeFromGoogleCalendar(calendarEventId, user) {
    try {
      const auth = this._getAuthClient(user);

      await this.calendar.events.delete({
        auth,
        calendarId: 'primary',
        eventId: calendarEventId
      });

      console.log(`Calendar event removed: ${calendarEventId}`);
    } catch (error) {
      // 404 = already deleted — safe to ignore
      if (error.code === 404) {
        console.warn(`Calendar event already removed: ${calendarEventId}`);
        return;
      }
      console.error('Error removing from Google Calendar:', error.message);
      throw error;
    }
  }

  // ─── NOTIFY participants of an event update ──────────────────────────────────
  // Optional: call this from updateEvent to push updated invite emails
  async notifyParticipantsOfUpdate(event, user, calendarEventId) {
    try {
      const auth = this._getAuthClient(user);

      await this.calendar.events.update({
        auth,
        calendarId: 'primary',
        eventId: calendarEventId,
        sendUpdates: 'all',  // Sends email notifications to attendees
        resource: this._buildCalendarEvent(event)
      });

      console.log(`Participants notified of event update: ${calendarEventId}`);
    } catch (error) {
      console.error('Error notifying participants:', error.message);
      throw error;
    }
  }

  // ─── Generate iCal file (Outlook / Apple Calendar) ──────────────────────────
  // Use this as a fallback for users without Google Calendar connected.
  // Returns a string — send it as a .ics file download.
  generateICalEvent(event) {
    const cal = ical({ name: 'Planting Events' });

    cal.createEvent({
      start: moment(event.startDate).toDate(),
      end: moment(event.endDate).toDate(),
      summary: event.title,
      description: event.description,
      location: event.location?.address || '',
      organizer: {
        name: 'Community Events',
        email: process.env.EMAIL_FROM || 'events@plantapp.com'
      },
      alarms: [
        { type: 'display', trigger: -60 * 24 * 60, description: 'Event tomorrow!' },  // 24h before (seconds)
        { type: 'display', trigger: -30 * 60, description: 'Event starting in 30 minutes!' }
      ]
    });

    return cal.toString();
  }
}

module.exports = new CalendarService();