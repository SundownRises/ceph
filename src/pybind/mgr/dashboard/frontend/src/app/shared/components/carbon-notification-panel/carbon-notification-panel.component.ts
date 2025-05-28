import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { IconService } from 'carbon-components-angular';
import { CarbonNotificationService } from '~/app/shared/services/carbon-notification.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { CdNotification } from '~/app/shared/models/cd-notification';
import { Subscription } from 'rxjs';
import NotificationIcon from '@carbon/icons/es/notification/20';
import CloseIcon from '@carbon/icons/es/close/20';
import TrashCanIcon from '@carbon/icons/es/trash-can/20';
import CheckmarkIcon from '@carbon/icons/es/checkmark/20';
import WarningIcon from '@carbon/icons/es/warning/20';
import ErrorIcon from '@carbon/icons/es/error/20';

@Component({
  selector: 'cd-carbon-notification-panel',
  templateUrl: './carbon-notification-panel.component.html',
  styleUrls: ['./carbon-notification-panel.component.scss']
})
export class CarbonNotificationPanelComponent implements OnInit, OnDestroy {
  @HostBinding('class.active')
  get isActive() {
    return this.isOpen;
  }

  isOpen = false;
  doNotDisturb = false;
  notifications: CdNotification[] = [];
  private subs = new Subscription();

  constructor(
    private carbonNotificationService: CarbonNotificationService,
    private notificationService: NotificationService,
    protected iconService: IconService
  ) {
    // Register Carbon icons
    iconService.register(NotificationIcon);
    iconService.register(CloseIcon);
    iconService.register(TrashCanIcon);
    iconService.register(CheckmarkIcon);
    iconService.register(WarningIcon);
    iconService.register(ErrorIcon);
  }

  ngOnInit() {
    // Reset state on init
    this.carbonNotificationService.closeCarbonSidebar();
    
    this.subs.add(
      this.carbonNotificationService.isOpen$.subscribe(
        (isOpen) => {
          this.isOpen = isOpen;
        }
      )
    );

    this.subs.add(
      this.carbonNotificationService.doNotDisturb$.subscribe(
        (doNotDisturb) => (this.doNotDisturb = doNotDisturb)
      )
    );

    // Subscribe to notifications
    this.subs.add(
      this.notificationService.data$.subscribe(
        (notifications) => {
          this.notifications = notifications;
        }
      )
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  close() {
    this.carbonNotificationService.closeCarbonSidebar();
  }

  toggleDoNotDisturb() {
    this.carbonNotificationService.toggleDoNotDisturb();
  }

  dismissAll() {
    this.notificationService.removeAll();
  }

  dismiss(index: number) {
    this.notificationService.remove(index);
  }

  getNotificationIcon(type: number): string {
    switch (type) {
      case 0: // Error
        return 'error';
      case 1: // Info
        return 'notification';
      case 2: // Success
        return 'checkmark';
      default:
        return 'notification';
    }
  }
} 