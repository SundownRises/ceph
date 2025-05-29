import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CdNotification, CdNotificationConfig } from '../models/cd-notification';
import { NotificationType } from '../enum/notification-type.enum';
import { FinishedTask } from '../models/finished-task';
import { TaskMessageService } from './task-message.service';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class CarbonNotificationService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  private doNotDisturbSubject = new BehaviorSubject<boolean>(false);
  doNotDisturb$ = this.doNotDisturbSubject.asObservable();

  // Data observable for notifications
  private dataSource = new BehaviorSubject<CdNotification[]>([]);
  data$ = this.dataSource.asObservable();

  private queued: CdNotificationConfig[] = [];
  private queuedTimeoutId: number;
  private KEY = 'carbonNotifications';

  constructor(private taskMessageService: TaskMessageService) {
    // Load saved notifications from localStorage
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

  toggleCarbonSidebar() {
    const currentState = this.isOpenSubject.getValue();
    this.isOpenSubject.next(!currentState);
  }

  closeCarbonSidebar() {
    this.isOpenSubject.next(false);
  }

  toggleDoNotDisturb() {
    const currentState = this.doNotDisturbSubject.getValue();
    this.doNotDisturbSubject.next(!currentState);
  }

  // Notification Management
  removeAll() {
    localStorage.removeItem(this.KEY);
    this.dataSource.next([]);
  }

  remove(index: number) {
    const recent = this.dataSource.getValue();
    recent.splice(index, 1);
    this.dataSource.next(recent);
    localStorage.setItem(this.KEY, JSON.stringify(recent));
  }

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
          options,
          application
        );
      }
      this.queueToShow(config);
    }, 10);
  }

  private queueToShow(config: CdNotificationConfig) {
    window.clearTimeout(this.queuedTimeoutId);
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
    });
    this.queued = [];
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
} 