import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService, ActiveToast } from '../../services/notification.service';

@Component({
  selector: 'cd-toast',
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.scss']
})
export class CarbonToastComponent implements OnInit, OnDestroy {
  activeToasts: ActiveToast[] = [];
  private subscription: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription = this.notificationService.activeToasts$.subscribe(
      (toasts: ActiveToast[]) => {
        this.activeToasts = toasts;
      }
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onToastClose(toastId: string) {
    this.notificationService.removeToast(toastId);
  }
} 