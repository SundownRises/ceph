import { Component, HostBinding, OnInit } from '@angular/core';
import { IconService } from 'carbon-components-angular';
import { CarbonNotificationService } from '~/app/shared/services/carbon-notification.service';
import NotificationIcon from '@carbon/icons/es/notification/20';
import CloseIcon from '@carbon/icons/es/close/20';
import TrashCanIcon from '@carbon/icons/es/trash-can/20';

@Component({
  selector: 'cd-carbon-notification-panel',
  templateUrl: './carbon-notification-panel.component.html',
  styleUrls: ['./carbon-notification-panel.component.scss']
})
export class CarbonNotificationPanelComponent implements OnInit {
  @HostBinding('class.active')
  get isActive() {
    return this.isOpen;
  }

  isOpen = false;
  doNotDisturb = false;

  constructor(
    private carbonNotificationService: CarbonNotificationService,
    protected iconService: IconService
  ) {
    // Register Carbon icons
    iconService.register(NotificationIcon);
    iconService.register(CloseIcon);
    iconService.register(TrashCanIcon);
  }

  ngOnInit() {
    // Reset state on init
    this.carbonNotificationService.closeCarbonSidebar();
    
    this.carbonNotificationService.isOpen$.subscribe(
      (isOpen) => {
        this.isOpen = isOpen;
      }
    );
    this.carbonNotificationService.doNotDisturb$.subscribe(
      (doNotDisturb) => (this.doNotDisturb = doNotDisturb)
    );
  }

  close() {
    this.carbonNotificationService.closeCarbonSidebar();
  }

  toggleDoNotDisturb() {
    this.carbonNotificationService.toggleDoNotDisturb();
  }

  dismissAll() {
    // TODO: Implement dismiss all notifications
  }
} 