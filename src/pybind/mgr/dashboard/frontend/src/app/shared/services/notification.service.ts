import { Injectable } from '@angular/core';

import _ from 'lodash';
import { BehaviorSubject, Subject } from 'rxjs';

import { NotificationType } from '../enum/notification-type.enum';
import { CdNotification, CdNotificationConfig } from '../models/cd-notification';
import { FinishedTask } from '../models/finished-task';
import { CdDatePipe } from '../pipes/cd-date.pipe';
import { TaskMessageService } from './task-message.service';

export interface ActiveToast {
  id: string;
  title: string;
  message: string;
  caption: string;
  carbonType: string;
  lowContrast: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private hideToasties = false;

  // Data observable for saved notifications
  private dataSource = new BehaviorSubject<CdNotification[]>([]);
  data$ = this.dataSource.asObservable();

  // Active toasts observable
  private activeToastsSource = new BehaviorSubject<ActiveToast[]>([]);
  activeToasts$ = this.activeToastsSource.asObservable();

  // Sidebar observable
  sidebarSubject = new Subject();

  private queued: CdNotificationConfig[] = [];
  private queuedTimeoutId: number;
  private activeToasts: ActiveToast[] = [];
  KEY = 'cdNotifications';

  constructor(
    private taskMessageService: TaskMessageService,
    private cdDatePipe: CdDatePipe,
  ) {
    const stringNotifications = localStorage.getItem(this.KEY);
    let notifications: CdNotification[] = [];

    if (_.isString(stringNotifications)) {
      notifications = JSON.parse(stringNotifications, (_key, value) => {
        if (_.isPlainObject(value)) {
          return _.assign(new CdNotification(), value);
        }
        return value;
      });
    }

    this.dataSource.next(notifications);
  }

  /**
   * Removes all current saved notifications
   */
  removeAll() {
    localStorage.removeItem(this.KEY);
    this.dataSource.next([]);
  }

  /**
   * Removes a single saved notifications
   */
  remove(index: number) {
    const recent = this.dataSource.getValue();
    recent.splice(index, 1);
    this.dataSource.next(recent);
    localStorage.setItem(this.KEY, JSON.stringify(recent));
  }

  /**
   * Method used for saving a shown notification (check show() method).
   */
  save(notification: CdNotification) {
    const recent = this.dataSource.getValue();
    recent.push(notification);
    recent.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
    while (recent.length > 10) {
      recent.pop();
    }
    this.dataSource.next(recent);
    localStorage.setItem(this.KEY, JSON.stringify(recent));
  }

  /**
   * Method for showing a notification.
   * @param {NotificationType} type toastr type
   * @param {string} title
   * @param {string} [message] The message to be displayed. Note, use this field
   *   for error notifications only.
   * @param {*} [options] toastr compatible options, used when creating a toastr
   * @param {string} [application] Only needed if notification comes from an external application
   * @returns The timeout ID that is set to be able to cancel the notification.
   */
  show(
    type: NotificationType,
    title: string,
    message?: string,
    options?: any,
    application?: string
  ): number;
  show(config: CdNotificationConfig | (() => CdNotificationConfig)): number;
  show(
    arg: NotificationType | CdNotificationConfig | (() => CdNotificationConfig),
    title?: string,
    message?: string,
    options?: any,
    application?: string
  ): number {
    return window.setTimeout(() => {
      let config: CdNotificationConfig;
      if (_.isFunction(arg)) {
        config = arg() as CdNotificationConfig;
      } else if (_.isObject(arg)) {
        config = arg as CdNotificationConfig;
      } else {
        config = new CdNotificationConfig(
          arg as NotificationType,
          title,
          message,
          options || { lowContrast: true },
          application
        );
      }
      this.queueToShow(config);
    }, 10);
  }

  private queueToShow(config: CdNotificationConfig) {
    this.cancel(this.queuedTimeoutId);
    if (!this.queued.find((c) => _.isEqual(c, config))) {
      this.queued.push(config);
    }
    this.queuedTimeoutId = window.setTimeout(() => {
      this.showQueued();
    }, 500);
  }

  private showQueued() {
    this.getUnifiedTitleQueue().forEach((config) => {
      const notification = new CdNotification(config);

      if (!notification.isFinishedTask) {
        this.save(notification);
      }
      this.showToasty(notification);
    });
  }

