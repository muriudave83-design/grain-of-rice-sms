"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapEventToNotificationType = mapEventToNotificationType;
const notification_enums_1 = require("../notification.enums");
function mapEventToNotificationType(eventName) {
    switch (eventName) {
        case 'reportCard.published':
            return notification_enums_1.NotificationType.REPORT_CARD_PUBLISHED;
        case 'attendance.submitted':
            return notification_enums_1.NotificationType.ATTENDANCE_SUBMITTED;
        case 'attendance.corrected':
            return notification_enums_1.NotificationType.ATTENDANCE_CORRECTED;
        default:
            return null; // ignored safely
    }
}
