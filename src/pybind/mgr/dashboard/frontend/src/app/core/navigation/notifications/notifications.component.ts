import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { Icons } from '~/app/shared/enum/icons.enum';
import { CdNotification } from '~/app/shared/models/cd-notification';
import { NotificationService } from '~/app/shared/services/notification.service';
import { SummaryService } from '~/app/shared/services/summary.service';
import { CarbonNotificationService } from '~/app/shared/services/carbon-notification.service';

@Component({
  selector: 'cd-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  icons = Icons;
  hasRunningTasks = false;
  hasNotifications = false;
  useCarbonPanel = true;
  private subs = new Subscription();

  constructor(
    public notificationService: NotificationService,
    private summaryService: SummaryService,
    private carbonNotificationService: CarbonNotificationService
  ) {}

  ngOnInit() {
    // Close both panels on init
    this.notificationService.toggleSidebar(true);
    this.carbonNotificationService.closeCarbonSidebar();

    this.subs.add(
      this.summaryService.subscribe((summary) => {
        this.hasRunningTasks = summary.executing_tasks.length > 0;
      })
    );

    this.subs.add(
      this.notificationService.data$.subscribe((notifications: CdNotification[]) => {
        this.hasNotifications = notifications.length > 0;
      })
    );

    // Ensure panels don't interfere with each other
    this.subs.add(
      this.carbonNotificationService.isOpen$.subscribe((isOpen) => {
        if (isOpen && !this.useCarbonPanel) {
          this.carbonNotificationService.closeCarbonSidebar();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleNotifications() {
    if (this.useCarbonPanel) {
      // Using Carbon panel
      this.notificationService.toggleSidebar(true);
      this.carbonNotificationService.toggleCarbonSidebar();
    } else {
      // Using default panel
      this.carbonNotificationService.closeCarbonSidebar();
      this.notificationService.toggleSidebar(false);
    }
  }
}
