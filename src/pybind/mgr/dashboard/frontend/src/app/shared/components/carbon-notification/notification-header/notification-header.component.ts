import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'cd-notification-header',
  template: `
    <div class="notification-header cds--g10">
      <div class="notification-content">
        <div class="notification-title">
          <cds-header>Tasks & Notifications</cds-header>
        </div>
        <div class="notification-controls">
          <div class="controls-group">
            <cds-toggle
              [hideLabel]="true"
              [label]="'Mute Notifications'"
              [checked]="doNotDisturb"
              (checkedChange)="doNotDisturbChange.emit($event)">
            </cds-toggle>
            <button 
              cdsButton="ghost"
              size="sm" 
              class="clear-btn"
              *ngIf="hasNotifications"
              (click)="clearAll.emit()">
              Dismiss all
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./notification-header.component.scss']
})
export class NotificationHeaderComponent {
  @Input() unreadCount = 0;
  @Input() doNotDisturb = false;
  @Input() hasNotifications = false;
  @Output() doNotDisturbChange = new EventEmitter<boolean>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
} 