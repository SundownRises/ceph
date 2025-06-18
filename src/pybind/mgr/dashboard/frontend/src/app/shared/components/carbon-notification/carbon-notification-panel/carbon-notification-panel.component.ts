import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CdNotification } from '~/app/shared/models/cd-notification';
import { ExecutingTask } from '~/app/shared/models/executing-task';

@Component({
  selector: 'cd-carbon-notification-panel',
  templateUrl: './carbon-notification-panel.component.html',
  styleUrls: ['./carbon-notification-panel.component.scss']
})
export class CarbonNotificationPanelComponent {
  @Input() notifications: CdNotification[] = [];
  @Input() executingTasks: ExecutingTask[] = [];
  @Input() unreadCount = 0;
  @Input() doNotDisturb = false;
  @Input() showCarbonPanel = false;

  @Output() doNotDisturbChange = new EventEmitter<boolean>();
  @Output() dismissNotification = new EventEmitter<number>();
  @Output() retryNotification = new EventEmitter<CdNotification>();
  @Output() toggleAlert = new EventEmitter<CdNotification>();
  @Output() viewAllNotifications = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() clearAllNotifications = new EventEmitter<void>();

  @HostBinding('class.open') get isOpen() {
    return this.showCarbonPanel;
  }

  @HostBinding('class.cds--g10') g10Theme = true;
} 