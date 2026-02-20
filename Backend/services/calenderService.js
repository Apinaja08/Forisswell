// services/calendarService.js
const { google } = require('googleapis');
const ical = require('ical-generator');
const moment = require('moment');

class CalendarService {
  constructor() {
    this.calendar = google.calendar('v3');
  }

  // Google Calendar Integration
  async addToGoogleCalendar(event, user) {
    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      auth.setCredentials({
        refresh_token: user.googleRefreshToken
      });

      const calendarEvent = {
        summary: event.title,
        description: event.description,
        location: event.location.address,
        start: {
          dateTime: event.startDate,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.endDate,
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        auth: auth,
        calendarId: 'primary',
        resource: calendarEvent,
      });

      return response.data.id;
    } catch (error) {
      console.error('Error adding to Google Calendar:', error);
      throw error;
    }
  }

  // Generate iCal file for Outlook/Apple Calendar
  generateICalEvent(event) {
    const cal = ical({ name: 'Planting Events' });
    
    cal.createEvent({
      start: moment(event.startDate),
      end: moment(event.endDate),
      summary: event.title,
      description: event.description,
      location: event.location.address,
      organizer: 'Community Events <events@plantapp.com>',
      alarms: [
        {
          trigger: 60 * 24, // 1 day before
          description: 'Reminder: Planting event tomorrow!'
        },
        {
          trigger: 30, // 30 minutes before
          description: 'Reminder: Event starting soon!'
        }
      ]
    });

    return cal.toString();
  }
}

module.exports = new CalendarService();