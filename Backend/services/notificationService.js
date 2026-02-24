// services/notificationService.js
const nodemailer = require('nodemailer');
const Event = require('../models/Event');

class NotificationService {
  constructor() {
    // Create email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async scheduleEventReminders(event) {
    // In a production app, you'd use a job queue like Bull or Agenda
    // For now, we'll just log the reminder
    console.log(`Reminders scheduled for event: ${event.title}`);
    
    // Calculate reminder times
    const reminderTimes = [
      { hours: 24, type: 'day_before' },
      { hours: 2, type: 'two_hours_before' }
    ];

    for (const reminder of reminderTimes) {
      const reminderDate = new Date(event.startDate);
      reminderDate.setHours(reminderDate.getHours() - reminder.hours);
      
      const now = new Date();
      const delay = reminderDate.getTime() - now.getTime();

      if (delay > 0) {
        setTimeout(async () => {
          await this.sendEventReminders(event._id, reminder.type);
        }, delay);
      }
    }
  }

  async sendEventReminders(eventId, reminderType) {
    try {
      const event = await Event.findById(eventId)
        .populate('participants.user', 'email name');

      if (!event || event.status !== 'upcoming') return;

      const confirmedParticipants = event.participants
        .filter(p => p.status === 'confirmed')
        .map(p => p.user);

      // Send reminders to all confirmed participants
      for (const participant of confirmedParticipants) {
        if (participant && participant.email) {
          await this.sendEmail({
            to: participant.email,
            subject: `Reminder: ${event.title} ${reminderType === 'day_before' ? 'Tomorrow!' : 'Starting Soon!'}`,
            html: this.getReminderEmailTemplate(event, participant, reminderType)
          });
        }
      }

      console.log(`Reminders sent for event ${event.title}`);
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }

  async sendJoinConfirmation(event, user, status) {
    try {
      await this.sendEmail({
        to: user.email,
        subject: `You've joined: ${event.title}`,
        html: this.getJoinConfirmationTemplate(event, user, status)
      });
    } catch (error) {
      console.error('Error sending join confirmation:', error);
    }
  }

  async sendEmail({ to, subject, html }) {
    try {
      const mailOptions = {
        from: `"Community Events" <${process.env.EMAIL_FROM || 'noreply@plantapp.com'}>`,
        to,
        subject,
        html
      };

      // In development, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('Email sent:', { to, subject });
        console.log('Content:', html);
        return;
      }

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  getReminderEmailTemplate(event, user, reminderType) {
    const reminderText = reminderType === 'day_before' 
      ? 'tomorrow' 
      : 'in 2 hours';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Event Reminder</h2>
        <p>Hello ${user.name},</p>
        <p>This is a reminder that you have a planting event ${reminderText}:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">${event.title}</h3>
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(event.startDate).toLocaleTimeString()}</p>
          <p><strong>Location:</strong> ${event.location?.address || 'TBD'}</p>
          <p><strong>Description:</strong> ${event.description}</p>
        </div>
        
        <p>What to bring:</p>
        <ul>
          <li>Water bottle</li>
          <li>Gardening gloves (if you have them)</li>
          <li>Sun protection (hat, sunscreen)</li>
          <li>Comfortable clothes and closed-toe shoes</li>
        </ul>
        
        <p>We look forward to seeing you there!</p>
        <p>Happy planting! 🌱</p>
      </div>
    `;
  }

  getJoinConfirmationTemplate(event, user, status) {
    const statusMessage = status === 'confirmed' 
      ? 'You have successfully joined' 
      : 'You have been added to the waitlist for';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Event Confirmation</h2>
        <p>Hello ${user.name},</p>
        <p>${statusMessage} <strong>${event.title}</strong>!</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2e7d32; margin-top: 0;">Event Details</h3>
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(event.startDate).toLocaleTimeString()}</p>
          <p><strong>Location:</strong> ${event.location?.address || 'TBD'}</p>
          <p><strong>Status:</strong> ${status}</p>
        </div>
        
        <p>We've added this event to your calendar. You'll receive reminders before the event.</p>
        
        <p>Questions? Contact the event organizer.</p>
        <p>Thank you for being part of our community! 🌿</p>
      </div>
    `;
  }
}

module.exports = new NotificationService();