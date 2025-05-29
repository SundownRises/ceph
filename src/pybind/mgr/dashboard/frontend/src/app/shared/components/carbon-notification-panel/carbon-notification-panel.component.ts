import { Component, HostBinding, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { IconService } from 'carbon-components-angular';
import { CarbonNotificationService } from '~/app/shared/services/carbon-notification.service';
import { NotificationService } from '~/app/shared/services/notification.service';
import { CdNotification } from '~/app/shared/models/cd-notification';
import { Subscription } from 'rxjs';
import { Mutex } from 'async-mutex';
import moment from 'moment';
import { filter } from 'lodash';
import NotificationIcon from '@carbon/icons/es/notification/20';
import CloseIcon from '@carbon/icons/es/close/20';
import TrashCanIcon from '@carbon/icons/es/trash-can/20';
import CheckmarkIcon from '@carbon/icons/es/checkmark/20';
import WarningIcon from '@carbon/icons/es/warning/20';
import ErrorIcon from '@carbon/icons/es/error/20';
import { ExecutingTask } from '~/app/shared/models/executing-task';
import { FinishedTask } from '~/app/shared/models/finished-task';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { PrometheusAlertService } from '~/app/shared/services/prometheus-alert.service';
import { PrometheusService } from '~/app/shared/api/prometheus.service';
import { PrometheusNotificationService } from '~/app/shared/services/prometheus-notification.service';
import { SummaryService } from '~/app/shared/services/summary.service';
import { TaskMessageService } from '~/app/shared/services/task-message.service';
import { NotificationType } from '~/app/shared/enum/notification-type.enum';
import { AlertmanagerSilence, AlertmanagerSilenceMatcher } from '~/app/shared/models/alertmanager-silence';
import { SucceededActionLabelsI18n } from '~/app/shared/constants/app.constants';
import { HttpResponse } from '@angular/common/http';

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
  executingTasks: ExecutingTask[] = [];
  private interval: number;
  mutex = new Mutex();
  last_task = '';

  constructor(
    private carbonNotificationService: CarbonNotificationService,
    private notificationService: NotificationService,
    protected iconService: IconService,
    private summaryService: SummaryService,
    private taskMessageService: TaskMessageService,
    private prometheusNotificationService: PrometheusNotificationService,
    private succeededLabels: SucceededActionLabelsI18n,
    private authStorageService: AuthStorageService,
    private prometheusAlertService: PrometheusAlertService,
    private prometheusService: PrometheusService,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef
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
    this.last_task = window.localStorage.getItem('last_task');
    
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
          this.cdRef.detectChanges();
        }
      )
    );

    // Handle Prometheus alerts
    const permissions = this.authStorageService.getPermissions();
    if (permissions.prometheus.read && permissions.configOpt.read) {
      this.triggerPrometheusAlerts();
      this.ngZone.runOutsideAngular(() => {
        this.interval = window.setInterval(() => {
          this.ngZone.run(() => {
            this.triggerPrometheusAlerts();
          });
        }, 5000);
      });
    }

    // Handle tasks
    this.subs.add(
      this.summaryService.subscribe((summary) => {
        this._handleTasks(summary.executing_tasks);

        this.mutex.acquire().then((release) => {
          filter(
            summary.finished_tasks,
            (task: FinishedTask) => !this.last_task || moment(task.end_time).isAfter(this.last_task)
          ).forEach((task) => {
            const config = this.carbonNotificationService.finishedTaskToNotification(task, task.success);
            const notification = new CdNotification(config);
            notification.timestamp = task.end_time;
            notification.duration = task.duration;

            if (!this.last_task || moment(task.end_time).isAfter(this.last_task)) {
              this.last_task = task.end_time;
              window.localStorage.setItem('last_task', this.last_task);
            }

            this.carbonNotificationService.save(notification);
          });

          this.cdRef.detectChanges();
          release();
        });
      })
    );
  }

  ngOnDestroy() {
    window.clearInterval(this.interval);
    this.subs.unsubscribe();
  }

  private _handleTasks(executingTasks: ExecutingTask[]) {
    for (const executingTask of executingTasks) {
      executingTask.description = this.taskMessageService.getRunningTitle(executingTask);
    }
    this.executingTasks = executingTasks;
  }

  private triggerPrometheusAlerts() {
    this.prometheusAlertService.refresh(true);
    this.prometheusNotificationService.refresh();
  }

  close() {
    this.carbonNotificationService.closeCarbonSidebar();
  }

  toggleDoNotDisturb() {
    this.carbonNotificationService.toggleDoNotDisturb();
  }

  dismissAll() {
    this.carbonNotificationService.removeAll();
  }

  dismiss(index: number) {
    this.carbonNotificationService.remove(index);
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

  silence(data: CdNotification) {
    const datetimeFormat = 'YYYY-MM-DD HH:mm';
    const resource = $localize`silence`;
    const matcher: AlertmanagerSilenceMatcher = {
      name: 'alertname',
      value: data['title'].split(' ')[0],
      isRegex: false
    };
    const silencePayload: AlertmanagerSilence = {
      matchers: [matcher],
      startsAt: moment(moment().format(datetimeFormat)).toISOString(),
      endsAt: moment(moment().add(2, 'hours').format(datetimeFormat)).toISOString(),
      createdBy: this.authStorageService.getUsername(),
      comment: 'Silence created from the alert notification'
    };
    let msg = '';

    data.alertSilenced = true;
    msg = msg.concat(` ${matcher.name} - ${matcher.value},`);
    const title = `${this.succeededLabels.CREATED} ${resource} for ${msg.slice(0, -1)}`;
    this.prometheusService.setSilence(silencePayload).subscribe((resp: HttpResponse<any>) => {
      if (data) {
        data.silenceId = resp.body?.silenceId;
      }
      this.notificationService.show(
        NotificationType.success,
        title,
        undefined,
        undefined,
        'Prometheus'
      );
    });
  }

  expire(data: CdNotification) {
    data.alertSilenced = false;
    this.prometheusService.expireSilence(data.silenceId).subscribe(
      () => {
        this.notificationService.show(
          NotificationType.success,
          `${this.succeededLabels.EXPIRED} ${data.silenceId}`,
          undefined,
          undefined,
          'Prometheus'
        );
      },
      (error: any) => {
        error.application = 'Prometheus';
      }
    );
  }
} 