  private getUnifiedTitleQueue(): CdNotificationConfig[] {
    return Object.values(this.queueShiftByTitle()).map((configs) => {
      const config = configs[0];
      if (configs.length > 1) {
        config.message = '<ul>' + configs.map((c) => `<li>${c.message}</li>`).join('') + '</ul>';
      }
      return config;
    });
  }

  private queueShiftByTitle(): { [key: string]: CdNotificationConfig[] } {
    const byTitle: { [key: string]: CdNotificationConfig[] } = {};
    let config: CdNotificationConfig;
    while ((config = this.queued.shift())) {
      if (!byTitle[config.title]) {
        byTitle[config.title] = [];
      }
      byTitle[config.title].push(config);
    }
    return byTitle;
  }

  private showToasty(notification: CdNotification) {
    // Exit immediately if no toasty should be displayed.
    if (this.hideToasties) {
      return;
    }

    // Map notification types to Carbon types
    const carbonType = this.mapNotificationTypeToCarbon(notification.type);
    
    // Get lowContrast setting from options, default to false
    const lowContrast = notification.options?.lowContrast || false;
    
    // Create toast object
    const toast: ActiveToast = {
      id: _.uniqueId('toast-'),
      title: notification.title,
      message: notification.message || '',
      caption: this.renderTimeAndApplicationHtml(notification),
      carbonType: carbonType,
      lowContrast: lowContrast
    };
    // Add new toast to the beginning of the array
    this.activeToasts = [toast, ...this.activeToasts];
    this.activeToastsSource.next(this.activeToasts);
    // Auto remove after timeout if specified, or default to 5 seconds
    const timeOut = notification.options?.timeOut || 5000;
    setTimeout(() => {
      this.removeToast(toast.id);
    }, timeOut);
  }

  /**
   * Map notification types to Carbon types
   */
  private mapNotificationTypeToCarbon(type: NotificationType): string {
    switch (type) {
      case NotificationType.error:
        return 'error';
      case NotificationType.info:
        return 'info';
      case NotificationType.success:
        return 'success';
      case NotificationType.warning:
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Remove a toast by ID
   */
  removeToast(toastId: string) {
    this.activeToasts = this.activeToasts.filter((t) => t.id !== toastId);
    this.activeToastsSource.next(this.activeToasts);
  }

  renderTimeAndApplicationHtml(notification: CdNotification): string {
    return `<small class="date">${this.cdDatePipe.transform(
      notification.timestamp
    )}</small><i class="float-end custom-icon ${notification.applicationClass}" title="${
      notification.application
    }"></i>`;
  }

  notifyTask(finishedTask: FinishedTask, success: boolean = true): number {
    const notification = this.finishedTaskToNotification(finishedTask, success);
    notification.isFinishedTask = true;
    return this.show(notification);
  }

  finishedTaskToNotification(
    finishedTask: FinishedTask,
    success: boolean = true
  ): CdNotificationConfig {
    let notification: CdNotificationConfig;
    if (finishedTask.success && success) {
      notification = new CdNotificationConfig(
        NotificationType.success,
        this.taskMessageService.getSuccessTitle(finishedTask)
      );
    } else {
      notification = new CdNotificationConfig(
        NotificationType.error,
        this.taskMessageService.getErrorTitle(finishedTask),
        this.taskMessageService.getErrorMessage(finishedTask)
      );
    }
    notification.isFinishedTask = true;

    return notification;
  }

  /**
   * Prevent the notification from being shown.
   * @param {number} timeoutId A number representing the ID of the timeout to be canceled.
   */
  cancel(timeoutId: number) {
    window.clearTimeout(timeoutId);
  }

  /**
   * Suspend showing the notification toasties.
   * @param {boolean} suspend Set to ``true`` to disable/hide toasties.
   */
  suspendToasties(suspend: boolean) {
    this.hideToasties = suspend;
  }

  toggleSidebar(forceClose = false) {
    this.sidebarSubject.next(forceClose);
  }

  /**
   * Clear all active toasts
   */
  clearAllToasts() {
    this.activeToasts = [];
    this.activeToastsSource.next(this.activeToasts);
  }
}
