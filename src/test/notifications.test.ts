import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import type { NotificationItem } from '../types';

describe('Module L — Notifications & Reminders Tests (5 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
  });

  it('1. saves and retrieves appointment confirmation notification', () => {
    const notif: NotificationItem = {
      id: 'notif-test-1',
      userId: 'user-notif-01',
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: 'Your slot at Metro General is confirmed.',
      read: false,
      createdAt: new Date().toISOString(),
    };

    storage.saveNotification(notif);
    const list = storage.getNotifications('user-notif-01');
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('Appointment Confirmed');
  });

  it('2. saves cancellation reminder notification with capacity restoration info', () => {
    const notif: NotificationItem = {
      id: 'notif-test-2',
      userId: 'user-notif-01',
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      message: 'Slot capacity was restored.',
      read: false,
      createdAt: new Date().toISOString(),
    };

    storage.saveNotification(notif);
    const list = storage.getNotifications('user-notif-01');
    expect(list.some((n) => n.type === 'appointment_cancelled')).toBe(true);
  });

  it('3. marks an unread notification as read', () => {
    const notif: NotificationItem = {
      id: 'notif-test-3',
      userId: 'user-notif-02',
      type: 'journey_action',
      title: 'Action Required',
      message: 'Prepare your ID proof.',
      read: false,
      createdAt: new Date().toISOString(),
    };
    storage.saveNotification(notif);

    storage.markNotificationAsRead('notif-test-3');
    const updated = storage.getNotifications('user-notif-02').find((n) => n.id === 'notif-test-3');
    expect(updated?.read).toBe(true);
  });

  it('4. counts unread notifications correctly for patient badge display', () => {
    storage.saveNotification({
      id: 'n1',
      userId: 'user-notif-03',
      type: 'reminder',
      title: 'Reminder 1',
      message: 'Msg 1',
      read: false,
      createdAt: new Date().toISOString(),
    });
    storage.saveNotification({
      id: 'n2',
      userId: 'user-notif-03',
      type: 'reminder',
      title: 'Reminder 2',
      message: 'Msg 2',
      read: true,
      createdAt: new Date().toISOString(),
    });

    const list = storage.getNotifications('user-notif-03');
    const unread = list.filter((n) => !n.read);
    expect(unread.length).toBe(1);
  });

  it('5. orders notifications in reverse chronological order (newest first)', () => {
    storage.saveNotification({
      id: 'older',
      userId: 'user-notif-04',
      type: 'reminder',
      title: 'Older Notification',
      message: 'Older message',
      read: false,
      createdAt: '2026-11-01T10:00:00Z',
    });
    storage.saveNotification({
      id: 'newer',
      userId: 'user-notif-04',
      type: 'reminder',
      title: 'Newer Notification',
      message: 'Newer message',
      read: false,
      createdAt: '2026-11-04T10:00:00Z',
    });

    const list = storage.getNotifications('user-notif-04');
    expect(list[0].id).toBe('newer');
    expect(list[1].id).toBe('older');
  });
});
