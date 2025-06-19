import { Component, HostBinding } from '@angular/core';
import { CdNotification } from '~/app/shared/models/cd-notification';
import { ExecutingTask } from '~/app/shared/models/executing-task';
import { NotificationService } from '~/app/shared/services/notification.service';
import { SummaryService } from '~/app/shared/services/summary.service';

@Component({
  selector: 'cd-carbon-notification-panel',
  templateUrl: './carbon-notification-panel.component.html',
  styleUrls: ['./carbon-notification-panel.component.scss']
})
export class CarbonNotificationPanelComponent {
  notifications: CdNotification[] = [];
  executingTasks: ExecutingTask[] = [];
  unreadCount = 0;

  @HostBinding('class.open') get isOpen() {
    return this.notificationService.showCarbonPanel;
  }

  @HostBinding('class.cds--g10') g10Theme = true;

  constructor(
    public notificationService: NotificationService,
    private summaryService: SummaryService
  ) {
    this.notificationService.data$.subscribe((notifications: CdNotification[]) => {
      this.notifications = notifications;
      this.unreadCount = notifications.length;
    });

    this.summaryService.subscribe((summary) => {
      this.executingTasks = summary.executing_tasks || [];
    });
  }

  onDoNotDisturbChange(value: boolean): void {
    this.notificationService.setDoNotDisturb(value);
  }

  onDismissNotification(index: number): void {
    this.notificationService.remove(index);
  }

  onRetryNotification(notification: CdNotification): void {
    this.notificationService.retryNotification(notification);
  }

  onToggleAlert(notification: CdNotification): void {
    this.notificationService.toggleAlert(notification);
  }

  onViewAllNotifications(): void {
    this.notificationService.viewAllNotifications();
  }

  onClearAllNotifications(): void {
    this.notificationService.removeAll();
  }

  onOpenSettings(): void {
    this.notificationService.openSettings();
  }
} 